import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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

  currentMessage = '';
  isGenerating = false;
  conversationType = 'general';
  showSaveButton = false;
  generatedVocabularies: GeneratedVocabularyDTO[] = [];
  vocabularyImageUrl: string | null = null;

  showFolderModal = false;
  folderName = 'Vocabulary Folder';
  pendingVocabularies: GeneratedVocabularyDTO[] = [];
  isSaving = false;
  imageLoadingStates: Map<string, boolean> = new Map();

  // Rate limiting & spam prevention
  private lastMessageTime: number = 0;
  private readonly MESSAGE_COOLDOWN = 1000; // 1 second cooldown
  private isProcessing = false;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
  }

  async sendMessage(): Promise<void> {
    if (!this.currentMessage.trim() || this.isGenerating || this.isProcessing) return;

    // Rate limiting check
    const now = Date.now();
    if (now - this.lastMessageTime < this.MESSAGE_COOLDOWN) {
      this.toastService.warning('Vui lòng đợi một chút trước khi gửi tin nhắn tiếp theo!');
      return;
    }

    this.isProcessing = true;
    this.lastMessageTime = now;

    const userMessage: ChatMessage = {
      type: 'user',
      content: this.currentMessage,
      timestamp: new Date()
    };

    this.messages.push(userMessage);
    this.messageAdded.emit(userMessage);

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
        if (response.conversationType === 'out_of_scope') {
          this.toastService.info('Tôi chỉ hỗ trợ về TOEIC và học tiếng Anh thôi nhé!');
        }

        let answerText = response.answer || '';

        if (response.vocabularies && response.vocabularies.length > 0) {
          answerText = '';
        } else {
          if (answerText.includes('"word"') || answerText.includes('"definition"') ||
            answerText.includes('"example"') || answerText.includes('"typeOfWord"') ||
            answerText.includes('"vocabularies"') || answerText.trim().startsWith('{')) {
            answerText = '';
          }
        }

        const formattedContent = answerText ? this.formatAIResponse(answerText) : '';

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
          imageUrl: response.imageUrl
        };

        this.messages.push(aiMessage);
        this.messageAdded.emit(aiMessage);

        this.conversationType = response.conversationType;

        if (response.vocabularies && response.vocabularies.length > 0) {
          console.log(`✅ Received ${response.vocabularies.length} vocabularies from backend`);

          const vocabWithImage = response.vocabularies.filter(v => v.imageUrl && v.imageUrl.trim() !== '').length;
          const vocabWithoutImage = response.vocabularies.length - vocabWithImage;
          console.log(`📊 Vocabularies with images: ${vocabWithImage}, without: ${vocabWithoutImage}`);

          if (response.vocabularies.length > 0) {
            console.log('Sample vocabulary:', {
              word: response.vocabularies[0].word,
              hasImageUrl: !!response.vocabularies[0].imageUrl,
              imageUrl: response.vocabularies[0].imageUrl?.substring(0, 50) + '...'
            });
          }

          this.generatedVocabularies = response.vocabularies;
          this.vocabularyImageUrl = response.imageUrl || null;
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
      this.isProcessing = false;
    }
  }

  setConversationType(type: string): void {
    this.conversationType = type;
    this.showSaveButton = false;
    this.generatedVocabularies = [];
    this.vocabularyImageUrl = null;
  }

  async saveVocabularies(vocabularies?: GeneratedVocabularyDTO[]): Promise<void> {
    const vocabToSave = vocabularies || this.generatedVocabularies;

    if (!vocabToSave || vocabToSave.length === 0) {
      this.toastService.warning('Không có từ vựng để lưu!');
      return;
    }

    this.pendingVocabularies = vocabToSave;
    this.folderName = 'Vocabulary Folder';
    this.showFolderModal = true;
  }

  closeFolderModal(): void {
    this.showFolderModal = false;
    this.pendingVocabularies = [];
    this.folderName = 'Vocabulary Folder';
  }

  async confirmSaveFolder(): Promise<void> {
    const trimmedName = this.folderName?.trim() || '';

    // Validation: Empty check
    if (!trimmedName) {
      this.toastService.warning('Vui lòng nhập tên folder!');
      return;
    }

    // Validation: Max length
    if (trimmedName.length > 100) {
      this.toastService.warning('Tên folder không được vượt quá 100 ký tự!');
      return;
    }

    // Validation: Pattern check (optional - allow alphanumeric, spaces, and common punctuation)
    const validPattern = /^[a-zA-Z0-9\s._-]+$/;
    if (!validPattern.test(trimmedName)) {
      this.toastService.warning('Tên folder chỉ được chứa chữ, số, khoảng trắng và ký tự . _ -');
      return;
    }

    const folderName = trimmedName;
    const vocabToSave = this.pendingVocabularies;

    this.isSaving = true;

    try {
      const userId = this.authService.getCurrentUserId();
      if (!userId) {
        this.toastService.error('Vui lòng đăng nhập để lưu từ vựng!');
        this.closeFolderModal();
        return;
      }

      const vocabWithImage = vocabToSave.filter(v => v.imageUrl && v.imageUrl.trim() !== '').length;
      const vocabWithoutImage = vocabToSave.length - vocabWithImage;
      console.log(`💾 Preparing to save ${vocabToSave.length} vocabularies`);
      console.log(`📊 Vocabularies with images: ${vocabWithImage}, without: ${vocabWithoutImage}`);

      if (vocabToSave.length > 0) {
        console.log('Sample vocabulary to save:', {
          word: vocabToSave[0].word,
          hasImageUrl: !!vocabToSave[0].imageUrl,
          imageUrl: vocabToSave[0].imageUrl?.substring(0, 50) + '...'
        });
      }

      const request: SaveVocabularyRequestDTO = {
        userId: userId,
        folderName: folderName,
        vocabularies: vocabToSave,
        imageUrl: this.vocabularyImageUrl || undefined
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

        this.closeFolderModal();

        this.showSaveButton = false;
        this.generatedVocabularies = [];
        this.vocabularyImageUrl = null;

        const confirmMessage: ChatMessage = {
          type: 'ai',
          content: response.message,
          timestamp: new Date(),
          conversationType: this.conversationType
        };

        this.messages.push(confirmMessage);
        this.messageAdded.emit(confirmMessage);

        const currentUrl = this.router.url;
        const isOnVocabularyPage = currentUrl.startsWith('/vocabulary') && !currentUrl.includes('/vocabulary/list/');

        if (isOnVocabularyPage) {
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } else {
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
        }
      } else {
        this.toastService.error('Lưu từ vựng thất bại. Vui lòng thử lại!');
      }

    } catch (error: any) {
      console.error('Error saving vocabularies:', error);
      const errorMessage = error?.error?.message || error?.message || 'Lỗi khi lưu từ vựng!';
      this.toastService.error(errorMessage);
    } finally {
      this.isSaving = false;
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
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  formatAIResponse(content: string): string {
    let formatted = content;

    formatted = formatted.replace(/\*\*Giải thích:\*\*/g, '📚 **Giải thích:**');
    formatted = formatted.replace(/\*\*Ví dụ trong tiếng Anh:\*\*/g, '💡 **Ví dụ trong tiếng Anh:**');
    formatted = formatted.replace(/\*\*Ngữ cảnh TOEIC:\*\*/g, '🎯 **Ngữ cảnh TOEIC:**');
    formatted = formatted.replace(/\*\*Mẹo ghi nhớ:\*\*/g, '💭 **Mẹo ghi nhớ:**');
    formatted = formatted.replace(/\*\*Từ vựng liên quan:\*\*/g, '🔗 **Từ vựng liên quan:**');
    formatted = formatted.replace(/\*\*Cách sử dụng:\*\*/g, '📝 **Cách sử dụng:**');
    formatted = formatted.replace(/\*\*Lưu ý:\*\*/g, '⚠️ **Lưu ý:**');
    formatted = formatted.replace(/\*\*Tips:\*\*/g, '🎯 **Tips:**');

    formatted = formatted.replace(/(\d+\.\s*[^:]+:)/g, '🎯 **$1**');
    formatted = formatted.replace(/^(\d+\.\s*[^:]+:)/gm, '🎯 **$1**');

    formatted = formatted.replace(/^\* /gm, '• ');
    formatted = formatted.replace(/^- /gm, '• ');

    formatted = formatted.replace(/'([^']+)'/g, '**"$1"**');

    formatted = formatted.replace(/\b(acquire|merger|negotiate|revenue|expenditure|profitability|strategy|outsource|investment|cost-cutting)\b/g, '**$1**');

    if (formatted.includes('Bạn có thể gặp') || formatted.includes('bạn có thể gặp')) {
      formatted = formatted.replace(/(Bạn có thể gặp[^:]*:)/g, '🔍 $1');
    }

    formatted = formatted.replace(/(\*\*[^*]+\*\*):/g, '📌 $1:');

    formatted = formatted.replace(/(Ví dụ[^:]*:)/g, '💡 **$1**');
    formatted = formatted.replace(/(Tương tự[^:]*:)/g, '🔄 **$1**');

    formatted = formatted.replace(/(Wall Street Journal|Financial Times|báo kinh tế)/g, '📰 **$1**');

    formatted = formatted.replace(/(Contextual Learning|Related Word Groups|Spaced Repetition|flashcards)/g, '🎓 **$1**');

    formatted = formatted.replace(/(Tóm lại|Kết luận|Chúc bạn)/g, '🎉 **$1**');

    return formatted;
  }

  handleImageError(event: Event, vocab: GeneratedVocabularyDTO): void {
    vocab.imageError = true;
    this.imageLoadingStates.set(vocab.word, false);
    console.warn(`Failed to load image for vocabulary: ${vocab.word}`, event);
  }

  onImageLoad(vocab: GeneratedVocabularyDTO): void {
    this.imageLoadingStates.set(vocab.word, false);
  }

  isImageLoading(vocab: GeneratedVocabularyDTO): boolean {
    if (!vocab.imageUrl) return false;
    return this.imageLoadingStates.get(vocab.word) ?? true;
  }

  // Sanitize HTML content to prevent XSS
  getSafeHtml(content: string): SafeHtml {
    return this.sanitizer.sanitize(1, content) || ''; // 1 = SecurityContext.HTML
  }

  formatMessageContent(content: string): string {
    let formatted = content;

    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #4F46E5; font-weight: 600;">$1</strong>');

    formatted = formatted.replace(/\*([^*]+)\*/g, '<em style="color: #6B7280;">$1</em>');

    formatted = formatted.replace(/^• (.+)$/gm, '<li style="margin: 8px 0; padding-left: 8px;">$1</li>');
    formatted = formatted.replace(/(<li style="margin: 8px 0; padding-left: 8px;">.*<\/li>)/s, '<ul style="margin: 12px 0; padding-left: 20px;">$1</ul>');

    formatted = formatted.replace(/^(\d+\.\s*[^:]+:)/gm, '<div style="background: #F3F4F6; padding: 12px; margin: 8px 0; border-radius: 8px; border-left: 4px solid #4F46E5;">$1</div>');

    formatted = formatted.replace(/\n/g, '<br>');

    formatted = formatted.replace(/(<br>){2,}/g, '</p><p style="margin: 16px 0; line-height: 1.6;">');
    formatted = '<p style="margin: 0; line-height: 1.6;">' + formatted + '</p>';

    formatted = formatted.replace(/(Ví dụ[^:]*:)/g, '<div style="background: #FEF3C7; padding: 12px; margin: 12px 0; border-radius: 8px; border-left: 4px solid #F59E0B;"><strong>$1</strong></div>');

    formatted = formatted.replace(/(Tips[^:]*:)/g, '<div style="background: #ECFDF5; padding: 12px; margin: 12px 0; border-radius: 8px; border-left: 4px solid #10B981;"><strong>$1</strong></div>');

    return formatted;
  }
}
