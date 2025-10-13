import { Component, Input } from '@angular/core';
import { WrittingResponseDTO } from '../../../../../Interfaces/WrittingExam/WrittingResponseDTO.interface';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [],
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.scss'
})
export class FeedbackComponent {
  @Input() feedback: WrittingResponseDTO | null = null;
}
