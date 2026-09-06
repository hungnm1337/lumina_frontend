import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { OptionsComponent } from '../../options/options.component';
import { ReadingGapQuestionComponent } from './reading-gap-question.component';
import { ReadingMatchingQuestionComponent } from './reading-matching-question.component';
import { ReadingOrderingQuestionComponent } from './reading-ordering-question.component';
import {
  ReadingQuestionChange,
  ReadingQuestionState,
  ReadingQuestionViewModel,
} from './reading-question.models';

@Component({
  selector: 'app-reading-question-view',
  standalone: true,
  imports: [
    CommonModule,
    OptionsComponent,
    ReadingGapQuestionComponent,
    ReadingMatchingQuestionComponent,
    ReadingOrderingQuestionComponent,
  ],
  templateUrl: './reading-question-view.component.html',
  styleUrls: ['./reading-question-view.component.scss'],
})
export class ReadingQuestionViewComponent {
  @Input() viewModel!: ReadingQuestionViewModel;
  @Input() state: ReadingQuestionState | null = null;
  @Input() disabled = false;
  @Input() resetAt = 0;
  @Output() changed = new EventEmitter<ReadingQuestionChange>();

  onChoice(selectedOptionId: number): void {
    this.changed.emit({ type: 'choice', selectedOptionId });
  }

  onCompositeChange(change: ReadingQuestionChange): void {
    this.changed.emit(change);
  }
}
