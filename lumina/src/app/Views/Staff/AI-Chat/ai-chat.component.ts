import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExamGeneratorService } from '../../../Services/exam-generator/exam-generator.service'; 
import { ChatPanelComponent } from './chat-panel/chat-panel.component';
import { PreviewPanelComponent } from './preview-panel/preview-panel.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, ChatPanelComponent, PreviewPanelComponent, FormsModule],
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.scss'
})
export class AiChatComponent implements OnInit {
  messages: any[] = [];
  loading: boolean = false;
  previewData: any = null;

  constructor(private aiExamService: ExamGeneratorService) {}

  ngOnInit(): void {
    this.addAssistantMessage(
      'Xin chào! 👋\n\n' +
      'Tôi là trợ lý AI TOEIC.\n\n' +
      '💬 Bạn có thể:\n' +
      '• Tạo đề: "Tạo 5 câu Reading Part 5 về giới từ"\n' +
      '• Hỏi đáp: "Làm thế nào để học TOEIC hiệu quả?"\n' +
      '• Tư vấn: "Giải thích cách dùng giới từ in, on, at"\n\n' +
      'Hãy cho tôi biết bạn cần gì!'
    );
  }

  handleSendMessage(userRequest: string): void {
    this.addUserMessage(userRequest);
    
    // ✅ Phát hiện xem có phải là request tạo đề không
    const isExamRequest = this.detectExamRequest(userRequest);
    
    // ✅ Hiển thị loading message tương ứng
    if (isExamRequest) {
      this.addAssistantMessage('⏳ Đang tạo đề, quá trình có thể mất nhiều thời gian, vui lòng đợi...');
    } else {
      this.addAssistantMessage('⏳ Đang phản hồi...');
    }
    
    this.handleSmartChat(userRequest);
  }

  handleSmartChat(userRequest: string): void {
    this.loading = true;

    this.aiExamService.smartChat(userRequest).subscribe({
      next: (response: any) => {
        console.log('Smart Chat Response:', response);
        this.removeLoadingMessage();
        
        if (response.type === 'exam') {
          // ===== TRƯỜNG HỢP TẠO ĐỀ THI =====
          this.previewData = response.data;
          
          this.addAssistantMessage(
            `✅ **Đã tạo xong!**\n\n` +
            `📋 ${response.examInfo.examTitle}\n` +
            `🎯 ${response.examInfo.skill} - ${response.examInfo.partLabel}\n` +
            `📊 ${response.examInfo.totalQuestions} câu hỏi trong ${response.examInfo.promptCount} prompt\n\n` +
            `Xem chi tiết bên phải →`
          );
        } else {
          // ===== TRƯỜNG HỢP CHAT TỰ DO =====
          this.addAssistantMessage(response.message);
        }
        
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error:', error);
        this.removeLoadingMessage();
        this.addAssistantMessage(
          `❌ Lỗi: ${error.error?.message || error.message}\n\n` +
          `Vui lòng thử lại!`
        );
        this.loading = false;
      }
    });
  }

  // ✅ Phát hiện xem có phải là request tạo đề không (frontend check)
  private detectExamRequest(userRequest: string): boolean {
    const examKeywords = [
      'tạo', 'generate', 'gen', 'sinh',
      'câu hỏi', 'đề thi', 'bài tập',
      'reading part', 'listening part',
      'part 1', 'part 2', 'part 3', 'part 4', 'part 5', 'part 6', 'part 7'
    ];
    
    const lowerRequest = userRequest.toLowerCase();
    return examKeywords.some(keyword => lowerRequest.includes(keyword));
  }

  private addUserMessage(content: string): void {
    this.messages.push({ role: 'user', content });
  }

  private addAssistantMessage(content: string): void {
    this.messages.push({ role: 'assistant', content });
  }

  private removeLoadingMessage(): void {
    const lastMsg = this.messages[this.messages.length - 1];
    if (lastMsg?.content.includes('⏳')) {
      this.messages.pop();
    }
  }
}
