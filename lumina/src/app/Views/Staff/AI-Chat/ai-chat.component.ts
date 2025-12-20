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
  previewId?: string;
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
  isSaving = false;


  previewDataList: PreviewDataItem[] = [];
  currentPreviewId: string | null = null;

  showIntroTooltip = false;
  private introInterval: any;
  private hideTooltipTimeout: any;

  private currentUserId: string = '';
  
  // Key to store current userId
  private readonly LAST_USER_KEY = 'ai_chat_last_user';

  private get STORAGE_KEY_MESSAGES(): string {
    return `ai_chat_messages_${this.currentUserId}`;
  }

  private get STORAGE_KEY_PREVIEW(): string {
    return `ai_chat_preview_list_${this.currentUserId}`;
  }

  constructor(private aiExamService: ExamGeneratorService) {}

  ngOnInit(): void {
    // Get userId from token
    this.currentUserId = this.getUserIdFromToken();
    
    // Check if it's a new user
    this.checkAndClearOldUserData();
    
    // Load data từ sessionStorage theo userId
    this.loadFromStorage();

    setTimeout(() => {
      this.showIntroTooltip = true;
      this.scheduleTooltipHide();
    }, 3000);

    this.introInterval = setInterval(() => {
      if (!this.isOpen) {
        this.showIntroTooltip = true;
        this.scheduleTooltipHide();
      }
    }, this.getRandomInterval(120000, 180000)); // 2-3 phút
  }

  // Check and clear old user data if a new user logs in
  private checkAndClearOldUserData(): void {
    try {
      const lastUserId = sessionStorage.getItem(this.LAST_USER_KEY);
      
      if (lastUserId && lastUserId !== this.currentUserId) {
        console.log(`User changed from ${lastUserId} to ${this.currentUserId} - Clearing old chat`);
        
        // Xóa chat của user cũ
        sessionStorage.removeItem(`ai_chat_messages_${lastUserId}`);
        sessionStorage.removeItem(`ai_chat_preview_list_${lastUserId}`);
      }
      
      // Lưu userId hiện tại
      sessionStorage.setItem(this.LAST_USER_KEY, this.currentUserId);
      
    } catch (error) {
      console.error('Error checking user data:', error);
    }
  }

  private getUserIdFromToken(): string {
    try {
      const token = localStorage.getItem('lumina_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.userId || payload.id || 'guest';
      }
    } catch (error) {
      console.error('Error parsing token:', error);
    }
    return 'guest';
  }

  ngOnDestroy(): void {
    if (this.introInterval) {
      clearInterval(this.introInterval);
    }
    if (this.hideTooltipTimeout) {
      clearTimeout(this.hideTooltipTimeout);
    }
  }

  // Load data from sessionStorage
  private loadFromStorage(): void {
    try {
      const savedMessages = sessionStorage.getItem(this.STORAGE_KEY_MESSAGES);
      const savedPreview = sessionStorage.getItem(this.STORAGE_KEY_PREVIEW);

      if (savedMessages) {
        this.messages = JSON.parse(savedMessages);
        console.log(`Loaded messages for user ${this.currentUserId}:`, this.messages.length);
      }

      if (savedPreview) {
        this.previewDataList = JSON.parse(savedPreview);
        console.log(`Loaded preview data for user ${this.currentUserId}:`, this.previewDataList.length);
      }

      // Nếu chưa có message nào, thêm welcome message
      if (this.messages.length === 0) {
        this.addWelcomeMessage();
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
      this.messages = [];
      this.previewDataList = [];
      this.addWelcomeMessage();
    }
  }

  // Save data to sessionStorage
  private saveToStorage(): void {
    try {
      sessionStorage.setItem(this.STORAGE_KEY_MESSAGES, JSON.stringify(this.messages));
      sessionStorage.setItem(this.STORAGE_KEY_PREVIEW, JSON.stringify(this.previewDataList));
      console.log(`Saved to storage for user ${this.currentUserId} - Messages:`, this.messages.length, 'Previews:', this.previewDataList.length);
    } catch (error) {
      console.error('Error saving to storage:', error);
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
      '   • "Luyện tập kỹ năng Listening, Reading, Speaking, Writing"\n' +
      '   • "Phân tích điểm mạnh, điểm yếu trong quá trình học"\n\n' +
      '⚠️ **Lưu ý:**\n' +
      '   • AI có thể tạo tối đa 30 câu hỏi mỗi lần\n' +
      '   • Số lượng câu hỏi tối thiểu là 10 câu\n\n' +
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
    this.resetPreviewSelectors();
  }

  togglePreview() {
    this.showPreview = !this.showPreview;
    
    // If closing preview, reset selectors
    if (!this.showPreview) {
      this.resetPreviewSelectors();
    }
  }

  // Helper function to reset preview selectors
  private resetPreviewSelectors() {
    // Trigger reset trong preview panel component
    // Sẽ được xử lý bởi ngOnDestroy hoặc ngOnChanges
    console.log('Closing preview - selectors will reset');
  }

  sendMessage(content: string) {
    if (!content.trim()) return;

    this.addUserMessage(content.trim());
    
    const isExamRequest = this.detectExamRequest(content);
    
    if (isExamRequest) {
      this.addAssistantMessage('Đang tạo đề,vui lòng đợi...');
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
          const previewId = `preview_${Date.now()}`;
          
          const previewItem: PreviewDataItem = {
            id: previewId,
            data: response.data,
            examInfo: response.examInfo,
            timestamp: new Date()
          };
          this.previewDataList.push(previewItem);
          
          this.previewData = response.data;
          this.currentPreviewId = previewId;
          this.showPreview = true;
          
          this.addAssistantMessage(
            `✅ **Đã tạo xong!**\n\n` +
            `📋 ${response.examInfo.examTitle}\n` +
            `🎯 ${response.examInfo.skill} - ${response.examInfo.partLabel}\n` +
            `📊 ${response.examInfo.totalQuestions} câu hỏi trong ${response.examInfo.promptCount} prompt\n\n` +
            `👉 Xem chi tiết bên phải →`,
            previewId
          );
          
          this.saveToStorage();
        } else {
          // Simple: Just get the message (already plain text)
          const displayMessage = response.message || 'Không có phản hồi';
          this.addAssistantMessage(displayMessage);
        }
        
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error:', error);
        this.removeLoadingMessage();
        
        let errorMessage = 'Có lỗi xảy ra, vui lòng thử lại sau!';
        
        if (error.error?.error?.message) {
          errorMessage = error.error.error.message;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.addAssistantMessage(
          `❌ **Lỗi!**\n\n${errorMessage}\n\nVui lòng thử lại sau! 🙏`
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
      this.resetPreviewSelectors();
    }
  }

  // Handle saving state from preview panel
  onSavingStateChange(isSaving: boolean): void {
    this.isSaving = isSaving;
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
    
    // Save to storage after each message
    this.saveToStorage();
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
    
    // Save to storage after each message
    this.saveToStorage();
  }

  private removeLoadingMessage(): void {
    if (this.messages.length > 0) {
      const lastMessage = this.messages[this.messages.length - 1];
      if (lastMessage.content.startsWith('Đang tạo đề')) {
        this.messages.pop();
        this.saveToStorage();
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
    
    sessionStorage.removeItem(this.STORAGE_KEY_MESSAGES);
    sessionStorage.removeItem(this.STORAGE_KEY_PREVIEW);
    
    this.addWelcomeMessage();
  }
}