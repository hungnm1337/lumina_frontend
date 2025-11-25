import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../../Services/Report/report.service';
import { UserReportResponse, } from '../../../Interfaces/report/UserReportResponse.interface';
import { AuthService } from '../../../Services/Auth/auth.service';
import { ToastService } from '../../../Services/Toast/toast.service';

type StatusFilter = 'all' | 'replied' | 'unreplied';


@Component({
  selector: 'app-report-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-list.component.html',
  styleUrl: './report-list.component.scss'
})
export class ReportListComponent implements OnInit {
  reports: UserReportResponse[] = [];
  filteredReports: UserReportResponse[] = [];
  selectedReport?: UserReportResponse;

  // Filters
  statusFilter: StatusFilter = 'all';
  sortDirection: 'newest' | 'oldest' = 'newest';
  dateFrom: string = '';
  dateTo: string = '';

  // Reply
  replyContent: string = '';

  // Role
  canReply: boolean = false;

  loading: boolean = false;

  constructor(
    private reportService: ReportService,
    private authService: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.canReply = (this.authService.getRoleId() || 99) <= 3; // admin/manager/staff
    this.loadReports();
  }

  loadReports(): void {
    this.loading = true;
    this.reportService.getReportsByRole().subscribe({
      next: (data) => {
        this.reports = data || [];
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load reports', err);
        this.toast.error('Không thể tải danh sách báo cáo');
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    const from = this.dateFrom ? new Date(this.dateFrom) : null;
    const to = this.dateTo ? new Date(this.dateTo) : null;

    this.filteredReports = this.reports.filter(r => {
      // status
      if (this.statusFilter === 'replied' && !r.replyAt) return false;
      if (this.statusFilter === 'unreplied' && r.replyAt) return false;

      // date range (compare local dates)
      const send = new Date(r.sendAt);
      if (from) {
        if (send < from) return false;
      }
      if (to) {
        // include end of day
        const toEnd = new Date(to);
        toEnd.setHours(23,59,59,999);
        if (send > toEnd) return false;
      }

      return true;
    });

    this.sortFiltered();
  }

  sortFiltered(): void {
    this.filteredReports.sort((a,b) => {
      const da = new Date(a.sendAt).getTime();
      const db = new Date(b.sendAt).getTime();
      return this.sortDirection === 'newest' ? db - da : da - db;
    });
  }

  selectReport(r: UserReportResponse): void {
    this.selectedReport = r;
    this.replyContent = r.replyContent || '';
    // small timeout to allow CSS animation
    setTimeout(() => {}, 10);
  }

  closeDetail(): void {
    this.selectedReport = undefined;
  }

  submitReply(): void {
    if (!this.selectedReport) return;
    if (!this.replyContent || this.replyContent.trim().length === 0) {
      this.toast.warning('Vui lòng nhập nội dung phản hồi');
      return;
    }

    const req = {
      title: this.selectedReport.title,
      content: this.selectedReport.content,
      sendBy: this.authService.getCurrentUserId(),
      sendAt: new Date(),
      replyBy: this.authService.getCurrentUserId(),
      replyAt: new Date(),
      replyContent: this.replyContent,
      type: this.selectedReport.type
    } as any;

    this.reportService.replyToReport(this.selectedReport.reportId, req).subscribe({
      next: (res) => {
        this.toast.success('Phản hồi đã gửi');
        // update local model
        this.selectedReport = { ...this.selectedReport!, replyAt: new Date(), replyBy: (this.authService.getCurrentUserId() || 0).toString(), replyContent: this.replyContent } as UserReportResponse;
        const idx = this.reports.findIndex(x => x.reportId === this.selectedReport!.reportId);
        if (idx >= 0) this.reports[idx] = this.selectedReport!;
        this.applyFilter();
      },
      error: (err) => {
        console.error('Reply failed', err);
        this.toast.error('Gửi phản hồi thất bại');
      }
    });
  }


}
