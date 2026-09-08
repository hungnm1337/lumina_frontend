import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * LMButton: Component nút bấm chuẩn hóa của Lumina.
 * Tích hợp trạng thái hover, disabled, loading spinner và sự kiện click.
 * Bám sát Mục 2.2 trong Báo cáo đề xuất tái cấu trúc dự án.
 */
@Component({
  selector: 'lm-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lm-button.component.html',
  styleUrls: ['./lm-button.component.scss']
})
export class LMButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() loading = false;
  @Input() disabled = false;
  @Input() icon?: string;
  @Input() iconPosition: 'left' | 'right' = 'left';
  @Input() customClass = '';

  @Output() onClick = new EventEmitter<MouseEvent>();

  handleClick(event: MouseEvent): void {
    if (!this.disabled && !this.loading) {
      this.onClick.emit(event);
    }
  }

  get buttonClasses(): string {
    const classes = ['lm-btn', `lm-btn--${this.variant}`, `lm-btn--${this.size}`];
    if (this.loading) classes.push('lm-btn--loading');
    if (this.disabled) classes.push('lm-btn--disabled');
    if (this.customClass) classes.push(this.customClass);
    return classes.join(' ');
  }
}
