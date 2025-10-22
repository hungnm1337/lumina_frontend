import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { OptionsComponent } from '../../options/options.component';
import {
  OptionDTO,
  ExamPartDTO,
  QuestionDTO,
} from '../../../../Interfaces/exam.interfaces';

@Component({
  selector: 'app-listening',
  standalone: true,
  imports: [CommonModule, OptionsComponent],
  templateUrl: './listening.component.html',
  styleUrl: './listening.component.scss',
})
export class ListeningComponent implements OnChanges {
  @Input() questions: QuestionDTO[] = [];
  @Input() partInfo: ExamPartDTO | null = null;
  @Output() listeningAnswered = new EventEmitter<boolean>();

  // Legacy inputs for backward compatibility
  @Input() options: OptionDTO[] = [];
  @Input() disabled: boolean = false;
  @Input() resetAt: number = 0;
  @Output() answered = new EventEmitter<boolean>();

  ngOnChanges(changes: SimpleChanges): void {
    // Handle changes if needed
  }

  onAnswered(isCorrect: boolean): void {
    this.listeningAnswered.emit(isCorrect);
    this.answered.emit(isCorrect); // Legacy support
  }
}
