import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { OptionDTO } from '../../../../Interfaces/exam.interfaces';
import { ReadingQuestionChange, ReadingQuestionState, ReadingQuestionViewModel } from './reading-question.models';

@Component({
  selector: 'app-reading-ordering-question',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './reading-ordering-question.component.html',
  styleUrls: ['./reading-ordering-question.component.scss'],
})
export class ReadingOrderingQuestionComponent implements OnChanges {
  @Input() viewModel!: ReadingQuestionViewModel;
  @Input() state: ReadingQuestionState | null = null;
  @Input() disabled = false;
  @Output() changed = new EventEmitter<ReadingQuestionChange>();

  poolOptions: OptionDTO[] = [];
  orderedOptions: OptionDTO[] = [];
  liveMessage = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['viewModel'] || changes['state']) {
      this.syncOptions();
    }
  }

  private syncOptions(): void {
    if (!this.viewModel) return;

    const movableOptions = this.viewModel.options.filter(
      (option) => option.optionId !== this.viewModel.fixedOption?.optionId
    );
    const orderedIds = new Set(this.state?.orderedOptionIds ?? []);
    this.orderedOptions = (this.state?.orderedOptionIds ?? [])
      .map((id) => movableOptions.find((option) => option.optionId === id))
      .filter((option): option is OptionDTO => Boolean(option));
    this.poolOptions = movableOptions.filter((option) => !orderedIds.has(option.optionId));
  }

  onDrop(event: CdkDragDrop<OptionDTO[]>): void {
    if (this.disabled) return;

    if (event.previousContainer === event.container) {
      moveItemInArray(this.orderedOptions, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    const orderedOptionIds = this.orderedOptions.map((option) => option.optionId);
    const isComplete = orderedOptionIds.length === this.viewModel.options.length - (this.viewModel.fixedOption ? 1 : 0);
    this.liveMessage = isComplete
      ? 'All sentences are in the answer order.'
      : `${orderedOptionIds.length} sentence${orderedOptionIds.length === 1 ? '' : 's'} placed.`;
    this.changed.emit({ type: 'ordering', orderedOptionIds, isComplete });
  }
}
