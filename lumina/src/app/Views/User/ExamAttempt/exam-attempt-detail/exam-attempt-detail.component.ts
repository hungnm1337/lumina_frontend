import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamAttemptDetailResponseDTO } from '../../../../Interfaces/ExamAttempt/ExamAttemptDetailResponseDTO.interface';
import { ExamAttemptService } from '../../../../Services/ExamAttempt/exam-attempt.service';

@Component({
  selector: 'app-exam-attempt-detail',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './exam-attempt-detail.component.html',
  styleUrl: './exam-attempt-detail.component.scss'
})
export class ExamAttemptDetailComponent implements OnInit {
  @Input() details: ExamAttemptDetailResponseDTO | null = null;
  isLoading: boolean = false;

  constructor(
    private datePipe: DatePipe,
    private route: ActivatedRoute,
    private router: Router,
    private examAttemptService: ExamAttemptService
  ) {}

  ngOnInit(): void {
    // If details are provided via @Input, use them
    if (this.details) {
      return;
    }

    // Otherwise, try to load from route parameter
    this.route.paramMap.subscribe(params => {
      const attemptId = params.get('id');
      if (attemptId) {
        this.loadDetails(Number(attemptId));
      }
    });
  }

  private loadDetails(attemptId: number): void {
    this.isLoading = true;
    this.examAttemptService.getAttemptDetails(attemptId).subscribe({
      next: (details) => {
        this.details = details;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading exam attempt details:', error);
        this.isLoading = false;
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/homepage/user-dashboard/exam-attempts']);
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') || 'N/A';
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index); // Converts 0->A, 1->B, etc.
  }
}
