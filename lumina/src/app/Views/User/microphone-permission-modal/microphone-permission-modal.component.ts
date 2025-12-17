import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-microphone-permission-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './microphone-permission-modal.component.html',
  styleUrls: ['./microphone-permission-modal.component.scss']
})
export class MicrophonePermissionModalComponent {
  @Input() visible: boolean = false;
  @Input() examType: string = 'Speaking';
  @Output() onRetry = new EventEmitter<void>();
  @Output() onExit = new EventEmitter<void>();

  detectBrowser(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'Chrome';
    if (userAgent.includes('firefox')) return 'Firefox';
    if (userAgent.includes('edg')) return 'Edge';
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'Safari';
    return 'Chrome'; // Default
  }

  getBrowserInstructions(): string[] {
    const browser = this.detectBrowser();
    
    switch(browser) {
      case 'Chrome':
        return [
          'Nhấp vào biểu tượng khóa hoặc thông tin bên trái thanh địa chỉ',
          'Tìm mục "Microphone" trong danh sách quyền',
          'Chọn "Allow" hoặc "Cho phép"',
          'Tải lại trang và thử lại'
        ];
      case 'Firefox':
        return [
          'Nhấp vào biểu tượng khóa bên trái thanh địa chỉ',
          'Chọn "Connection secure" > "More Information"',
          'Vào tab "Permissions"',
          'Tìm "Use the Microphone" và bỏ chọn "Use Default"',
          'Chọn "Allow"',
          'Tải lại trang và thử lại'
        ];
      case 'Edge':
        return [
          'Nhấp vào biểu tượng khóa bên trái thanh địa chỉ',
          'Chọn "Permissions for this site"',
          'Tìm "Microphone" và chọn "Allow"',
          'Tải lại trang và thử lại'
        ];
      case 'Safari':
        return [
          'Vào Safari > Preferences > Websites',
          'Chọn "Microphone" trong thanh bên trái',
          'Tìm trang web này và chọn "Allow"',
          'Tải lại trang và thử lại'
        ];
      default:
        return [
          'Nhấp vào biểu tượng bên trái thanh địa chỉ',
          'Tìm và bật quyền truy cập Microphone',
          'Tải lại trang và thử lại'
        ];
    }
  }

  handleRetry(): void {
    this.onRetry.emit();
  }

  handleExit(): void {
    this.onExit.emit();
  }
}
