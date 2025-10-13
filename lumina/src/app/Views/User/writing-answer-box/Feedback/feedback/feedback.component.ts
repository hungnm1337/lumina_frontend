import { Component, Input } from '@angular/core';
import { WritingResponseDTO } from '../../../../../Interfaces/WrittingExam/WritingResponseDTO.interface';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [],
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.scss'
})
export class FeedbackComponent {
  @Input() feedback: WritingResponseDTO | null = null;
}
