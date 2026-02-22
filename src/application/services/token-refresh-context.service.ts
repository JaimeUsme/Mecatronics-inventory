/**
 * Token Refresh Context Service
 *
 * REQUEST-scoped service that tracks JWT token refreshes during the current request.
 * Use-cases set the newJwt when a token refresh occurs, and controllers/interceptors
 * can retrieve it to return in response headers.
 */
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TokenRefreshContextService {
  private newJwt: string | null = null;

  /**
   * Set the new JWT token when a refresh occurs
   */
  setNewJwt(jwt: string): void {
    this.newJwt = jwt;
  }

  /**
   * Get the new JWT token if one was refreshed during this request
   */
  getNewJwt(): string | null {
    return this.newJwt;
  }

  /**
   * Check if a token refresh occurred during this request
   */
  hasNewJwt(): boolean {
    return this.newJwt !== null;
  }
}
