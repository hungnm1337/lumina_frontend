import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpeakingScoringResult } from '../../../Interfaces/exam.interfaces';

interface QuestionResult {
  questionNumber: number;
  questionText: string;
  result: SpeakingScoringResult;
}

@Component({
  selector: 'app-speaking-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './speaking-summary.component.html',
  styleUrl: './speaking-summary.component.scss',
})
export class SpeakingSummaryComponent {
  @Input() results: QuestionResult[] = [];
  @Output() retryTest = new EventEmitter<void>();
  @Output() tryOtherTest = new EventEmitter<void>();

  // Track which questions are expanded
  expandedQuestions: Set<number> = new Set();

  // Tính tổng điểm TOEIC Speaking (0-200 scale)
  get toeicScore(): number {
    if (this.results.length === 0) return 0;

    // Tính trung bình điểm overall (0-100)
    const avgScore =
      this.results.reduce((sum, r) => sum + (r.result.overallScore || 0), 0) /
      this.results.length;

    // Convert sang thang điểm TOEIC (0-200)
    // Linear mapping: 0-100 → 0-200
    return Math.round((avgScore / 100) * 200);
  }

  // Xác định level TOEIC Speaking
  get toeicLevel(): string {
    const score = this.toeicScore;
    if (score >= 160) return '8 - Advanced High';
    if (score >= 130) return '7 - Advanced Low';
    if (score >= 110) return '6 - Intermediate High';
    if (score >= 80) return '5 - Intermediate Mid';
    if (score >= 60) return '4 - Intermediate Low';
    if (score >= 40) return '3 - Novice High';
    if (score >= 20) return '2 - Novice Mid';
    return '1 - Novice Low';
  }

  get levelColor(): string {
    const score = this.toeicScore;
    if (score >= 160) return 'text-green-600';
    if (score >= 130) return 'text-blue-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-orange-600';
  }

  get levelBgColor(): string {
    const score = this.toeicScore;
    if (score >= 160) return 'bg-green-100 border-green-300';
    if (score >= 130) return 'bg-blue-100 border-blue-300';
    if (score >= 80) return 'bg-yellow-100 border-yellow-300';
    return 'bg-orange-100 border-orange-300';
  }

  // Get average score for each skill
  getAverageScore(
    scoreKey: keyof SpeakingScoringResult,
    category: 'azure' | 'nlp'
  ): number {
    const filteredResults = this.results.filter((r) => {
      const result = r.result;
      if (category === 'azure') {
        return (
          result.pronunciationScore !== undefined ||
          result.accuracyScore !== undefined ||
          result.fluencyScore !== undefined ||
          result.completenessScore !== undefined
        );
      } else {
        return (
          result.grammarScore !== undefined ||
          result.vocabularyScore !== undefined ||
          result.contentScore !== undefined
        );
      }
    });

    if (filteredResults.length === 0) return 0;

    const sum = filteredResults.reduce((acc, r) => {
      const val = r.result[scoreKey];
      return acc + (typeof val === 'number' ? val : 0);
    }, 0);

    return sum / filteredResults.length;
  }

  // Toggle methods for question details
  toggleQuestion(index: number): void {
    if (this.expandedQuestions.has(index)) {
      this.expandedQuestions.delete(index);
    } else {
      this.expandedQuestions.add(index);
    }
  }

  isQuestionExpanded(index: number): boolean {
    return this.expandedQuestions.has(index);
  }

  // Action methods
  onRetryTest(): void {
    this.retryTest.emit();
  }

  onTryOtherTest(): void {
    this.tryOtherTest.emit();
  }
}