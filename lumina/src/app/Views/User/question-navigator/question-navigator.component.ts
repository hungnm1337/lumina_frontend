import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface NavigatorQuestion {
  questionId: number;
  [key: string]: any;
}

export interface NavigatorLegendItem {
  color: string;
  label: string;
  animated?: boolean;
}

@Component({
  selector: 'app-question-navigator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './question-navigator.component.html',
  styleUrls: ['./question-navigator.component.scss'],
})
export class QuestionNavigatorComponent {
  @Input() questions: NavigatorQuestion[] = [];
  @Input() currentIndex: number = 0;
  @Input() getQuestionStatus!: (questionId: number, index: number) => string;
  @Input() legendItems: NavigatorLegendItem[] = [
    { color: 'bg-gray-200', label: 'Chưa làm' },
    { color: 'bg-green-500', label: 'Đã làm' },
    { color: 'bg-blue-600', label: 'Đang làm' },
  ];
  @Input() showSubmitButton: boolean = true;
  @Input() submitButtonText: string = 'Nộp bài';

  @Output() navigateToQuestion = new EventEmitter<number>();
  @Output() submitExam = new EventEmitter<void>();

  onNavigateToQuestion(index: number): void {
    this.navigateToQuestion.emit(index);
  }

  onSubmitExam(): void {
    this.submitExam.emit();
  }

  getButtonClass(index: number): string {
    const questionId = this.questions[index].questionId;
    const status = this.getQuestionStatus(questionId, index);

    const baseClass =
      'w-10 h-10 p-0 rounded text-xs shadow-sm flex items-center justify-center';
    const classes: { [key: string]: string } = {
      current: `${baseClass} bg-blue-600 text-white font-semibold hover:bg-blue-700`,
      answered: `${baseClass} bg-green-500 text-white hover:bg-green-600`,
      'answered-green-600': `${baseClass} bg-green-600 text-white hover:bg-green-700`,
      submitted: `${baseClass} bg-purple-500 text-white font-semibold`,
      submitting: `${baseClass} bg-yellow-500 text-white font-semibold animate-pulse`,
      'has-answer': `${baseClass} bg-orange-500 text-white`,
      unanswered: `${baseClass} bg-gray-200 text-gray-700 hover:bg-gray-300`,
    };

    // Add ring for current question if it has another status
    if (index === this.currentIndex && status !== 'current') {
      return `${classes[status] || classes['unanswered']} ring-2 ring-blue-400`;
    }

    return classes[status] || classes['unanswered'];
  }
}
