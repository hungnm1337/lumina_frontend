import { AuthService } from './auth.service';
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, map, take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user) {
          return true; // Cho phép truy cập nếu đã đăng nhập
        } else {
          // Chuyển hướng đến trang login nếu chưa đăng nhập
          this.router.navigate(['/login']);
          return false;
        }
      })
    );
  }
}