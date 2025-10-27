import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatComponent } from '../../User/chat/chat.component';

@Component({
  selector: 'app-floating-chat',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  templateUrl: './floating-chat.component.html',
  styleUrls: ['./floating-chat.component.scss']
})
export class FloatingChatComponent {
  isOpen = false;

  toggleChatbox() {
    this.isOpen = !this.isOpen;
  }

  closeChatbox() {
    this.isOpen = false;
  }
}


