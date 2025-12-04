import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamService } from '../../../Services/Exam/exam.service';
import { PartDetailComponent } from '../part-detail/part-detail.component';
import { QuestionComponent } from '../question/question.component';
import { WritingComponent } from '../question/writing/writing.component';
import { SpeakingComponent } from '../question/speaking/speaking.component';
import { ReadingComponent } from '../question/reading/reading.component';
import { ListeningComponent } from '../question/listening/listening.component';
import { ExamPartDTO, QuestionDTO } from '../../../Interfaces/exam.interfaces';
import { flush } from '@angular/core/testing';

@Component({
  selector: 'app-part-question',
  standalone: true,
  imports: [
    PartDetailComponent,
    QuestionComponent,
    WritingComponent,
    SpeakingComponent,
    ReadingComponent,
    ListeningComponent,
  ],
    templateUrl: './part-question.component.html',
    styleUrls: ['./part-question.component.scss'],
})
export class PartQuestionComponent {
  partId: number | null = null;
  partDetail: ExamPartDTO | null = null;
  partInfo: ExamPartDTO | null = null;
  questions: QuestionDTO[] = [];
  isLoading = true;
  examType: string = '';
  isWritingExam = false;
  isSpeakingExam = false;
  isReadingExam = false;
  isListeningExam = false;

  constructor(
    private route: ActivatedRoute,
    private examService: ExamService,
    private router: Router
  ) {
    this.partId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadPartDetail();
  }
  private loadPartDetail(): void {
    if (this.partId) {
      this.examService.GetExamPartDetailAndQuestion(this.partId).subscribe({
        next: (data) => {
          this.partDetail = data;
          this.questions = this.partDetail.questions;

          // tùy vào part code có chứa "writing , reading, listening"

          if(this.partDetail.partCode.search('WRI')){
            this.isWritingExam = true;
          }else if(this.partDetail.partCode.search('REA')){
            this.isReadingExam = true;
          }
          else if(this.partDetail.partCode.search('LIS')){
            this.isListeningExam = true;
          }

          this.partInfo ={
            partId: this.partDetail.partId,
            partCode: this.partDetail.partCode,
            title: this.partDetail.title,
            orderIndex: this.partDetail.orderIndex,
            examId: this.partDetail.examId,
            questions: [],
          };
          this.questions = this.partDetail.questions || [];
          this.isLoading = false;

          // Xác định exam type ngay từ partCode
          this.determineExamTypeFromPartCode();

          // Load exam type để có thêm thông tin (optional)
          this.loadExamType();
        },
        error: (error) => {
          this.isLoading = false;
        },
      });
    }
  }

  private loadExamType(): void {
    if (this.partDetail?.examId) {
      this.examService.GetExamDetailAndPart(this.partDetail.examId).subscribe({
        next: (examData) => {
          this.examType = examData.examType || '';
          // Determine exam type based on partCode instead of examType
          this.determineExamTypeFromPartCode();
        },
        error: (error) => {
          // Handle error silently
        },
      });
    }
  }

  private determineExamTypeFromPartCode(): void {
    const partCode = this.partDetail?.partCode?.toUpperCase() || '';

    // Check partCode to determine exam type
    if (partCode.includes('SPEAKING')) {
      this.isSpeakingExam = true;
      this.isReadingExam = false;
      this.isListeningExam = false;
      this.isWritingExam = false;
    } else if (partCode.includes('READING')) {
      this.isSpeakingExam = false;
      this.isReadingExam = true;
      this.isListeningExam = false;
      this.isWritingExam = false;
    } else if (partCode.includes('LISTENING')) {
      this.isSpeakingExam = false;
      this.isReadingExam = false;
      this.isListeningExam = true;
      this.isWritingExam = false;
    } else if (partCode.includes('WRIT')) {
      this.isSpeakingExam = false;
      this.isReadingExam = false;
      this.isListeningExam = false;
      this.isWritingExam = true;
    } else {
      // Fallback to exam type if partCode doesn't match
      const type = this.examType.toUpperCase();
      this.isSpeakingExam = type.includes('SPEAKING');
      this.isReadingExam = type.includes('READING');
      this.isListeningExam = type.includes('LISTENING');
      this.isWritingExam = type.includes('WRIT'); 
    }
  }

  onWritingAnswered(isCorrect: boolean): void {
    // Handle writing answer submission if needed
  }

  onSpeakingAnswered(isCorrect: boolean): void {
    // Handle speaking answer submission if needed
  }

  onReadingAnswered(isCorrect: boolean): void {
    // Handle reading answer submission if needed
  }

  onListeningAnswered(isCorrect: boolean): void {
    // Handle listening answer submission if needed
  }
}
