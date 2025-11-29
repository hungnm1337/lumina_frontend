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
  vocabularyImageUrl: string | null = null; // URL ảnh từ AI

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Không thêm welcome message ở đây nữa vì đã được quản lý bởi FloatingChatComponent
    // Messages sẽ được truyền vào qua @Input từ FloatingChatComponent
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
        
        // Xử lý answer text - đảm bảo không có raw JSON
        // Backend đã parse JSON rồi, nên không cần parse lại ở đây
        let answerText = response.answer || '';
        
        // Nếu có vocabularies, không cần hiển thị answer text (sẽ hiển thị trong vocabulary list)
        if (response.vocabularies && response.vocabularies.length > 0) {
          // Set answer text rỗng để chỉ hiển thị vocabulary list
          answerText = '';
        } else {
          // Loại bỏ bất kỳ JSON fragments nào còn sót lại (phòng trường hợp backend chưa xử lý hết)
          if (answerText.includes('"word"') || answerText.includes('"definition"') || 
              answerText.includes('"example"') || answerText.includes('"typeOfWord"') ||
              answerText.includes('"vocabularies"') || answerText.trim().startsWith('{')) {
            answerText = ''; // Nếu có vẻ như là JSON, set rỗng
          }
        }
        
        // Format câu trả lời AI (chỉ format nếu có text)
        const formattedContent = answerText ? this.formatAIResponse(answerText) : '';
        
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
          hasSaveOption: response.hasSaveOption,
          imageUrl: response.imageUrl // Lưu URL ảnh vào message
        };
        
        this.messages.push(aiMessage);
        this.messageAdded.emit(aiMessage); // Emit tin nhắn AI

        // Cập nhật loại cuộc trò chuyện
        this.conversationType = response.conversationType;

        // Nếu có từ vựng được tạo
        if (response.vocabularies && response.vocabularies.length > 0) {
          console.log(`✅ Received ${response.vocabularies.length} vocabularies from backend`);
          
          // Log số lượng vocabularies có imageUrl
          const vocabWithImage = response.vocabularies.filter(v => v.imageUrl && v.imageUrl.trim() !== '').length;
          const vocabWithoutImage = response.vocabularies.length - vocabWithImage;
          console.log(`📊 Vocabularies with images: ${vocabWithImage}, without: ${vocabWithoutImage}`);
          
          // Log một vài vocabularies để kiểm tra
          if (response.vocabularies.length > 0) {
            console.log('Sample vocabulary:', {
              word: response.vocabularies[0].word,
              hasImageUrl: !!response.vocabularies[0].imageUrl,
              imageUrl: response.vocabularies[0].imageUrl?.substring(0, 50) + '...'
            });
          }
          
          this.generatedVocabularies = response.vocabularies;
          this.vocabularyImageUrl = response.imageUrl || null; // Lưu URL ảnh từ AI
          this.showSaveButton = true;
        } else {
          console.warn('⚠️ No vocabularies in response or empty array');
          console.log('Response:', response);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      this.toastService.error('Lỗi khi gửi tin nhắn!');
    } finally {
      this.isGenerating = false;
    }
  }

  setConversationType(type: string): void {
    this.conversationType = type;
    this.showSaveButton = false;
    this.generatedVocabularies = [];
    this.vocabularyImageUrl = null; // Reset image URL
  }

  async saveVocabularies(vocabularies?: GeneratedVocabularyDTO[]): Promise<void> {
    // Sử dụng vocabularies từ parameter hoặc từ this.generatedVocabularies
    const vocabToSave = vocabularies || this.generatedVocabularies;
    
    if (!vocabToSave || vocabToSave.length === 0) {
      this.toastService.warning('Không có từ vựng để lưu!');
      return;
    }

    const folderName = prompt('Nhập tên folder cho từ vựng:', 'Vocabulary Folder');
    if (!folderName || folderName.trim() === '') {
      return;
    }

    try {
      const userId = this.authService.getCurrentUserId();
      if (!userId) {
        this.toastService.error('Vui lòng đăng nhập để lưu từ vựng!');
        return;
      }

      // Log vocabularies trước khi gửi
      const vocabWithImage = vocabToSave.filter(v => v.imageUrl && v.imageUrl.trim() !== '').length;
      const vocabWithoutImage = vocabToSave.length - vocabWithImage;
      console.log(`💾 Preparing to save ${vocabToSave.length} vocabularies`);
      console.log(`📊 Vocabularies with images: ${vocabWithImage}, without: ${vocabWithoutImage}`);
      
      // Log sample vocabulary để kiểm tra
      if (vocabToSave.length > 0) {
        console.log('Sample vocabulary to save:', {
          word: vocabToSave[0].word,
          hasImageUrl: !!vocabToSave[0].imageUrl,
          imageUrl: vocabToSave[0].imageUrl?.substring(0, 50) + '...'
        });
      }

      const request: SaveVocabularyRequestDTO = {
        userId: userId,
        folderName: folderName.trim(),
        vocabularies: vocabToSave, // Mỗi vocabulary đã có imageUrl riêng (Cloudinary URL)
        imageUrl: this.vocabularyImageUrl || undefined // Gửi URL ảnh folder nếu có (deprecated, giữ để backward compatibility)
      };

      console.log('Saving vocabularies request:', {
        userId: request.userId,
        folderName: request.folderName,
        vocabulariesCount: request.vocabularies.length,
        sampleVocab: request.vocabularies[0]
      });

      const response = await this.chatService.saveVocabularies(request).toPromise();

      if (response && response.success) {
        this.toastService.success(response.message);
        
        // Ẩn nút lưu
        this.showSaveButton = false;
        this.generatedVocabularies = [];
        this.vocabularyImageUrl = null; // Reset image URL

        // Thêm tin nhắn xác nhận
        const confirmMessage: ChatMessage = {
          type: 'ai',
          content: response.message,
          timestamp: new Date(),
          conversationType: this.conversationType
        };
        
        this.messages.push(confirmMessage);
        // Emit tin nhắn để lưu vào savedMessages của FloatingChatComponent
        this.messageAdded.emit(confirmMessage);

        // Điều hướng đến trang Từ vựng và highlight folder mới tạo
        // Delay một chút để đảm bảo message được emit trước khi navigate
        setTimeout(() => {
          try {
            const listId = response.vocabularyListId;
            if (listId) {
              this.router.navigate(['/vocabulary'], { queryParams: { highlight: listId } });
            } else {
              this.router.navigate(['/vocabulary']);
            }
          } catch (err) {
            console.error('Navigation error:', err);
          }
        }, 100);
      } else {
        this.toastService.error('Lưu từ vựng thất bại. Vui lòng thử lại!');
      }

    } catch (error: any) {
      console.error('Error saving vocabularies:', error);
      const errorMessage = error?.error?.message || error?.message || 'Lỗi khi lưu từ vựng!';
      this.toastService.error(errorMessage);
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

  handleImageError(event: Event, vocab: GeneratedVocabularyDTO): void {
    // Mark vocabulary as having image error
    vocab.imageError = true;
    console.warn(`Failed to load image for vocabulary: ${vocab.word}`, event);
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
