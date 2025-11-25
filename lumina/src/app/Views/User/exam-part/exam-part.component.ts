import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ExamService } from '../../../Services/Exam/exam.service';
import { ExamDTO } from '../../../Interfaces/exam.interfaces';
import { ExamAttemptRequestDTO } from '../../../Interfaces/ExamAttempt/ExamAttemptRequestDTO.interface';
import { AuthService } from '../../../Services/Auth/auth.service';
import { ExamAttemptService } from '../../../Services/ExamAttempt/exam-attempt.service';

@Component({
  selector: 'app-exam-part',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exam-part.component.html',
  styleUrls: ['./exam-part.component.scss'],
})
export class ExamPartComponent {
  examattemptRequestDTO: ExamAttemptRequestDTO | null = null;
  examDetail: ExamDTO | null = null;
  examId: number | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private examService: ExamService,
    private router: Router,
    private authService: AuthService,
    private examAttemptService: ExamAttemptService
  ) {
    this.examId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadExamDetail();
  }

  private loadExamDetail(): void {
    if (!this.examId) return;

    this.isLoading = true;

    // Check if user is logged in
    const token = localStorage.getItem('lumina_token');
    const isAuthenticated = !!token;

    if (isAuthenticated) {
      // Load exam detail with completion status
      forkJoin({
        examDetail: this.examService.GetExamDetailAndPart(this.examId),
        partStatuses: this.examService
          .getPartCompletionStatus(this.examId)
          .pipe(
            catchError((error) => {
              console.warn(
                '⚠️ Could not load part completion statuses:',
                error
              );
              return of([]);
            })
          ),
      }).subscribe({
        next: ({ examDetail, partStatuses }) => {
          // Merge completion status into parts
          if (examDetail.examParts) {
            examDetail.examParts = examDetail.examParts.map((part) => ({
              ...part,
              completionStatus: partStatuses.find(
                (s) => s.partId === part.partId
              ),
            }));
          }

          this.examDetail = examDetail;
          console.log(
            '✅ Exam detail loaded with completion:',
            this.examDetail
          );
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Error loading exam detail:', error);
          this.isLoading = false;
        },
      });
    } else {
      // Load exam detail without completion status for guests
      this.examService.GetExamDetailAndPart(this.examId).subscribe({
        next: (data) => {
          this.examDetail = data;
          console.log('✅ Exam detail loaded (guest mode):', this.examDetail);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Error loading exam detail:', error);
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
    const type = examType?.toUpperCase() || '';
    if (type.includes('LISTENING')) return 'blue';
    if (type.includes('READING')) return 'green';
    if (type.includes('SPEAKING')) return 'purple';
    if (type.includes('WRIT')) return 'orange'; // ✅ Match cả WRITTING và WRITING
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
    //kiểm tra currentExamAttempt trong localstorage nếu có thì xóa đi để bắt đầu attempt mới
    localStorage.removeItem('currentExamAttempt');
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      console.error('No user ID found');
      return;
    }

    if (!this.examId) {
      console.error('No exam ID found');
      return;
    }

    this.examattemptRequestDTO = {
      attemptID: 0,
      userID: Number(currentUser.id),
      examID: this.examId,
      examPartId: partId,
      startTime: new Date().toISOString(),
      endTime: null,
      score: null,
      status: 'Doing',
    };

    this.examAttemptService.startExam(this.examattemptRequestDTO).subscribe({
      next: (response) => {
        // Lưu thông tin attempt vào localStorage
        localStorage.setItem('currentExamAttempt', JSON.stringify(response));
        console.log('Exam attempt started successfully:', response);
      },
      error: (error) => {
        console.error('Error starting exam attempt:', error);
      },
    });

    this.router.navigate(['/homepage/user-dashboard/part', partId]);
  }

  goBack(): void {
    this.router.navigate(['/homepage/user-dashboard/exams']);
  }
}
