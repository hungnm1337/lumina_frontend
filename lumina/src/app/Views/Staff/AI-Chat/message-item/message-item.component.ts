import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-message-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-item.component.html',
  styleUrl: './message-item.component.scss'
})
export class MessageItemComponent {
 @Input() message: any;

  formatMessage(content: string): string {
    if (!content) return '';
    
    // Convert markdown patterns sang HTML
    let formatted = content
      // **bold** → <strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // • bullet points với indent
      .replace(/^•\s/gm, '&nbsp;&nbsp;• ')
      // \n\n → paragraph break
      .replace(/\n\n/g, '<br><br>')
      // \n → line break
      .replace(/\n/g, '<br>');
    
    return formatted;
  }
}
