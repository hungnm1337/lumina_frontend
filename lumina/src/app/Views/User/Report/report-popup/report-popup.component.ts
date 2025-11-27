import { Component, Input, Output, EventEmitter, HostListener, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserReportRequest } from '../../../../Interfaces/report/UserReportRequest.interface';
import { AuthService } from '../../../../Services/Auth/auth.service';
import { ReportService } from '../../../../Services/Report/report.service';
import { ToastService } from '../../../../Services/Toast/toast.service';
@Component({
  selector: 'app-report-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-popup.component.html',
  styleUrls: ['./report-popup.component.scss']
})
export class ReportPopupComponent implements AfterViewInit {
  // Visibility controlled by parent via *ngIf; remove internal isDisplay flag
  @Output() close = new EventEmitter<void>();
  @Input() type: string = '';
  @ViewChild('modalContainer') modalContainer?: ElementRef<HTMLDivElement>;

  isClosing = false;
  isSubmitting = false;

  constructor(private authService: AuthService, private reportService: ReportService, private toastService: ToastService) {}

  form: Partial<UserReportRequest> = {
    sendBy: 0,
    title: '',
    content: '',
    type: ''
  };

  ngOnInit() {
    this.form.sendBy = this.authService.getCurrentUserId();
    this.form.type = this.type;
  }

  ngAfterViewInit(): void {
    // autofocus the first input (title)
    try {
      const container = this.modalContainer;
      if (container && container.nativeElement) {
        const el = container.nativeElement.querySelector('input[name="title"]') as HTMLElement | null;
        if (el) setTimeout(() => el.focus(), 0);
      }
    } catch (e) {
      // ignore
    }
  }

  onKeyDown(event: KeyboardEvent) {
    // basic focus trap inside modal
    if (!this.modalContainer) return;
    if (event.key !== 'Tab') return;

    const container = this.modalContainer.nativeElement as HTMLElement;
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement;

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    }
  }

  submitReport() {
    if (this.isSubmitting) return;
    if (!this.form.title || !this.form.content) {
      this.toastService.warning('Vui lòng điền đầy đủ tiêu đề và nội dung báo cáo.');
      return;
    }

    this.isSubmitting = true;
    const payload = this.form as UserReportRequest;

    this.reportService.createReport(payload).subscribe({
      next: () => {
        this.toastService.success('Gửi báo cáo thành công');
        // play closing animation then emit close
        this.startClose();
      },
      error: (err) => {
        console.error('Failed to submit report', err);
        this.toastService.error('Gửi báo cáo thất bại. Vui lòng thử lại.');
        this.isSubmitting = false;
      },
    });
  }
  startClose() {
    if (this.isClosing) return;
    this.isClosing = true;
    // allow CSS animation to play (match duration in scss)
    setTimeout(() => {
      console.log('[ReportPopup] emitting close after animation');
      this.close.emit();
    }, 200);
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(_: any) {
    console.log('[ReportPopup] Escape pressed, starting close');
    this.startClose();
  }
}
