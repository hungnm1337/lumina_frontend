import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../Services/Chat/chat.service';
import { AuthService } from '../../../Services/Auth/auth.service';
import { ToastService } from '../../../Services/Toast/toast.service';
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
  messages: ChatMessage[] = [];
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
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Thêm tin nhắn chào mừng
    this.messages.push({
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

  ngOnDestroy(): void {
    // Cleanup nếu cần
  }

  async sendMessage(): Promise<void> {
    if (!this.currentMessage.trim() || this.isGenerating) return;

    // Thêm tin nhắn user
    this.messages.push({
      type: 'user',
      content: this.currentMessage,
      timestamp: new Date()
    });

    this.isGenerating = true;
    const userMessage = this.currentMessage;
    this.currentMessage = '';

    try {
      const request: ChatRequestDTO = {
        message: userMessage,
        userId: this.authService.getCurrentUserId(),
        conversationType: this.conversationType
      };

      const response = await this.chatService.askQuestion(request).toPromise();

      if (response) {
        // Format câu trả lời AI
        const formattedContent = this.formatAIResponse(response.answer);
        
        // Thêm tin nhắn AI
        this.messages.push({
          type: 'ai',
          content: formattedContent,
          timestamp: new Date(),
          conversationType: response.conversationType,
          suggestions: response.suggestions,
          examples: response.examples,
          relatedWords: response.relatedWords,
          vocabularies: response.vocabularies,
          hasSaveOption: response.hasSaveOption
        });

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
      
      // Xử lý lỗi và hiển thị thông báo thân thiện
      let errorMessage = 'Xin lỗi, tôi không thể xử lý câu hỏi này lúc này. Vui lòng thử lại sau.';
      
      // Thêm tin nhắn lỗi vào chat
      this.messages.push({
        type: 'ai',
        content: errorMessage,
        timestamp: new Date()
      });
      
      this.toastService.error('Có lỗi xảy ra, vui lòng thử lại!');
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

    // Thêm emoji cho các heading chính
    formatted = formatted.replace(/### (\d+\.\s*[^#\n]+)/g, '🎯 **$1**');
    formatted = formatted.replace(/## ([^#\n]+)/g, '📚 **$1**');
    formatted = formatted.replace(/# ([^#\n]+)/g, '🌟 **$1**');

    // Thêm emoji cho các subsection
    formatted = formatted.replace(/\*\*(\d+\.\s*[^*]+):\*\*/g, '📌 **$1:**');
    formatted = formatted.replace(/\*\*([^:]+):\*\*/g, '💡 **$1:**');

    // Thêm emoji cho các bullet points
    formatted = formatted.replace(/^\* /gm, '• ');
    formatted = formatted.replace(/^- /gm, '• ');

    // Thêm emoji cho các loại câu hỏi
    formatted = formatted.replace(/Hỏi thăm chung chung:/g, '💬 **Hỏi thăm chung chung:**');
    formatted = formatted.replace(/Hỏi thăm khi biết có chuyện cụ thể:/g, '🎯 **Hỏi thăm khi biết có chuyện cụ thể:**');
    formatted = formatted.replace(/Bày tỏ sự cảm thông:/g, '🤗 **Bày tỏ sự cảm thông:**');
    formatted = formatted.replace(/Đề nghị giúp đỡ và hỗ trợ:/g, '🤝 **Đề nghị giúp đỡ và hỗ trợ:**');
    formatted = formatted.replace(/Khích lệ và động viên:/g, '💪 **Khích lệ và động viên:**');
    formatted = formatted.replace(/Ứng dụng trong TOEIC:/g, '🎓 **Ứng dụng trong TOEIC:**');

    // Thêm emoji cho các ví dụ
    formatted = formatted.replace(/Ví dụ:/g, '💡 **Ví dụ:**');

    // Format các từ khóa quan trọng
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '**$1**');

    // Thêm emoji cho các câu hỏi
    if (formatted.includes('Bạn có thể gặp') || formatted.includes('bạn có thể gặp')) {
      formatted = formatted.replace(/(Bạn có thể gặp[^:]*:)/g, '🔍 $1');
    }

    return formatted;
  }

  formatMessageContent(content: string): string {
    // Convert markdown-style formatting to HTML
    let formatted = content;

    // Convert **bold** to <strong>
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Convert *italic* to <em>
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Convert bullet points to HTML list
    formatted = formatted.replace(/^• (.+)$/gm, '<li>$1</li>');
    
    // Group consecutive list items into ul tags
    formatted = formatted.replace(/(<li>.*<\/li>)(\s*<li>.*<\/li>)*/gs, (match) => {
      return '<ul>' + match + '</ul>';
    });

    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    // Convert multiple line breaks to paragraphs
    formatted = formatted.replace(/(<br>){2,}/g, '</p><p>');
    formatted = '<p>' + formatted + '</p>';

    // Clean up empty paragraphs
    formatted = formatted.replace(/<p><\/p>/g, '');
    formatted = formatted.replace(/<p>\s*<\/p>/g, '');

    return formatted;
  }
}
