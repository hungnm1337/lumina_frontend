import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ExamService } from '../../../Services/Exam/exam.service';
import { PartDetailComponent } from "../part-detail/part-detail.component";
import { QuestionComponent } from "../question/question.component";
import { ExamPartDTO, QuestionDTO } from '../../../Interfaces/exam.interfaces';

@Component({
  selector: 'app-part-question',
  standalone: true,
  imports: [PartDetailComponent, QuestionComponent],
  templateUrl: './part-question.component.html',
  styleUrl: './part-question.component.scss'
})
export class PartQuestionComponent {
  partId: number | null = null;
  partDetail: ExamPartDTO | null = null;
  partInfo: ExamPartDTO | null = null;
  questions: QuestionDTO[] = [];
  isLoading = true;
  constructor(private route: ActivatedRoute, private examService: ExamService) {
      this.partId = Number(this.route.snapshot.paramMap.get('id'));
      this.loadPartDetail();
  }
  private loadPartDetail(): void {
    if (this.partId) {
      this.examService.GetExamPartDetailAndQuestion(this.partId).subscribe({
        next: (data) => {
          this.partDetail = data;
          console.log('Part detail loaded:', this.partDetail);
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
        },
        error: (error) => {
          console.error('Error loading part detail:', error);
          this.isLoading = false;
        }
      });
    }
  }
}
