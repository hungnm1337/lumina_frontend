import { ExamGeneratorService } from './../../../Services/exam-generator/exam-generator.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatPanelComponent } from './chat-panel/chat-panel.component';
import { PreviewPanelComponent } from './preview-panel/preview-panel.component';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'code' | 'question';
  previewId?: string; // ID để liên kết với preview data
}

export interface PreviewDataItem {
  id: string;
  data: any;
  examInfo: {
    examTitle: string;
    skill: string;
    partLabel: string;
    totalQuestions: number;
    promptCount: number;
  };
  timestamp: Date;
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, ChatPanelComponent, PreviewPanelComponent],
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.scss'
})
export class AiChatComponent implements OnInit, OnDestroy {
  isOpen = false;
  isMinimized = false;
  showPreview = false;
  previewData: any = null;
  messages: Message[] = [];
  isLoading = false;

  // Lưu trữ tất cả preview data
  previewDataList: PreviewDataItem[] = [];
  currentPreviewId: string | null = null;

  // Tooltip giới thiệu
  showIntroTooltip = false;
  private introInterval: any;
  private hideTooltipTimeout: any;

  constructor(private aiExamService: ExamGeneratorService) {}

  ngOnInit(): void {
    // Hiển thị tooltip giới thiệu lần đầu sau 3 giây
    setTimeout(() => {
      this.showIntroTooltip = true;
      this.scheduleTooltipHide();
    }, 3000);

    // Lặp lại tooltip mỗi 2-3 phút (120-180 giây)
    this.introInterval = setInterval(() => {
      if (!this.isOpen) {
        this.showIntroTooltip = true;
        this.scheduleTooltipHide();
      }
    }, this.getRandomInterval(120000, 180000)); // 2-3 phút
  }

  ngOnDestroy(): void {
    if (this.introInterval) {
      clearInterval(this.introInterval);
    }
    if (this.hideTooltipTimeout) {
      clearTimeout(this.hideTooltipTimeout);
    }
  }

  private scheduleTooltipHide(): void {
    // Ẩn tooltip sau 5 giây
    this.hideTooltipTimeout = setTimeout(() => {
      this.showIntroTooltip = false;
    }, 5000);
  }

  private getRandomInterval(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private addWelcomeMessage(): void {
    // Message chào mừng trong chat
    this.addAssistantMessage(
      '👋 **Xin chào! Tôi là AI Assistant**\n\n' +
      '🤖 Tôi có thể giúp bạn:\n\n' +
      '📝 **Tạo đề thi TOEIC**\n' +
      '   • "Tạo 5 câu Reading Part 5 về giới từ"\n' +
      '   • "Gen 10 câu Listening Part 1"\n\n' +
      '💡 **Tư vấn & Hỗ trợ**\n' +
      '   • "Cách học TOEIC hiệu quả?"\n' +
      '   • "Giải thích cấu trúc câu này"\n\n' +
      '🎯 **Tips**: Mô tả càng chi tiết, kết quả càng tốt!\n\n' +
      'Bạn muốn tôi giúp gì nào? 😊'
    );
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    this.isMinimized = false;
    this.showIntroTooltip = false; // Ẩn tooltip khi mở chat
    
    // Thêm welcome message khi mở chat lần đầu
    if (this.isOpen && this.messages.length === 0) {
      this.addWelcomeMessage();
    }
  }

  minimizeChat() {
    this.isMinimized = true;
    this.isOpen = false;
  }

  closeChat() {
    this.isOpen = false;
    this.isMinimized = false;
    this.showPreview = false;
    
    // ✅ Reset preview selectors khi đóng chat
    this.resetPreviewSelectors();
  }

  togglePreview() {
    this.showPreview = !this.showPreview;
    
    // ✅ Nếu đóng preview, reset selectors
    if (!this.showPreview) {
      this.resetPreviewSelectors();
    }
  }

  // ✅ Hàm helper để reset preview selectors
  private resetPreviewSelectors() {
    // Trigger reset trong preview panel component
    // Sẽ được xử lý bởi ngOnDestroy hoặc ngOnChanges
    console.log('🔄 Closing preview - selectors will reset');
  }

  sendMessage(content: string) {
    if (!content.trim()) return;

    this.addUserMessage(content.trim());
    
    const isExamRequest = this.detectExamRequest(content);
    
    if (isExamRequest) {
      this.addAssistantMessage('⏳ Đang tạo đề, quá trình có thể mất nhiều thời gian, vui lòng đợi...');
    }
    
    this.handleSmartChat(content);
  }

  handleSmartChat(userRequest: string): void {
    this.isLoading = true;

    this.aiExamService.smartChat(userRequest).subscribe({
      next: (response: any) => {
        console.log('Smart Chat Response:', response);
        this.removeLoadingMessage();
        
        if (response.type === 'exam') {
          // Tạo ID unique cho preview data
          const previewId = `preview_${Date.now()}`;
          
          // Lưu preview data vào list
          const previewItem: PreviewDataItem = {
            id: previewId,
            data: response.data,
            examInfo: response.examInfo,
            timestamp: new Date()
          };
          this.previewDataList.push(previewItem);
          
          // Set preview hiện tại
          this.previewData = response.data;
          this.currentPreviewId = previewId;
          this.showPreview = true;
          
          // Thêm message với previewId
          this.addAssistantMessage(
            `✅ **Đã tạo xong!**\n\n` +
            `📋 ${response.examInfo.examTitle}\n` +
            `🎯 ${response.examInfo.skill} - ${response.examInfo.partLabel}\n` +
            `📊 ${response.examInfo.totalQuestions} câu hỏi trong ${response.examInfo.promptCount} prompt\n\n` +
            `👉 Xem chi tiết bên phải →`,
            previewId
          );
        } else {
          this.addAssistantMessage(response.message);
        }
        
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error:', error);
        this.removeLoadingMessage();
        this.addAssistantMessage(
          `❌ **Có lỗi xảy ra!**\n\n` +
          `${error.error?.message || error.message}\n\n` +
          `Vui lòng thử lại sau! 🙏`
        );
        this.isLoading = false;
      }
    });
  }

  // Xem lại preview data cũ
  viewPreview(previewId: string): void {
    const previewItem = this.previewDataList.find(p => p.id === previewId);
    if (previewItem) {
      this.previewData = previewItem.data;
      this.currentPreviewId = previewId;
      this.showPreview = true;
      
      // ✅ Reset selectors khi xem preview mới
      this.resetPreviewSelectors();
    }
  }

  // ===== HELPER METHODS =====

  private addUserMessage(content: string): void {
    const message: Message = {
      id: Date.now().toString(),
      content: content,
      role: 'user',
      timestamp: new Date(),
      type: 'text'
    };
    this.messages.push(message);
  }

  private addAssistantMessage(content: string, previewId?: string): void {
    const message: Message = {
      id: Date.now().toString(),
      content: content,
      role: 'assistant',
      timestamp: new Date(),
      type: 'text',
      previewId: previewId
    };
    this.messages.push(message);
  }

  private removeLoadingMessage(): void {
    if (this.messages.length > 0) {
      const lastMessage = this.messages[this.messages.length - 1];
      if (lastMessage.content.startsWith('⏳')) {
        this.messages.pop();
      }
    }
  }

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

  clearMessages() {
    this.messages = [];
    this.previewDataList = [];
    this.previewData = null;
    this.currentPreviewId = null;
    this.addWelcomeMessage();
  }
}