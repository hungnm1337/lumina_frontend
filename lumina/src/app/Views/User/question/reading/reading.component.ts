import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OptionsComponent } from '../../options/options.component';
import { OptionDTO } from '../../../../Interfaces/exam.interfaces';

@Component({
  selector: 'app-reading',
  standalone: true,
  imports: [CommonModule, OptionsComponent],
  templateUrl: './reading.component.html',
  styleUrl: './reading.component.scss'
})
export class ReadingComponent implements OnChanges {
  @Input() options: OptionDTO[] = [];
  @Input() disabled: boolean = false;
  @Input() resetAt: number = 0;
  @Output() answered = new EventEmitter<boolean>();

  ngOnChanges(changes: SimpleChanges): void {
    // Handle changes if needed
  }

  onAnswered(isCorrect: boolean): void {
    this.answered.emit(isCorrect);
  }
}
