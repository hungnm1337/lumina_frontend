import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatComponent } from '../../User/chat/chat.component';
import { ChatMessage } from '../../../Interfaces/Chat/ChatResponseDTO.interface';

@Component({
  selector: 'app-floating-chat',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  templateUrl: './floating-chat.component.html',
  styleUrls: ['./floating-chat.component.scss']
})
export class FloatingChatComponent {
  isOpen = false;
   private isProcessingMessage = false;
  
  // Lưu trữ tin nhắn trong memory
  savedMessages: ChatMessage[] = [];

  constructor() {
    // Khởi tạo tin nhắn chào mừng nếu chưa có
    this.initializeWelcomeMessage();
  }

  toggleChatbox() {
    this.isOpen = !this.isOpen;
  }

  closeChatbox() {
    this.isOpen = false;
    // Không xóa savedMessages, giữ nguyên để hiển thị lại khi mở
  }

  // Khởi tạo tin nhắn chào mừng
  private initializeWelcomeMessage() {
    if (this.savedMessages.length === 0) {
      this.savedMessages.push({
        type: 'ai',
        content: '**Xin chào! Tôi là AI Assistant**\n\nTôi có thể giúp bạn:\n\n**Tạo đề thi TOEIC:**\n• Tạo 5 câu Reading Part 5 về giới từ\n• Gen 10 câu Listening Part 1\n\n**Tư vấn & Hỗ trợ:**\n• Cách học TOEIC hiệu quả?\n• Giải thích cấu trúc câu này\n\n**Tips**: Mô tả càng chi tiết, kết quả càng tốt!\n\nBạn muốn tôi giúp gì nào? 😊',
        timestamp: new Date(),
        conversationType: 'general',
        suggestions: [
          'Tạo đề thi TOEIC',
          'Tư vấn học TOEIC',
          'Giải thích ngữ pháp',
          'Chiến lược làm bài'
        ]
      });
    }
  }

  // Xử lý khi có tin nhắn mới được thêm
  onMessageAdded(newMessage: ChatMessage) {
    if (this.isProcessingMessage) return;
    
    this.isProcessingMessage = true;
    
    // Kiểm tra xem tin nhắn đã tồn tại chưa
    const isDuplicate = this.savedMessages.some(msg => 
      msg.content === newMessage.content && 
      msg.type === newMessage.type &&
      // So sánh timestamp trong khoảng 1 giây
      Math.abs(msg.timestamp.getTime() - newMessage.timestamp.getTime()) < 1000
    );

    if (!isDuplicate) {
      this.savedMessages.push(newMessage);
      
      // Giới hạn số lượng tin nhắn
      if (this.savedMessages.length > 100) {
        this.savedMessages = this.savedMessages.slice(-100);
      }
    }

    // Reset flag sau khi xử lý xong
    setTimeout(() => {
      this.isProcessingMessage = false;
    }, 100);
  }
  }