import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: any): boolean {
    const requiredRoles: number[] = route.data?.roles || [];
    const roleId = this.authService.getRoleId();
    if (!roleId) {
      this.router.navigate(['/login']);
      return false;
    }
    if (requiredRoles.length === 0 || requiredRoles.includes(roleId)) {
      return true;
    }
    this.authService.navigateByRole();
    return false;
  }
}



