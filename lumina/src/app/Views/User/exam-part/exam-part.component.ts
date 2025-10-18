import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamService } from '../../../Services/Exam/exam.service';
import { ExamDTO } from '../../../Interfaces/exam.interfaces';

@Component({
  selector: 'app-exam-part',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exam-part.component.html',
  styleUrl: './exam-part.component.scss',
})
export class ExamPartComponent {
  examDetail: ExamDTO | null = null;
  examId: number | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private examService: ExamService,
    private router: Router
  ) {
    this.examId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadExamDetail();
  }

  private loadExamDetail(): void {
    if (this.examId) {
      this.examService.GetExamDetailAndPart(this.examId).subscribe({
        next: (data) => {
          this.examDetail = data;
          this.isLoading = false;
          console.log('Exam detail loaded:', this.examDetail);
        },
        error: (error) => {
          console.error('Error loading exam detail:', error);
          this.isLoading = false;
        },
      });
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  getSkillColor(examType: string): string {
    if (examType?.toUpperCase().includes('LISTENING')) return 'blue';
    if (examType?.toUpperCase().includes('READING')) return 'green';
    if (examType?.toUpperCase().includes('SPEAKING')) return 'purple';
    if (examType?.toUpperCase().includes('WRITING')) return 'orange';
    return 'gray';
  }

  getSkillGradient(color: string): string {
    switch (color) {
      case 'blue':
        return 'from-blue-500 to-blue-700';
      case 'green':
        return 'from-green-500 to-green-700';
      case 'purple':
        return 'from-purple-500 to-purple-700';
      case 'orange':
        return 'from-orange-500 to-orange-700';
      default:
        return 'from-gray-500 to-gray-700';
    }
  }

  startPart(partId: number): void {
    console.log('Starting part ID:', partId);
    this.router.navigate(['/homepage/user-dashboard/part', partId]);
  }

  goBack(): void {
    this.router.navigate(['/homepage/user-dashboard/exams']);
  }
}
