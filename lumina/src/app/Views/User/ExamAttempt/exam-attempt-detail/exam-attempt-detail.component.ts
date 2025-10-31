import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamAttemptDetailResponseDTO } from '../../../../Interfaces/ExamAttempt/ExamAttemptDetailResponseDTO.interface';
import { ExamAttemptService } from '../../../../Services/ExamAttempt/exam-attempt.service';
import { SpeakingSummaryComponent } from '../../speaking-summary/speaking-summary.component';
import { SpeakingScoringResult } from '../../../../Interfaces/exam.interfaces';

// Interface for speaking question results
interface QuestionResult {
  questionNumber: number;
  questionText: string;
  result: SpeakingScoringResult;
}

@Component({
  selector: 'app-exam-attempt-detail',
  standalone: true,
  imports: [CommonModule, SpeakingSummaryComponent],
  providers: [DatePipe],
  templateUrl: './exam-attempt-detail.component.html',
  styleUrl: './exam-attempt-detail.component.scss',
})
export class ExamAttemptDetailComponent implements OnInit {
  @Input() examAttemptDetails: ExamAttemptDetailResponseDTO | null = null;
  @Input() details: ExamAttemptDetailResponseDTO | null = null; // Keep backward compatibility

  @Output() close = new EventEmitter<void>();

  isLoading: boolean = false;

  // For speaking summary display
  speakingResults: QuestionResult[] = [];

  constructor(
    private datePipe: DatePipe,
    private route: ActivatedRoute,
    private router: Router,
    private examAttemptService: ExamAttemptService
  ) {}

  ngOnInit(): void {
    console.log('=== DEBUG: ngOnInit ===');
    console.log('examAttemptDetails @Input:', this.examAttemptDetails);
    console.log('details @Input:', this.details);

    // Priority: examAttemptDetails > details
    if (this.examAttemptDetails) {
      this.details = this.examAttemptDetails;
      console.log(
        'Using examAttemptDetails, speaking answers:',
        this.details?.speakingAnswers
      );
      return;
    }

    // If details are provided via @Input, use them
    if (this.details) {
      console.log(
        'Using details @Input, speaking answers:',
        this.details?.speakingAnswers
      );
      return;
    }

    // Otherwise, try to load from route parameter
    this.route.paramMap.subscribe((params) => {
      const attemptId = params.get('id');
      console.log('Loading from route, attemptId:', attemptId);
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
        console.log('=== DEBUG: Exam Attempt Details ===');
        console.log('Full details object:', details);
        console.log('Speaking answers:', details?.speakingAnswers);
        console.log(
          'Speaking answers length:',
          details?.speakingAnswers?.length
        );
        console.log('Reading answers length:', details?.readingAnswers?.length);
        console.log('Writing answers length:', details?.writingAnswers?.length);

        // 🔍 DEBUG: Log chi tiết speaking answers
        if (details?.speakingAnswers && details.speakingAnswers.length > 0) {
          console.log('=== SPEAKING ANSWERS DETAIL ===');
          details.speakingAnswers.forEach((answer, index) => {
            console.log(`Speaking Answer #${index + 1}:`, {
              questionId: answer.question?.questionId,
              questionNumber: answer.question?.questionNumber,
              questionType: answer.question?.questionType,
              transcript: answer.transcript?.substring(0, 50) + '...',
              audioUrl: answer.audioUrl,
              scores: {
                pronunciation: answer.pronunciationScore,
                accuracy: answer.accuracyScore,
                fluency: answer.fluencyScore,
                completeness: answer.completenessScore,
                grammar: answer.grammarScore,
                vocabulary: answer.vocabularyScore,
                content: answer.contentScore,
                overall: answer.overallScore,
              },
            });
          });

          // Convert to QuestionResult format for speaking summary
          this.speakingResults = this.convertToSpeakingResults(
            details.speakingAnswers
          );
        } else {
          console.warn('⚠️ No speaking answers found!');
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading exam attempt details:', error);
        this.isLoading = false;
      },
    });
  }

  // Convert speaking answers to QuestionResult format for summary component
  private convertToSpeakingResults(speakingAnswers: any[]): QuestionResult[] {
    return speakingAnswers.map((answer) => ({
      questionNumber: answer.question?.questionNumber || 0,
      questionText: answer.question?.stemText || '',
      result: {
        pronunciationScore: answer.pronunciationScore || 0,
        accuracyScore: answer.accuracyScore || 0,
        fluencyScore: answer.fluencyScore || 0,
        completenessScore: answer.completenessScore || 0,
        grammarScore: answer.grammarScore || 0,
        vocabularyScore: answer.vocabularyScore || 0,
        contentScore: answer.contentScore || 0,
        overallScore: answer.overallScore || 0,
        transcript: answer.transcript || '',
        savedAudioUrl: answer.audioUrl || '',
      },
    }));
  }

  goBack(): void {
    // ✅ Nếu được dùng như modal, emit close event
    if (this.close.observed) {
      this.close.emit();
    } else {
      // Nếu dùng như standalone page, navigate
      this.router.navigate(['/homepage/user-dashboard/exam-attempts']);
    }
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') || 'N/A';
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index); // Converts 0->A, 1->B, etc.
  }

  parseFeedback(feedbackJson: string): any {
    try {
      return JSON.parse(feedbackJson);
    } catch {
      return null;
    }
  }
}
