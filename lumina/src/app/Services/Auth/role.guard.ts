import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: any): boolean {
    const requiredRoles: number[] = route.data?.roles || [];
    const roleId = this.authService.getRoleId();
    
    // Nếu chưa đăng nhập (guest) - cho phép truy cập
    if (!roleId) {
      return true;
    }
    
    // Nếu đã đăng nhập - kiểm tra role
    if (requiredRoles.length === 0 || requiredRoles.includes(roleId)) {
      return true;
    }
    
    // Nếu role không hợp lệ - chuyển về trang phù hợp với role
    this.authService.navigateByRole();
    return false;
  }
}



