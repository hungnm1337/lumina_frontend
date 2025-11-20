import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../Services/Auth/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // Skip token check for auth endpoints
  const isAuthEndpoint = req.url.includes('/auth/login') || 
                         req.url.includes('/auth/register') ||
                         req.url.includes('/auth/refresh') ||
                         req.url.includes('/auth/google-login') ||
                         req.url.includes('/auth/forgot-password');
  
  if (isAuthEndpoint) {
    return next(req);
  }

  // Get token from localStorage
  const token = localStorage.getItem('lumina_token');

  // Check if token is expired (but only if we have a token)
  if (token && authService.isTokenExpired()) {
    // Try to refresh the token
    const refreshToken = localStorage.getItem('lumina_refresh_token');
    
    if (refreshToken) {
      console.log('🔄 Token expired, attempting to refresh...');
      
      return authService.refreshToken().pipe(
        switchMap((response) => {
          console.log('✅ Token refreshed successfully');
          
          // Clone request with new token
          const clonedRequest = req.clone({
            setHeaders: {
              Authorization: `Bearer ${response.token}`,
            },
          });
          
          return next(clonedRequest);
        }),
        catchError((error) => {
          console.error('❌ Token refresh failed, logging out...');
          authService.logout();
          return throwError(() => error);
        })
      );
    } else {
      // No refresh token, logout
      console.log('⚠️ No refresh token available, logging out...');
      authService.logout();
      return throwError(() => new Error('Token expired'));
    }
  }

  // Clone request and add Authorization header if token exists
  if (token) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    return next(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // If we get 401, try to refresh token
        if (error.status === 401 && !isAuthEndpoint) {
          const refreshToken = localStorage.getItem('lumina_refresh_token');
          
          if (refreshToken) {
            console.log('🔄 Got 401, attempting to refresh token...');
            
            return authService.refreshToken().pipe(
              switchMap((response) => {
                console.log('✅ Token refreshed after 401');
                
                // Retry the failed request with new token
                const retryRequest = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${response.token}`,
                  },
                });
                
                return next(retryRequest);
              }),
              catchError((refreshError) => {
                console.error('❌ Token refresh failed after 401, logging out...');
                authService.logout();
                return throwError(() => refreshError);
              })
            );
          } else {
            authService.logout();
          }
        }
        
        return throwError(() => error);
      })
    );
  }

  // If no token, proceed with original request
  return next(req);
};
