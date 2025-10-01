import { Component, Input } from '@angular/core';
import { PromptDTO } from '../../../Interfaces/exam.interfaces';
@Component({
  selector: 'app-prompt',
  standalone: true,
  imports: [],
  templateUrl: './prompt.component.html',
  styleUrl: './prompt.component.scss'
})
export class PromptComponent {
@Input() prompt: PromptDTO | null = null;
}
