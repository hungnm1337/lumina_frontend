import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Get token from localStorage - using 'lumina_token' key
  const token = localStorage.getItem('lumina_token');

  // Clone request and add Authorization header if token exists
  if (token) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('🔐 Auth Interceptor: Added token to request', {
      url: req.url,
      hasToken: !!token,
    });

    return next(clonedRequest);
  }

  // If no token, proceed with original request
  return next(req);
};
