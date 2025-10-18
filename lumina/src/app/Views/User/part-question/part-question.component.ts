import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamService } from '../../../Services/Exam/exam.service';
import { PartDetailComponent } from "../part-detail/part-detail.component";
import { QuestionComponent } from "../question/question.component";
import { WritingComponent } from "../question/writing/writing.component";
import { ExamPartDTO, QuestionDTO } from '../../../Interfaces/exam.interfaces';
import { flush } from '@angular/core/testing';

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
  questions: QuestionDTO[] | null = null;

  isWritingExam : boolean = false;
  isReadingExam: boolean = false;
  isListeningExam: boolean = false;

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
          this.questions = this.partDetail.questions;
          console.log('Questions data:', this.questions);

          // tùy vào part code có chứa "writing , reading, listening"

          if(this.partDetail.partCode.search('WRI')){
            this.isWritingExam = true;
            console.log('isWritingExam set to true');
          }else if(this.partDetail.partCode.search('REA')){
            this.isReadingExam = true;
            console.log('isReadingExam set to true');
          }
          else if(this.partDetail.partCode.search('LIS')){
            this.isListeningExam = true;
            console.log('isListeningExam set to true');
          }

          this.partInfo ={
            partId: this.partDetail.partId,
            examId: this.partDetail.examId,
            partCode: this.partDetail.partCode,
            title: this.partDetail.title,
            orderIndex: this.partDetail.orderIndex,
            questions: []
          };
        },
        error: (error) => {
          console.error('Error loading part detail:', error);
        }
      });
    }
  }
}
