import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReadingQuestionChange, ReadingQuestionState, ReadingQuestionViewModel } from './reading-question.models';

@Component({
  selector: 'app-reading-matching-question',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reading-matching-question.component.html',
  styleUrls: ['./reading-matching-question.component.scss'],
})
export class ReadingMatchingQuestionComponent {
  @Input() viewModel!: ReadingQuestionViewModel;
  @Input() state: ReadingQuestionState | null = null;
  @Input() disabled = false;
  @Output() changed = new EventEmitter<ReadingQuestionChange>();

  get selections(): Record<string, number | null> {
    return this.state?.matchingSelections ?? {};
  }

  get passageText(): string {
    return this.viewModel.contentText === this.viewModel.promptText
      ? ''
      : this.viewModel.contentText;
  }

  selectMatch(key: string, value: string): void {
    const matchingSelections = {
      ...this.selections,
      [key]: value ? Number(value) : null,
    };
    const isComplete = this.viewModel.matchingPrompts.every(
      (prompt) => matchingSelections[prompt.key] !== null && matchingSelections[prompt.key] !== undefined
    );
    this.changed.emit({ type: 'matching', matchingSelections, isComplete });
  }

  getValue(key: string): number | null {
    return this.selections[key] ?? null;
  }
}
