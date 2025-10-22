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
  styleUrl: './part-question.component.scss',
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
          console.log('✅ Part detail loaded:', data);
          console.log('✅ Questions loaded:', data.questions);

          // ✅ Log chi tiết từng question
          data.questions?.forEach((q, i) => {
            console.log(`Question ${i}:`, {
              id: q.questionId,
              type: q.questionType,
              hasPrompt: !!q.prompt,
              promptContent: q.prompt?.contentText,
            });
          });

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
            partCode: this.partDetail.partCode,
            title: this.partDetail.title,
            orderIndex: this.partDetail.orderIndex,
            examId: this.partDetail.examId,
            questions: [],
          };
          this.questions = this.partDetail.questions || [];
          this.isLoading = false;

          console.log('✅ Final questions array:', this.questions);

          // ✅ Xác định exam type ngay từ partCode
          this.determineExamTypeFromPartCode();
          console.log('✅ Exam type flags:', {
            partCode: this.partDetail?.partCode,
            isWriting: this.isWritingExam,
            isSpeaking: this.isSpeakingExam,
            isReading: this.isReadingExam,
            isListening: this.isListeningExam,
          });

          // Load exam type để có thêm thông tin (optional)
          this.loadExamType();
        },
        error: (error) => {
          console.error('❌ Error loading part detail:', error);
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
          console.log('Exam type:', this.examType);
          console.log('Part code:', this.partDetail?.partCode);
          console.log('Exam type flags:', {
            isWriting: this.isWritingExam,
            isSpeaking: this.isSpeakingExam,
            isReading: this.isReadingExam,
            isListening: this.isListeningExam,
          });
        },
        error: (error) => {
          console.error('Error loading exam type:', error);
        },
      });
    }
  }

  private determineExamTypeFromPartCode(): void {
    const partCode = this.partDetail?.partCode?.toUpperCase() || '';

    console.log('🔍 Determining exam type from partCode:', partCode);

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
      // ✅ Match cả WRITTING và WRITING
      this.isSpeakingExam = false;
      this.isReadingExam = false;
      this.isListeningExam = false;
      this.isWritingExam = true;
      console.log('✅ Detected as Writing exam');
    } else {
      // Fallback to exam type if partCode doesn't match
      console.log('⚠️ PartCode not matched, using examType fallback');
      const type = this.examType.toUpperCase();
      this.isSpeakingExam = type.includes('SPEAKING');
      this.isReadingExam = type.includes('READING');
      this.isListeningExam = type.includes('LISTENING');
      this.isWritingExam = type.includes('WRIT'); // ✅ Match cả WRITTING và WRITING
    }
  }

  onWritingAnswered(isCorrect: boolean): void {
    console.log('Writing answer submitted:', isCorrect);
    // Handle writing answer submission if needed
  }

  onSpeakingAnswered(isCorrect: boolean): void {
    console.log('Speaking answer submitted:', isCorrect);
    // Handle speaking answer submission if needed
  }

  onReadingAnswered(isCorrect: boolean): void {
    console.log('Reading answer submitted:', isCorrect);
    // Handle reading answer submission if needed
  }

  onListeningAnswered(isCorrect: boolean): void {
    console.log('Listening answer submitted:', isCorrect);
    // Handle listening answer submission if needed
  }
}
