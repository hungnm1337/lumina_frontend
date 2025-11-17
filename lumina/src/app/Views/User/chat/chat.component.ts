import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../Services/Chat/chat.service';
import { AuthService } from '../../../Services/Auth/auth.service';
import { ToastService } from '../../../Services/Toast/toast.service';
import { Router } from '@angular/router';
import { 
  ChatRequestDTO, 
  ChatResponseDTO, 
  ChatMessage, 
  GeneratedVocabularyDTO,
  SaveVocabularyRequestDTO 
} from '../../../Interfaces/Chat/ChatResponseDTO.interface';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  @Input() messages: ChatMessage[] = [];
  @Output() messageAdded = new EventEmitter<ChatMessage>();
  
  // messages: ChatMessage[] = []; // Removed, now using @Input
  currentMessage = '';
  isGenerating = false;
  conversationType = 'general';
  showSaveButton = false;
  generatedVocabularies: GeneratedVocabularyDTO[] = [];
  showSuggestedQuestions = true;

  // Các loại câu hỏi gợi ý
  suggestedQuestions: { [key: string]: string[] } = {
    vocabulary: [
      "Từ 'acquire' nghĩa là gì?",
      "Tạo 10 từ vựng về Business",
      "Phân biệt 'affect' và 'effect'",
      "Từ vựng TOEIC Part 5 thường gặp"
    ],
    grammar: [
      "Khi nào dùng Present Perfect?",
      "Phân biệt 'since' và 'for'",
      "Cách dùng Passive Voice",
      "Thì quá khứ đơn và quá khứ hoàn thành"
    ],
    toeic_strategy: [
      "Mẹo làm Part 5 nhanh",
      "Chiến lược làm Part 7",
      "Cách cải thiện Listening",
      "Quản lý thời gian trong TOEIC"
    ],
    practice: [
      "Tạo bài tập ngữ pháp",
      "Luyện tập từ vựng yếu",
      "Đề thi thử TOEIC",
      "Cách ôn tập hiệu quả"
    ]
  };

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Chỉ thêm tin nhắn chào mừng nếu chưa có messages từ input
    if (this.messages.length === 0) {
      this.messages.push({
        type: 'ai',
        content: '**Xin chào! Tôi là AI Assistant**\n\nTôi có thể giúp bạn:\n\n**Tư vấn & Hỗ trợ:**\n• Cách học TOEIC hiệu quả?\n• Giải thích cấu trúc câu này\n\n**Tips**: Mô tả càng chi tiết, kết quả càng tốt!\n\nBạn muốn tôi giúp gì nào? 😊',
        timestamp: new Date(),
        conversationType: 'general',
        suggestions: [
          'Tư vấn học TOEIC',
          'Giải thích ngữ pháp',
          'Chiến lược làm bài'
        ]
      });
    }
  }

  ngOnDestroy(): void {
    // Cleanup nếu cần
  }

  async sendMessage(): Promise<void> {
    if (!this.currentMessage.trim() || this.isGenerating) return;

    // Thêm tin nhắn user
    const userMessage: ChatMessage = {
      type: 'user',
      content: this.currentMessage,
      timestamp: new Date()
    };
    
    this.messages.push(userMessage);
    this.messageAdded.emit(userMessage); // Emit tin nhắn user

    this.isGenerating = true;
    const userMessageText = this.currentMessage;
    this.currentMessage = '';

    try {
      const request: ChatRequestDTO = {
        message: userMessageText,
        userId: this.authService.getCurrentUserId(),
        conversationType: this.conversationType
      };

      const response = await this.chatService.askQuestion(request).toPromise();

      if (response) {
        // Xử lý câu trả lời ngoài phạm vi TOEIC
        if (response.conversationType === 'out_of_scope') {
          this.toastService.info('Tôi chỉ hỗ trợ về TOEIC và học tiếng Anh thôi nhé!');
        }
        
        // Format câu trả lời AI
        const formattedContent = this.formatAIResponse(response.answer);
        
        // Thêm tin nhắn AI
        const aiMessage: ChatMessage = {
          type: 'ai',
          content: formattedContent,
          timestamp: new Date(),
          conversationType: response.conversationType,
          suggestions: response.suggestions,
          examples: response.examples,
          relatedWords: response.relatedWords,
          vocabularies: response.vocabularies,
          hasSaveOption: response.hasSaveOption
        };
        
        this.messages.push(aiMessage);
        this.messageAdded.emit(aiMessage); // Emit tin nhắn AI

        // Cập nhật loại cuộc trò chuyện
        this.conversationType = response.conversationType;

        // Nếu có từ vựng được tạo
        if (response.vocabularies && response.vocabularies.length > 0) {
          this.generatedVocabularies = response.vocabularies;
          this.showSaveButton = true;
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      this.toastService.error('Lỗi khi gửi tin nhắn!');
    } finally {
      this.isGenerating = false;
    }
  }

  selectSuggestedQuestion(question: string): void {
    this.currentMessage = question;
  }

  setConversationType(type: string): void {
    // Nếu click vào cùng tab đang active, ẩn hoàn toàn suggested questions
    if (this.conversationType === type) {
      this.showSuggestedQuestions = false;
    } else {
      // Nếu click vào tab khác, đổi conversation type và hiển thị suggested questions
      this.conversationType = type;
      this.showSuggestedQuestions = true;
    }
    
    this.showSaveButton = false;
    this.generatedVocabularies = [];
  }

  toggleSuggestedQuestions(): void {
    this.showSuggestedQuestions = !this.showSuggestedQuestions;
  }

  async saveVocabularies(): Promise<void> {
    if (this.generatedVocabularies.length === 0) return;

    const folderName = prompt('Nhập tên folder cho từ vựng:', 'Vocabulary Folder');
    if (!folderName) return;

    try {
      const request: SaveVocabularyRequestDTO = {
        userId: this.authService.getCurrentUserId(),
        folderName: folderName,
        vocabularies: this.generatedVocabularies
      };

      const response = await this.chatService.saveVocabularies(request).toPromise();

      if (response && response.success) {
        this.toastService.success(response.message);
        
        // Ẩn nút lưu
        this.showSaveButton = false;
        this.generatedVocabularies = [];

        // Thêm tin nhắn xác nhận
        this.messages.push({
          type: 'ai',
          content: response.message,
          timestamp: new Date()
        });

        // Điều hướng đến trang Từ vựng và highlight folder mới tạo
        try {
          const listId = response.vocabularyListId;
          if (listId) {
            this.router.navigate(['/vocabulary'], { queryParams: { highlight: listId } });
          } else {
            this.router.navigate(['/vocabulary']);
          }
        } catch {}
      }

    } catch (error) {
      console.error('Error saving vocabularies:', error);
      this.toastService.error('Lỗi khi lưu từ vựng!');
    }
  }

  getPlaceholderText(): string {
    switch (this.conversationType) {
      case 'vocabulary':
        return 'Hỏi về từ vựng TOEIC...';
      case 'grammar':
        return 'Hỏi về ngữ pháp...';
      case 'toeic_strategy':
        return 'Hỏi về chiến lược TOEIC...';
      case 'practice':
        return 'Hỏi về luyện tập...';
      default:
        return 'Hỏi về TOEIC...';
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onInput(event: any): void {
    // Auto-resize textarea
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  formatAIResponse(content: string): string {
    // Format câu trả lời AI với emoji và styling đẹp mắt
    let formatted = content;

    // Thêm emoji cho các section chính
    formatted = formatted.replace(/\*\*Giải thích:\*\*/g, '📚 **Giải thích:**');
    formatted = formatted.replace(/\*\*Ví dụ trong tiếng Anh:\*\*/g, '💡 **Ví dụ trong tiếng Anh:**');
    formatted = formatted.replace(/\*\*Ngữ cảnh TOEIC:\*\*/g, '🎯 **Ngữ cảnh TOEIC:**');
    formatted = formatted.replace(/\*\*Mẹo ghi nhớ:\*\*/g, '💭 **Mẹo ghi nhớ:**');
    formatted = formatted.replace(/\*\*Từ vựng liên quan:\*\*/g, '🔗 **Từ vựng liên quan:**');
    formatted = formatted.replace(/\*\*Cách sử dụng:\*\*/g, '📝 **Cách sử dụng:**');
    formatted = formatted.replace(/\*\*Lưu ý:\*\*/g, '⚠️ **Lưu ý:**');
    formatted = formatted.replace(/\*\*Tips:\*\*/g, '🎯 **Tips:**');

    // Format các phương pháp học tập
    formatted = formatted.replace(/(\d+\.\s*[^:]+:)/g, '🎯 **$1**');
    formatted = formatted.replace(/^(\d+\.\s*[^:]+:)/gm, '🎯 **$1**');

    // Thêm emoji cho các bullet points
    formatted = formatted.replace(/^\* /gm, '• ');
    formatted = formatted.replace(/^- /gm, '• ');

    // Format các từ khóa quan trọng trong ngoặc kép
    formatted = formatted.replace(/'([^']+)'/g, '**"$1"**');

    // Format các từ vựng tiếng Anh quan trọng
    formatted = formatted.replace(/\b(acquire|merger|negotiate|revenue|expenditure|profitability|strategy|outsource|investment|cost-cutting)\b/g, '**$1**');

    // Thêm emoji cho các câu hỏi
    if (formatted.includes('Bạn có thể gặp') || formatted.includes('bạn có thể gặp')) {
      formatted = formatted.replace(/(Bạn có thể gặp[^:]*:)/g, '🔍 $1');
    }

    // Thêm emoji cho các cụm từ quan trọng
    formatted = formatted.replace(/(\*\*[^*]+\*\*):/g, '📌 $1:');

    // Format các ví dụ câu
    formatted = formatted.replace(/(Ví dụ[^:]*:)/g, '💡 **$1**');
    formatted = formatted.replace(/(Tương tự[^:]*:)/g, '🔄 **$1**');

    // Format các nguồn tài liệu
    formatted = formatted.replace(/(Wall Street Journal|Financial Times|báo kinh tế)/g, '📰 **$1**');

    // Thêm emoji cho các phương pháp cụ thể
    formatted = formatted.replace(/(Contextual Learning|Related Word Groups|Spaced Repetition|flashcards)/g, '🎓 **$1**');

    // Format các phần kết luận
    formatted = formatted.replace(/(Tóm lại|Kết luận|Chúc bạn)/g, '🎉 **$1**');

    return formatted;
  }

  formatMessageContent(content: string): string {
    // Convert markdown-style formatting to HTML
    let formatted = content;

    // Convert **bold** to <strong> with better styling
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #4F46E5; font-weight: 600;">$1</strong>');

    // Convert *italic* to <em>
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em style="color: #6B7280;">$1</em>');

    // Convert bullet points to HTML list with better styling
    formatted = formatted.replace(/^• (.+)$/gm, '<li style="margin: 8px 0; padding-left: 8px;">$1</li>');
    formatted = formatted.replace(/(<li style="margin: 8px 0; padding-left: 8px;">.*<\/li>)/s, '<ul style="margin: 12px 0; padding-left: 20px;">$1</ul>');

    // Format numbered lists
    formatted = formatted.replace(/^(\d+\.\s*[^:]+:)/gm, '<div style="background: #F3F4F6; padding: 12px; margin: 8px 0; border-radius: 8px; border-left: 4px solid #4F46E5;">$1</div>');

    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    // Convert multiple line breaks to paragraphs with better spacing
    formatted = formatted.replace(/(<br>){2,}/g, '</p><p style="margin: 16px 0; line-height: 1.6;">');
    formatted = '<p style="margin: 0; line-height: 1.6;">' + formatted + '</p>';

    // Add special styling for examples
    formatted = formatted.replace(/(Ví dụ[^:]*:)/g, '<div style="background: #FEF3C7; padding: 12px; margin: 12px 0; border-radius: 8px; border-left: 4px solid #F59E0B;"><strong>$1</strong></div>');

    // Add special styling for tips
    formatted = formatted.replace(/(Tips[^:]*:)/g, '<div style="background: #ECFDF5; padding: 12px; margin: 12px 0; border-radius: 8px; border-left: 4px solid #10B981;"><strong>$1</strong></div>');

    return formatted;
  }
}
