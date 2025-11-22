import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamAttemptDetailResponseDTO } from '../../../../Interfaces/ExamAttempt/ExamAttemptDetailResponseDTO.interface';
import { ExamAttemptService } from '../../../../Services/ExamAttempt/exam-attempt.service';
import { SpeakingScoringResult } from '../../../../Interfaces/exam.interfaces';
import { SpeakingSummaryComponent } from '../../speaking-summary/speaking-summary.component';

// Interface for speaking question results
interface QuestionResult {
  questionNumber: number;
  questionText: string;
  result: SpeakingScoringResult;
}

@Component({
  selector: 'app-exam-attempt-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, SpeakingSummaryComponent],
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

  // Filter state
  selectedSkill: 'all' | 'listening' | 'reading' | 'writing' | 'speaking' = 'all';
  selectedPart: string = 'all'; // 'all' or specific part code

  // Map partId to partCode for display
  private partIdToCodeMap = new Map<number, string>();

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

        // Build partId to partCode map from questions
        this.buildPartIdToCodeMap();

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

  // Build map from partId to partCode
  private buildPartIdToCodeMap(): void {
    this.partIdToCodeMap.clear();

    // Extract from reading answers
    this.details?.readingAnswers?.forEach(answer => {
      const partId = answer.question?.partId;
      const partCode = answer.question?.partCode;
      if (partId && partCode && !this.partIdToCodeMap.has(partId)) {
        this.partIdToCodeMap.set(partId, partCode);
      }
    });

    // Extract from writing answers
    this.details?.writingAnswers?.forEach(answer => {
      const partId = answer.question?.partId;
      const partCode = answer.question?.partCode;
      if (partId && partCode && !this.partIdToCodeMap.has(partId)) {
        this.partIdToCodeMap.set(partId, partCode);
      }
    });

    // Extract from speaking answers
    this.details?.speakingAnswers?.forEach(answer => {
      const partId = answer.question?.partId;
      const partCode = answer.question?.partCode;
      if (partId && partCode && !this.partIdToCodeMap.has(partId)) {
        this.partIdToCodeMap.set(partId, partCode);
      }
    });
  }

  // Get part code by partId
  getPartCodeById(partId: number): string {
    return this.partIdToCodeMap.get(partId) || `Part ${partId}`;
  }

  // Check if this is a full mock test (has all 4 skills: listening, reading, writing, speaking)
  isMockTest(): boolean {
    if (!this.details) return false;

    const hasListening = this.getListeningCount() > 0;
    const hasReading = this.getReadingCount() > 0;
    const hasWriting = (this.details.writingAnswers?.length ?? 0) > 0;
    const hasSpeaking = (this.details.speakingAnswers?.length ?? 0) > 0;

    return hasListening && hasReading && hasWriting && hasSpeaking;
  }

  // Filter methods
  setSkillFilter(skill: 'all' | 'listening' | 'reading' | 'writing' | 'speaking'): void {
    this.selectedSkill = skill;
    // Reset part filter when skill changes
    this.selectedPart = 'all';
  }

  shouldShowListening(): boolean {
    return this.selectedSkill === 'all' || this.selectedSkill === 'listening';
  }

  shouldShowReading(): boolean {
    return this.selectedSkill === 'all' || this.selectedSkill === 'reading';
  }

  shouldShowWriting(): boolean {
    return this.selectedSkill === 'all' || this.selectedSkill === 'writing';
  }

  shouldShowSpeaking(): boolean {
    return this.selectedSkill === 'all' || this.selectedSkill === 'speaking';
  }

  getListeningCount(): number {
    // Listening questions are in readingAnswers with partCode starting with 'PART_1' to 'PART_4'
    return this.details?.readingAnswers?.filter(answer => {
      const partCode = answer.question?.partCode?.toUpperCase();
      return partCode && (
        partCode === 'PART_1' ||
        partCode === 'PART_2' ||
        partCode === 'PART_3' ||
        partCode === 'PART_4' ||
        partCode.includes('LISTENING') ||
        partCode.startsWith('L') // L1, L2, L3, L4
      );
    }).length || 0;
  }

  getReadingCount(): number {
    // Reading questions are in readingAnswers with partCode 'PART_5', 'PART_6', 'PART_7'
    return this.details?.readingAnswers?.filter(answer => {
      const partCode = answer.question?.partCode?.toUpperCase();
      return partCode && (
        partCode === 'PART_5' ||
        partCode === 'PART_6' ||
        partCode === 'PART_7' ||
        partCode.includes('READING') ||
        partCode.startsWith('R') // R1, R2, R3
      );
    }).length || 0;
  }

  getWritingCount(): number {
    return this.details?.writingAnswers?.length || 0;
  }

  getSpeakingCount(): number {
    return this.details?.speakingAnswers?.length || 0;
  }

  getTotalCount(): number {
    return this.getListeningCount() + this.getReadingCount() + this.getWritingCount() + this.getSpeakingCount();
  }

  // Part filter methods
  setPartFilter(partCode: string): void {
    this.selectedPart = partCode;
  }

  getAvailableParts(): { code: string; name: string; count: number }[] {
    const partsMap = new Map<string, { code: string; name: string; count: number }>();

    // Collect parts based on selected skill (group by partCode)
    if (this.selectedSkill === 'all' || this.selectedSkill === 'listening' || this.selectedSkill === 'reading') {
      this.details?.readingAnswers?.forEach(answer => {
        const partCode = answer.question?.partCode;
        const partCodeUpper = partCode?.toUpperCase();

        // Filter by skill if not 'all'
        if (this.selectedSkill === 'listening') {
          const isListening = partCodeUpper && (
            partCodeUpper === 'PART_1' ||
            partCodeUpper === 'PART_2' ||
            partCodeUpper === 'PART_3' ||
            partCodeUpper === 'PART_4' ||
            partCodeUpper.includes('LISTENING') ||
            partCodeUpper.startsWith('L')
          );
          if (!isListening) return;
        }

        if (this.selectedSkill === 'reading') {
          const isReading = partCodeUpper && (
            partCodeUpper === 'PART_5' ||
            partCodeUpper === 'PART_6' ||
            partCodeUpper === 'PART_7' ||
            partCodeUpper.includes('READING') ||
            partCodeUpper.startsWith('R')
          );
          if (!isReading) return;
        }

        if (partCode && !partsMap.has(partCode)) {
          partsMap.set(partCode, { code: partCode, name: partCode, count: 0 });
        }
        if (partCode) {
          partsMap.get(partCode)!.count++;
        }
      });
    }

    if (this.selectedSkill === 'all' || this.selectedSkill === 'writing') {
      this.details?.writingAnswers?.forEach(answer => {
        const partCode = answer.question?.partCode;
        if (partCode && !partsMap.has(partCode)) {
          partsMap.set(partCode, { code: partCode, name: partCode, count: 0 });
        }
        if (partCode) {
          partsMap.get(partCode)!.count++;
        }
      });
    }

    if (this.selectedSkill === 'all' || this.selectedSkill === 'speaking') {
      this.details?.speakingAnswers?.forEach(answer => {
        const partCode = answer.question?.partCode;
        if (partCode && !partsMap.has(partCode)) {
          partsMap.set(partCode, { code: partCode, name: partCode, count: 0 });
        }
        if (partCode) {
          partsMap.get(partCode)!.count++;
        }
      });
    }

    return Array.from(partsMap.values())
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  // Filter reading/listening answers by part (using partCode)
  getFilteredReadingAnswers() {
    if (!this.details?.readingAnswers) return [];

    let filtered = this.details.readingAnswers;

    // Filter by skill first
    if (this.selectedSkill === 'listening') {
      filtered = filtered.filter(answer => {
        const partCode = answer.question?.partCode?.toUpperCase();
        return partCode && (
          partCode === 'PART_1' ||
          partCode === 'PART_2' ||
          partCode === 'PART_3' ||
          partCode === 'PART_4' ||
          partCode.includes('LISTENING') ||
          partCode.startsWith('L')
        );
      });
    } else if (this.selectedSkill === 'reading') {
      filtered = filtered.filter(answer => {
        const partCode = answer.question?.partCode?.toUpperCase();
        return partCode && (
          partCode === 'PART_5' ||
          partCode === 'PART_6' ||
          partCode === 'PART_7' ||
          partCode.includes('READING') ||
          partCode.startsWith('R')
        );
      });
    }

    // Then filter by part if selected
    if (this.selectedPart !== 'all') {
      filtered = filtered.filter(answer => answer.question?.partCode === this.selectedPart);
    }

    return filtered;
  }

  // Filter writing answers by part (using partCode)
  getFilteredWritingAnswers() {
    if (!this.details?.writingAnswers) return [];
    if (this.selectedPart === 'all') return this.details.writingAnswers;
    return this.details.writingAnswers.filter(
      answer => answer.question?.partCode === this.selectedPart
    );
  }

  // Filter speaking answers by part (using partCode)
  getFilteredSpeakingAnswers() {
    if (!this.details?.speakingAnswers) return [];
    if (this.selectedPart === 'all') return this.details.speakingAnswers;
    return this.details.speakingAnswers.filter(
      answer => answer.question?.partCode === this.selectedPart
    );
  }

  // Update filtered speaking results for summary (using partCode)
  getFilteredSpeakingResults(): QuestionResult[] {
    if (this.selectedPart === 'all') return this.speakingResults;
    return this.speakingResults.filter((result, index) => {
      const answer = this.details?.speakingAnswers?.[index];
      return answer?.question?.partCode === this.selectedPart;
    });
  }
}
