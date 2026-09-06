import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-reading-instructions',
  standalone: true,
  templateUrl: './reading-instructions.component.html',
  styleUrls: ['./reading-instructions.component.scss'],
})
export class ReadingInstructionsComponent {
  @Output() next = new EventEmitter<void>();
}
