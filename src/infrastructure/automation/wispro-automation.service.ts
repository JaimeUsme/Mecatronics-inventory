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
      const proxy = this.getProxyOptions();
      if (proxy) {
        this.logger.log(`Using proxy for Wispro login: ${proxy.server}`);
      }
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
        proxy: proxy || undefined,
      });
      const context: BrowserContext = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      // 2️⃣ Open a new page
      const page: Page = await context.newPage();
      await page.setViewportSize({ width: 1280, height: 720 });

      // 3️⃣ Navigate to login page
      await page.goto(this.WISPRO_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      this.logger.debug(`Navigated to ${this.WISPRO_LOGIN_URL}`);

      // 3️⃣.1 Verificar que el formulario de login esté disponible
      await this.ensureLoginForm(page);

      // 4️⃣ Fill email and password fields
      await page.fill('#user_email', credentials.email);
      await page.fill('#user_password', credentials.password);
      this.logger.debug('Credentials filled');

      // 5️⃣ Click submit button
      await page.click('input[type="submit"]');
      this.logger.debug('Submit button clicked');

      // 6️⃣ Wait for navigation to complete (con timeout)
      try {
        // Esperar por un cambio de URL significativo (que no sea /sign_in)
        await Promise.race([
          page.waitForURL((url) => !url.toString().includes('/sign_in'), { timeout: 10000 }),
          page.waitForTimeout(10000), // Timeout alternativo
        ]);
        this.logger.debug('Navigation detected after submit');
      } catch (error) {
        this.logger.warn('Timeout esperando navegación después de submit, continuando con validación');
      }
      
      // Esperar un poco más para que la cookie se establezca
      await page.waitForTimeout(1000);

      // 7️⃣ Extract cookies from context
      const playwrightCookies: PlaywrightCookie[] = await context.cookies();
      this.logger.debug(`Extracted ${playwrightCookies.length} cookies`);

      // 8️⃣ Map Playwright cookies to our Cookie type
      const cookies: Cookie[] = playwrightCookies.map((c) => this.mapPlaywrightCookieToCookie(c));

      // 9️⃣ Find _wispro_session_v2 cookie specifically
      let sessionCookie = cookies.find((c) => c.name === '_wispro_session_v2') || null;

      // 1️⃣0️⃣ Validate login success SOLO si NO hay cookie de sesión
      // 🔴 IMPORTANTE: Ya hemos visto casos donde la URL sigue siendo /sign_in
      // pero la cookie de sesión es válida y la API funciona. Por eso, si hay
      // cookie de sesión, consideramos el login exitoso aunque la URL no cambie.
      if (!sessionCookie || !sessionCookie.value) {
        await this.validateLoginSuccess(page); // Esto lanzará una excepción si el login falló
        this.logger.error('No se encontró cookie de sesión después del submit');
        throw new HttpException(
          'Credenciales incorrectas o login fallido. No se pudo obtener la cookie de sesión.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // 1️⃣1️⃣ Navegar a una página interna para asegurar la obtención del CSRF token
      // A veces el CSRF no está en la página de login, pero sí en páginas internas ya autenticadas
      this.logger.debug('Login exitoso, navegando a /employees para obtener CSRF token');
      await page.goto('https://cloud.wispro.co/employees?locale=es', { waitUntil: 'domcontentloaded', timeout: 30000 });
      this.logger.debug(`Current URL after navigating to employees: ${page.url()}`);

      // 1️⃣2️⃣ Re-extraer cookies después de navegar (por si la sesión se actualizó)
      const refreshedCookies = await context.cookies();
      const refreshedMappedCookies = refreshedCookies.map((c) => this.mapPlaywrightCookieToCookie(c));
      const refreshedSessionCookie = refreshedMappedCookies.find((c) => c.name === '_wispro_session_v2') || null;
      
      // Usar la cookie refrescada si existe, sino usar la original
      if (refreshedSessionCookie?.value) {
        sessionCookie = refreshedSessionCookie;
        this.logger.debug('Using refreshed session cookie after navigation');
      }

      // Log temporal para diagnosticar
      this.logger.debug(`Session cookie value length: ${sessionCookie?.value?.length || 0}`);
      this.logger.debug(`Session cookie starts with: ${sessionCookie?.value?.substring(0, 20) || 'N/A'}...`);

      // 1️⃣3️⃣ Extract CSRF token (usar cookies refrescadas)
      let csrfToken = await this.extractCsrfToken(page, refreshedCookies || playwrightCookies);
      
      // Log temporal para diagnosticar
      this.logger.debug(`CSRF token length: ${csrfToken?.length || 0}`);
      this.logger.debug(`CSRF token starts with: ${csrfToken?.substring(0, 20) || 'N/A'}...`);

      // Fallback: si no se encontró CSRF, reintentar
      if (!csrfToken) {
        this.logger.warn('CSRF token no encontrado después de navegar a /employees');
        throw new HttpException(
          'No se pudo obtener el CSRF token después del login. La sesión puede ser inválida.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // 1️⃣4️⃣ Construir resultado final con cookies y credenciales
      const result: WisproAuthResult = {
        cookies: refreshedMappedCookies || cookies,
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

  /**
   * Verifica que el formulario de login esté disponible.
   * Si no está, captura información para ayudar a diagnosticar bloqueos (WAF/Captcha).
   */
  private async ensureLoginForm(page: Page): Promise<void> {
    try {
      await Promise.all([
        page.waitForSelector('#user_email', { timeout: 10000 }),
        page.waitForSelector('#user_password', { timeout: 10000 }),
      ]);
    } catch (error) {
      const url = page.url();
      const title = await page.title().catch(() => 'unknown');
      const bodyText = (await page.textContent('body').catch(() => null)) || '';
      const snippet = bodyText.replace(/\s+/g, ' ').slice(0, 300);

      const lower = bodyText.toLowerCase();
      const possibleBlock =
        lower.includes('cloudflare') ||
        lower.includes('just a moment') ||
        lower.includes('access denied') ||
        lower.includes('captcha') ||
        lower.includes('verifying') ||
        lower.includes('checking your browser');

      this.logger.warn(
        `Login form not found. url=${url} title=${title} possibleBlock=${possibleBlock} snippet="${snippet}"`,
      );

      const message = possibleBlock
        ? `El login de Wispro fue bloqueado (WAF/Captcha). url=${url} title=${title}`
        : `No se encontró el formulario de login de Wispro. url=${url} title=${title}`;

      throw new HttpException(message, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * Obtiene configuración de proxy desde variables de entorno.
   * WISPRO_PROXY puede ser: http://user:pass@host:port
   */
  private getProxyOptions(): { server: string; username?: string; password?: string } | null {
    const raw = process.env.WISPRO_PROXY;
    if (!raw) {
      return null;
    }
    try {
      const url = new URL(raw);
      const server = `${url.protocol}//${url.host}`;
      const username = url.username || undefined;
      const password = url.password || undefined;
      return { server, username, password };
    } catch (error) {
      this.logger.warn('WISPRO_PROXY inválido. Debe ser un URL válido.');
      return null;
    }
  }
}

