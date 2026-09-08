import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { QuotaService } from '../Services/Quota/quota.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
class QuotaGuardService {
  constructor(private quotaService: QuotaService, private router: Router) {}

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    // Tạm thời cho phép truy cập toàn bộ không giới hạn
    return true;
  }

  private showUpgradeNotification(skill: string): void {
    // This will be replaced with actual modal component
    const message =
      `Nâng cấp lên Premium để truy cập ${skill.toUpperCase()}!\n\n` +
      '✓ Unlimited bài thi 4 kĩ năng\n' +
      '✓ AI Scoring Speaking/Writing\n' +
      '✓ AI Generate từ vựng';

    // Temporary alert - replace with modal
    alert(message);
  }

  private showQuotaExhaustedNotification(remaining: number): void {
    const message =
      `Bạn đã hết lượt làm bài miễn phí tháng này!\n\n` +
      `Còn lại: ${remaining} lượt\n\n` +
      'Nâng cấp lên Premium để không giới hạn!';

    // Temporary alert - replace with modal
    alert(message);
  }
}

export const QuotaGuard: CanActivateFn = (route, state) => {
  return inject(QuotaGuardService).canActivate(route);
};
