import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface GridColumn {
  key: string;
  title: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  badgeClass?: (value: any) => string;
}

export interface GridSortEvent {
  key: string;
  isAscending: boolean;
}

/**
 * LMGridView: Bảng hiển thị dữ liệu chuẩn hóa của Lumina.
 * Tích hợp sẵn phân trang, tìm kiếm keyword và sắp xếp đa cột.
 * Bám sát Mục 2.2 trong Báo cáo đề xuất tái cấu trúc dự án.
 */
@Component({
  selector: 'lm-grid-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lm-grid-view.component.html',
  styleUrls: ['./lm-grid-view.component.scss']
})
export class LMGridViewComponent {
  @Input() columns: GridColumn[] = [];
  @Input() data: any[] = [];
  @Input() totalItems = 0;
  @Input() pageNumber = 1;
  @Input() pageSize = 10;
  @Input() pageSizeOptions = [5, 10, 20, 50];
  @Input() loading = false;
  @Input() searchPlaceholder = 'Tìm kiếm dữ liệu...';
  @Input() showSearch = true;
  @Input() emptyText = 'Không tìm thấy dữ liệu phù hợp.';

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() sortChange = new EventEmitter<GridSortEvent>();
  @Output() searchChange = new EventEmitter<string>();

  keyword = '';
  currentSortKey = '';
  isAscending = true;

  get totalPages(): number {
    return this.pageSize > 0 ? Math.ceil(this.totalItems / this.pageSize) : 0;
  }

  get pages(): number[] {
    const total = this.totalPages;
    if (total <= 1) return [1];

    const current = this.pageNumber;
    const result: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);

    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  }

  onSort(col: GridColumn): void {
    if (!col.sortable) return;

    if (this.currentSortKey === col.key) {
      this.isAscending = !this.isAscending;
    } else {
      this.currentSortKey = col.key;
      this.isAscending = true;
    }

    this.sortChange.emit({
      key: this.currentSortKey,
      isAscending: this.isAscending
    });
  }

  onSearch(): void {
    this.searchChange.emit(this.keyword.trim());
  }

  onClearSearch(): void {
    this.keyword = '';
    this.searchChange.emit('');
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.pageNumber) {
      this.pageChange.emit(page);
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSizeChange.emit(newSize);
  }
}
