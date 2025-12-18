import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
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
export class ChatPanelComponent implements AfterViewChecked {
  @Input() messages: any[] = [];
  @Input() isLoading = false;
  @Output() messageSent = new EventEmitter<string>();
  @Output() previewClicked = new EventEmitter<string>();

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  newMessage = '';

  sendMessage() {
    if (this.newMessage.trim()) {
      this.messageSent.emit(this.newMessage);
      this.newMessage = '';
    }
  }

  onEnter(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.sendMessage();
    }
  }

  // Emit event khi click vào preview
  onPreviewClick(previewId: string) {
    this.previewClicked.emit(previewId);
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom() {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch (e) { /* ignore */ }
  }
}