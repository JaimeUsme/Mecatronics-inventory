/**
 * Wispro Automation Service
 * 
 * Service that uses Playwright to automate the login process
 * and extract authentication cookies and CSRF tokens from Wispro.
 * 
 * This service acts as an adapter in the infrastructure layer,
 * providing automation capabilities that can be used by application
 * use cases or other services.
 */
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { chromium, Browser, BrowserContext, Page, Cookie as PlaywrightCookie } from 'playwright';
import { WisproAuthResult, WisproCredentials, Cookie } from './types';

@Injectable()
export class WisproAutomationService {
  private readonly logger = new Logger(WisproAutomationService.name);
  private readonly WISPRO_LOGIN_URL = 'https://cloud.wispro.co/sign_in?locale=es';

  /**
   * Performs automated login to Wispro and extracts authentication data
   * @param credentials - Email and password for Wispro login
   * @returns Authentication result containing cookies and CSRF token
   */
  async loginAndExtractAuth(credentials: WisproCredentials): Promise<WisproAuthResult> {
    let browser: Browser | null = null;

    try {
      this.logger.log('Starting Wispro automation login process');

      // 1️⃣ Launch headless browser
      browser = await chromium.launch({ headless: true });
      const context: BrowserContext = await browser.newContext();

      // 2️⃣ Open a new page
      const page: Page = await context.newPage();

      // 3️⃣ Navigate to login page
      await page.goto(this.WISPRO_LOGIN_URL);
      this.logger.debug(`Navigated to ${this.WISPRO_LOGIN_URL}`);

      // 4️⃣ Fill email and password fields
      await page.fill('#user_email', credentials.email);
      await page.fill('#user_password', credentials.password);
      this.logger.debug('Credentials filled');

      // 5️⃣ Click submit button
      await page.click('input[type="submit"]');
      this.logger.debug('Submit button clicked');

      // 6️⃣ Wait for navigation to complete (con timeout)
      try {
        await page.waitForNavigation({ timeout: 10000, waitUntil: 'networkidle' });
        this.logger.debug('Navigation completed');
      } catch (error) {
        this.logger.warn('Navigation timeout, verificando estado de la página');
      }

      // 7️⃣ Verificar si el login fue exitoso
      await this.validateLoginSuccess(page);

      // 8️⃣ Extract cookies from context
      const playwrightCookies: PlaywrightCookie[] = await context.cookies();
      this.logger.debug(`Extracted ${playwrightCookies.length} cookies`);

      // 9️⃣ Map Playwright cookies to our Cookie type
      const cookies: Cookie[] = playwrightCookies.map((c) => this.mapPlaywrightCookieToCookie(c));

      // 🔟 Find _wispro_session_v2 cookie specifically
      const sessionCookie = cookies.find((c) => c.name === '_wispro_session_v2') || null;

      // 1️⃣1️⃣ Validate that we have a session cookie (login was successful)
      if (!sessionCookie || !sessionCookie.value) {
        this.logger.error('No se encontró cookie de sesión después del login');
        throw new HttpException(
          'Credenciales incorrectas o login fallido. No se pudo obtener la cookie de sesión.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // 1️⃣2️⃣ Extract CSRF token
      const csrfToken = await this.extractCsrfToken(page, playwrightCookies);

      const result: WisproAuthResult = {
        cookies,
        sessionCookie,
        csrfToken,
      };

      this.logger.log('Authentication data extracted successfully');
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error during Wispro automation', error);
      throw new HttpException(
        'Error durante el proceso de login. Por favor, verifica tus credenciales.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      if (browser) {
        await browser.close();
        this.logger.debug('Browser closed');
      }
    }
  }

  /**
   * Maps a Playwright cookie to our Cookie type
   */
  private mapPlaywrightCookieToCookie(playwrightCookie: PlaywrightCookie): Cookie {
    return {
      name: playwrightCookie.name,
      value: playwrightCookie.value,
      domain: playwrightCookie.domain,
      path: playwrightCookie.path,
      expires: playwrightCookie.expires,
      httpOnly: playwrightCookie.httpOnly,
      secure: playwrightCookie.secure,
      sameSite: playwrightCookie.sameSite as 'Strict' | 'Lax' | 'None' | undefined,
    };
  }

  /**
   * Extracts CSRF token from the page using multiple strategies
   * @param page - Playwright page instance
   * @param cookies - Cookies array to search for CSRF token
   * @returns CSRF token if found, null otherwise
   */
  private async extractCsrfToken(page: Page, cookies: PlaywrightCookie[]): Promise<string | null> {
    // Strategy 1: Try to get from meta tag
    const metaCsrf = await page.$('meta[name="csrf-token"]');
    if (metaCsrf) {
      const token = await metaCsrf.getAttribute('content');
      if (token) {
        this.logger.debug('CSRF token found in meta tag');
        return token;
      }
    }

    // Strategy 2: Try to get from hidden input
    const inputCsrf = await page.$('input[name="authenticity_token"]');
    if (inputCsrf) {
      const token = await inputCsrf.getAttribute('value');
      if (token) {
        this.logger.debug('CSRF token found in hidden input');
        return token;
      }
    }

    // Strategy 3: Search in cookies
    const csrfCookie = cookies.find(
      (c) => c.name.toLowerCase().includes('csrf') || c.name.includes('CSRF'),
    );
    if (csrfCookie) {
      this.logger.debug('CSRF token found in cookies');
      return csrfCookie.value;
    }

    this.logger.warn('CSRF token not found using any strategy');
    return null;
  }

  /**
   * Valida si el login fue exitoso verificando la URL y mensajes de error
   * @param page - Playwright page instance
   */
  private async validateLoginSuccess(page: Page): Promise<void> {
    const currentUrl = page.url();
    this.logger.debug(`Current URL after login: ${currentUrl}`);

    // Si todavía estamos en la página de login, el login falló
    if (currentUrl.includes('/sign_in')) {
      // Buscar mensajes de error en la página
      const errorMessages = await this.checkForErrorMessages(page);
      
      if (errorMessages.length > 0) {
        this.logger.error(`Error de login detectado: ${errorMessages.join(', ')}`);
        throw new HttpException(
          `Credenciales incorrectas: ${errorMessages.join(', ')}`,
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Si no hay mensajes de error visibles pero estamos en sign_in, asumir credenciales incorrectas
      this.logger.error('Login fallido: todavía en página de sign_in');
      throw new HttpException(
        'Credenciales incorrectas. Por favor, verifica tu email y contraseña.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Si llegamos aquí, el login probablemente fue exitoso
    this.logger.debug('Login validado exitosamente');
  }

  /**
   * Busca mensajes de error en la página
   * @param page - Playwright page instance
   * @returns Array de mensajes de error encontrados
   */
  private async checkForErrorMessages(page: Page): Promise<string[]> {
    const errorMessages: string[] = [];

    try {
      // Buscar mensajes de error comunes en Wispro
      const errorSelectors = [
        '.alert-danger',
        '.error',
        '.flash-error',
        '[class*="error"]',
        '[class*="alert"]',
        '.notice',
      ];

      for (const selector of errorSelectors) {
        const elements = await page.$$(selector);
        for (const element of elements) {
          const text = await element.textContent();
          if (text && text.trim().length > 0) {
            const trimmedText = text.trim();
            // Filtrar mensajes que parezcan errores
            if (
              trimmedText.toLowerCase().includes('incorrect') ||
              trimmedText.toLowerCase().includes('inválid') ||
              trimmedText.toLowerCase().includes('error') ||
              trimmedText.toLowerCase().includes('incorrecto')
            ) {
              errorMessages.push(trimmedText);
            }
          }
        }
      }

      // También buscar en el contenido de la página
      const pageContent = await page.textContent('body');
      if (pageContent) {
        const lowerContent = pageContent.toLowerCase();
        if (
          lowerContent.includes('email o contraseña incorrectos') ||
          lowerContent.includes('invalid email or password') ||
          lowerContent.includes('credenciales incorrectas')
        ) {
          errorMessages.push('Credenciales incorrectas');
        }
      }
    } catch (error) {
      this.logger.debug('Error al buscar mensajes de error:', error);
    }

    return errorMessages;
  }
}

