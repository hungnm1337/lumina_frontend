import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamService } from '../../../Services/Exam/exam.service';
import { PartDetailComponent } from "../part-detail/part-detail.component";
import { QuestionComponent } from "../question/question.component";
import { WritingComponent } from "../question/writing/writing.component";
import { ExamPartDTO, QuestionDTO } from '../../../Interfaces/exam.interfaces';

@Component({
  selector: 'app-part-question',
  standalone: true,
  imports: [PartDetailComponent, QuestionComponent, WritingComponent],
  templateUrl: './part-question.component.html',
  styleUrl: './part-question.component.scss'
})
export class PartQuestionComponent {
  partId: number | null = null;
  partDetail: ExamPartDTO | null = null;
  partInfo: ExamPartDTO | null = null;
  questions: QuestionDTO[] = [];
  isLoading = true;
  examType: string = '';
  isWritingExam = false;

  constructor(private route: ActivatedRoute, private examService: ExamService, private router: Router) {
      this.partId = Number(this.route.snapshot.paramMap.get('id'));
      this.loadPartDetail();
  }
  private loadPartDetail(): void {
    if (this.partId) {
      this.examService.GetExamPartDetailAndQuestion(this.partId).subscribe({
        next: (data) => {
          this.partDetail = data;
          console.log('Part detail loaded:', this.partDetail);
          console.log('Questions count:', this.partDetail.questions?.length || 0);
          console.log('Questions data:', this.partDetail.questions);

          // Load exam detail to get exam type
          this.loadExamType();

          this.partInfo ={
            partId: this.partDetail.partId,
            examId: this.partDetail.examId,
            partCode: this.partDetail.partCode,
            title: this.partDetail.title,
            orderIndex: this.partDetail.orderIndex,
            questions: []
          };
          this.questions = this.partDetail.questions || [];
          this.isLoading = false;

          console.log('Final questions array:', this.questions);
        },
        error: (error) => {
          console.error('Error loading part detail:', error);
          this.isLoading = false;
        }
      });
    }
  }

  private loadExamType(): void {
    if (this.partDetail?.examId) {
      this.examService.GetExamDetailAndPart(this.partDetail.examId).subscribe({
        next: (examData) => {
          this.examType = examData.examType || '';
          this.isWritingExam = this.examType.toUpperCase().includes('WRITTING');
          console.log('Exam type:', this.examType);
          console.log('Is writing exam:', this.isWritingExam);
        },
        error: (error) => {
          console.error('Error loading exam type:', error);
        }
      });
    }
  }

  onWritingAnswered(isCorrect: boolean): void {
    console.log('Writing answer submitted:', isCorrect);
    // Handle writing answer submission if needed
  }
}
