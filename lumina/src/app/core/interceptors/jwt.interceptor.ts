import { HttpInterceptorFn } from '@angular/common/http';

/**
 * jwtInterceptor: Tự động đính kèm Authorization: Bearer <token> vào mọi HTTP Request.
 * Xóa bỏ hoàn toàn việc các service riêng lẻ phải tự viết getAuthHeaders() thủ công.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('lumina_token');
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
  }
  return next(req);
};
