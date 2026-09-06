import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ReadingView } from './reading-question.models';

@Component({
  selector: 'app-reading-test-toolbar',
  standalone: true,
  templateUrl: './reading-test-toolbar.component.html',
  styleUrls: ['./reading-test-toolbar.component.scss'],
})
export class ReadingTestToolbarComponent {
  @Input() view: ReadingView = 'question';
  @Input() canGoPrevious = false;

  @Output() questionList = new EventEmitter<void>();
  @Output() information = new EventEmitter<void>();
  @Output() accessibility = new EventEmitter<void>();
  @Output() exit = new EventEmitter<void>();
  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
}
