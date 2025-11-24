import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../../../Services/Report/report.service';
import { UserReportResponse } from '../../../../Interfaces/report/UserReportResponse.interface';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  reports: UserReportResponse[] = [];
  filteredReports: UserReportResponse[] = [];
  selectedReport: UserReportResponse | null = null;
  filterType: string = '';
  filterDate: string = '';
  sortDirection: 'asc' | 'desc' = 'desc';
  loading: boolean = false;
  error: string = '';

  readonly typeOptions = [
    { value: '', label: 'Tất cả loại' },
    { value: 'System', label: 'System' },
    { value: 'Article', label: 'Article' },
    { value: 'Exam', label: 'Exam' }
  ];

  constructor(private reportService: ReportService) {}

  ngOnInit(): void {
    this.fetchReports();
  }

  fetchReports(): void {
    this.loading = true;
    this.error = '';
    this.reportService.getMyReports().subscribe({
      next: (data) => {
        this.reports = data;
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Không thể tải danh sách report.';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    // Use local date string (yyyy-mm-dd) to avoid timezone shifts and
    // match types using startsWith to support values like 'Exam - 123'.
    this.filteredReports = this.reports.filter((r) => {
      const typeMatch = this.filterType
        ? !!(r.type && (r.type === this.filterType || r.type.startsWith(this.filterType) || r.type.includes(this.filterType)))
        : true;

      let dateMatch = true;
      if (this.filterDate) {
        try {
          const d = new Date(r.sendAt);
          // toLocaleDateString with en-CA returns YYYY-MM-DD
          const localYMD = d.toLocaleDateString('en-CA');
          dateMatch = localYMD === this.filterDate;
        } catch {
          dateMatch = false;
        }
      }

      return typeMatch && dateMatch;
    });
    // sort by sendAt according to sortDirection
    this.filteredReports.sort((a, b) => {
      const ta = a.sendAt ? new Date(a.sendAt).getTime() : 0;
      const tb = b.sendAt ? new Date(b.sendAt).getTime() : 0;
      return this.sortDirection === 'asc' ? ta - tb : tb - ta;
    });

    console.log('[Reports] applyFilter', { filterType: this.filterType, filterDate: this.filterDate, sortDirection: this.sortDirection, results: this.filteredReports.length });
    // Nếu đang chọn report mà nó bị lọc mất thì bỏ chọn
    if (this.selectedReport && !this.filteredReports.some(r => r.reportId === this.selectedReport?.reportId)) {
      this.selectedReport = null;
    }
  }

  onSelectReport(report: UserReportResponse, event?: MouseEvent): void {
    // Ignore clicks that originate from interactive controls inside the list item
    if (event && event.target) {
      const target = event.target as HTMLElement;
      if (target.closest && target.closest('button, a, input, select, textarea')) {
        return;
      }
    }
    this.selectedReport = report;
  }

  onFilterTypeChange(type: string): void {
    this.filterType = type;
    this.applyFilter();
  }

  onFilterDateChange(date: string): void {
    this.filterDate = date;
    this.applyFilter();
  }

  onSortChange(direction: 'asc' | 'desc') {
    this.sortDirection = direction;
    this.applyFilter();
  }

  clearFilters(): void {
    this.filterType = '';
    this.filterDate = '';
    this.applyFilter();
  }

  // Close/hide the detail panel
  closeDetail(): void {
    this.selectedReport = null;
  }
}
