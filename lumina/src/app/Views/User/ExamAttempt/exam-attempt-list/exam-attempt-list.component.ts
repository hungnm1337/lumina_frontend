import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ExamAttemptService } from '../../../../Services/ExamAttempt/exam-attempt.service';
import { ExamAttemptResponseDTO } from '../../../../Interfaces/ExamAttempt/ExamAttemptResponseDTO.interface';
import { AuthService } from '../../../../Services/Auth/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-exam-attempt-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './exam-attempt-list.component.html',
  styleUrl: './exam-attempt-list.component.scss'
})
export class ExamAttemptListComponent implements OnInit {
  examAttempts: ExamAttemptResponseDTO[] = [];
  filteredAttempts: ExamAttemptResponseDTO[] = [];

  // Filter and Sort properties
  searchTerm: string = '';
  filterStatus: string = 'all';
  filterExamType: string = 'all';
  sortBy: string = 'dateDesc';

  // Loading state
  isLoading: boolean = true;

  // Unique exam names and parts for filter
  uniqueExams: string[] = [];
  uniqueParts: string[] = [];

  constructor(
    private examAttemptService: ExamAttemptService,
    private authService: AuthService,
    private router: Router,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.loadExamAttempts();
  }

  private loadExamAttempts(): void {
    this.isLoading = true;
    this.examAttemptService.getUserAttempts(Number(this.authService.getCurrentUser()?.id)).subscribe({
      next: (attempts) => {
        this.examAttempts = attempts;
        this.extractUniqueValues();
        this.applyFilters();
        this.isLoading = false;
        console.log('Exam attempts loaded:', attempts);
      },
      error: (error) => {
        console.error('Error fetching exam attempts:', error);
        this.isLoading = false;
      },
    });
  }

  private extractUniqueValues(): void {
    const examNames = new Set<string>();
    const partNames = new Set<string>();

    this.examAttempts.forEach(attempt => {
      if (attempt.examName) examNames.add(attempt.examName);
      if (attempt.examPartName) partNames.add(attempt.examPartName);
    });

    this.uniqueExams = Array.from(examNames).sort();
    this.uniqueParts = Array.from(partNames).sort();
  }

  applyFilters(): void {
    let filtered = [...this.examAttempts];

    // Apply search filter
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(attempt =>
        attempt.examName?.toLowerCase().includes(search) ||
        attempt.examPartName?.toLowerCase().includes(search) ||
        attempt.userName?.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(attempt => attempt.status === this.filterStatus);
    }

    // Apply sort
    filtered = this.sortAttempts(filtered);

    this.filteredAttempts = filtered;
  }

  private sortAttempts(attempts: ExamAttemptResponseDTO[]): ExamAttemptResponseDTO[] {
    const sorted = [...attempts];

    switch (this.sortBy) {
      case 'dateDesc':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.startTime).getTime();
          const dateB = new Date(b.startTime).getTime();
          return dateB - dateA;
        });
      case 'dateAsc':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.startTime).getTime();
          const dateB = new Date(b.startTime).getTime();
          return dateA - dateB;
        });
      case 'scoreDesc':
        return sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
      case 'scoreAsc':
        return sorted.sort((a, b) => (a.score || 0) - (b.score || 0));
      case 'examName':
        return sorted.sort((a, b) => a.examName.localeCompare(b.examName));
      default:
        return sorted;
    }
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') || 'N/A';
  }

  formatDuration(startTime: any, endTime: any): string {
    if (!startTime || !endTime) return 'N/A';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diff = Math.floor((end.getTime() - start.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}m ${seconds}s`;
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'hoàn thành':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
      case 'đang làm':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      case 'chờ':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  viewDetail(attemptId: number): void {
    this.router.navigate(['/homepage/user-dashboard/exam-attempts', attemptId]);
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterStatus = 'all';
    this.sortBy = 'dateDesc';
    this.applyFilters();
  }

  getTotalAttempts(): number {
    return this.examAttempts.length;
  }

  getFilteredCount(): number {
    return this.filteredAttempts.length;
  }

  getAverageScore(): number {
    const scores = this.filteredAttempts
      .map(a => a.score)
      .filter(s => s !== null && s !== undefined);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => (a || 0) + (b || 0), 0) / scores.length);
  }
}
