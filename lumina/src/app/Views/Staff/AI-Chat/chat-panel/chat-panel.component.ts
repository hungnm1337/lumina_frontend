import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageItemComponent } from '../message-item/message-item.component';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageItemComponent],
  templateUrl: './chat-panel.component.html',
  styleUrl: './chat-panel.component.scss'
})
export class ChatPanelComponent {
  @Input() messages: any[] = [];
  @Input() loading: boolean = false;
  @Output() sendMessage = new EventEmitter<string>();

  userInput: string = '';

  onSend(): void {
    if (!this.userInput.trim() || this.loading) return;
    
    this.sendMessage.emit(this.userInput.trim());
    this.userInput = '';
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }
}
