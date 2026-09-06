import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * BaseComponent: Quản lý vòng đời (lifecycle) của component.
 * Tự động hủy các Observable subscriptions qua Subject destroy$ khi component bị hủy (ngOnDestroy),
 * ngăn chặn triệt để hiện tượng rò rỉ bộ nhớ (memory leak).
 * Bám sát Mục 2.3 trong Báo cáo đề xuất tái cấu trúc của Vũ Công Thắng.
 */
@Component({
  template: ''
})
export abstract class BaseComponent implements OnDestroy {
  /**
   * Subject phát tín hiệu khi component bị hủy.
   * Dùng kèm toán tử .pipe(takeUntil(this.destroy$)) cho mọi subscription.
   */
  protected destroy$ = new Subject<void>();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
