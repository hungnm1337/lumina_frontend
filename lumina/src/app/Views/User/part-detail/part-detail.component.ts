import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExamPartDTO } from '../../../Services/Exam/exam.service';

@Component({
  selector: 'app-part-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './part-detail.component.html'
})
export class PartDetailComponent {
  @Input() partInfo: ExamPartDTO | null = null;
  constructor() {
    console.log('Part Info:', this.partInfo);
   }
}
