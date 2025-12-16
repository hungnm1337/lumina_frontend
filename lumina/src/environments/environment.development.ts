// src/environments/environment.prod.ts (hoặc environment.ts)
export const environment = {
  production: true,
  // Sửa lỗi TypeScript bằng cách truy cập thông qua [key]
  apiUrl: process.env['NG_APP_API_URL'] || 'https://default-prod-url.com/api/', 
  googleClientId: '...',
};