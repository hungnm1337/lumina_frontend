import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReadingQuestionChange, ReadingQuestionState, ReadingQuestionViewModel } from './reading-question.models';

@Component({
  selector: 'app-reading-gap-question',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reading-gap-question.component.html',
  styleUrls: ['./reading-gap-question.component.scss'],
})
export class ReadingGapQuestionComponent {
  @Input() viewModel!: ReadingQuestionViewModel;
  @Input() state: ReadingQuestionState | null = null;
  @Input() disabled = false;
  @Output() changed = new EventEmitter<ReadingQuestionChange>();

  get selections(): Record<string, string> {
    return this.state?.gapSelections ?? {};
  }

  selectGap(key: string, value: string): void {
    const gapSelections = { ...this.selections, [key]: value };
    const gapKeys = this.viewModel.gapSegments.filter((segment) => segment.isGap).map((segment) => segment.key);
    const isComplete = gapKeys.every((gapKey) => Boolean(gapSelections[gapKey]));
    this.changed.emit({ type: 'gaps', gapSelections, isComplete });
  }

  getValue(key: string): string {
    return this.selections[key] ?? '';
  }
}
