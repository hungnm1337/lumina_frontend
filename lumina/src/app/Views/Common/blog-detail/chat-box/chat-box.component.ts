import { Component, Input, ViewEncapsulation, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { UserNoteService, QuickAskRequestDTO } from '../../../../Services/UserNote/user-note.service';
import { ChatMessageDTO, ChatRequestDTO } from '../../../../Interfaces/UserNote/UserNote.interface';
import { AuthService } from '../../../../Services/Auth/auth.service';

@Component({
  selector: 'app-chat-box',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-box.component.html',
  styleUrls: ['./chat-box.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ChatBoxComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef;

  constructor(
    private userNoteService: UserNoteService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  @Input() contentArticle: string = '';
  // Chat state
  messages: ChatMessageDTO[] = [];
  question: string = '';
  context: string = '';
  loading: boolean = false;
  errorMessage: string | null = null;

  // small UX: choose mode between quick ask and full ask
  useQuickAsk: boolean = true;

  // Toggle chat window visibility
  isChatOpen: boolean = false;

  // LocalStorage key
  private readonly STORAGE_KEY = 'lumina_chat_history';
  private shouldScroll = false;

  ngOnInit() {
    this.loadChatHistory();
  }

  ngOnDestroy() {
    this.saveChatHistory();
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  /**
   * Load chat history from localStorage
   */
  private loadChatHistory() {
    try {
      const savedHistory = localStorage.getItem(this.STORAGE_KEY);
      if (savedHistory) {
        this.messages = JSON.parse(savedHistory);
        console.log('💾 Loaded chat history:', this.messages.length, 'messages');
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  /**
   * Save chat history to localStorage
   */
  private saveChatHistory() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.messages));
      console.log('💾 Saved chat history:', this.messages.length, 'messages');
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }

  /**
   * Scroll to bottom of messages container
   */
  private scrollToBottom() {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (error) {
      console.error('Error scrolling to bottom:', error);
    }
  }


  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen) {
      // Scroll to bottom when opening chat
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  sendQuickAsk() {
    this.errorMessage = null;
    const text = this.question?.trim();
    if (!text) return;

    const request: QuickAskRequestDTO = {
      Question: text,
      Context: this.contentArticle || this.context || '',
      UserId: Number(this.authService.getCurrentUser()?.id) || null,
    };

    console.log('📤 Sending QuickAskRequest:', request);
    console.log('   - Question:', request.Question);
    console.log('   - Context length:', request.Context.length);
    console.log('   - UserId:', request.UserId);

    this.pushMessage('user', text);
    this.question = '';
    this.loading = true;

    this.userNoteService.quickAsk(request).subscribe({
      next: (res) => {
        console.log('📥 Received QuickAskResponse:', res);
        // Backend returns camelCase (lowercase first letter)
        const success = res.success ?? res.Success ?? false;
        const answer = res.answer || res.Answer || '';
        const suggestions = res.suggestedQuestions || res.SuggestedQuestions || [];

        if (res && success) {
          this.pushMessage('assistant', answer);
          if (suggestions.length) {
            this.pushMessage('assistant', '💡 Gợi ý câu hỏi: ' + suggestions.join(' | '));
          }
        } else {
          this.errorMessage = 'Không nhận được câu trả lời từ AI.';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ AI Chat Error:', err);

        // Handle 500 error with backend error message
        if (err.status === 500 && err.error) {
          const errorMsg = err.error.answer || err.error.message || err.error.errorMessage;
          if (errorMsg) {
            this.pushMessage('assistant', '⚠️ ' + errorMsg);
          } else {
            this.pushMessage('assistant', '⚠️ Xin lỗi, hệ thống AI đang gặp sự cố. Vui lòng thử lại sau.');
          }
        } else {
          this.errorMessage = err?.error?.message || 'Lỗi kết nối đến dịch vụ AI.';
        }

        this.loading = false;
      }
    });
  }

  sendWithContext() {
    this.errorMessage = null;
    const text = this.question?.trim();
    if (!text) return;

    const request: ChatRequestDTO = {
      UserQuestion: text,
      LessonContent: this.contentArticle || this.context || '',
    };

    console.log('📤 Sending ChatRequest:', request);
    console.log('   - UserQuestion:', request.UserQuestion);
    console.log('   - LessonContent length:', request.LessonContent.length);

    this.pushMessage('user', text);
    this.question = '';
    this.loading = true;

    this.userNoteService.askQuestion(request).subscribe({
      next: (res) => {
        console.log('📥 Received ChatResponse:', res);
        if (res && res.Success) {
          this.pushMessage('assistant', res.Answer || '');
        } else {
          this.errorMessage = res?.ErrorMessage || 'AI trả về lỗi.';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ AI Chat Error:', err);

        // Handle 500 error with backend error message
        if (err.status === 500 && err.error) {
          const errorMsg = err.error.answer || err.error.message || err.error.errorMessage;
          if (errorMsg) {
            this.pushMessage('assistant', '⚠️ ' + errorMsg);
          } else {
            this.pushMessage('assistant', '⚠️ Xin lỗi, hệ thống AI đang gặp sự cố. Vui lòng thử lại sau.');
          }
        } else {
          this.errorMessage = err?.error?.message || 'Lỗi kết nối đến dịch vụ AI.';
        }

        this.loading = false;
      }
    });
  }

  pushMessage(role: 'user' | 'assistant', content: string) {
    const newMessage: ChatMessageDTO = {
      Role: role,
      Content: content,
      Timestamp: new Date().toISOString(),
    };
    this.messages.push(newMessage);

    // Auto-save to localStorage after each message
    this.saveChatHistory();

    // Trigger scroll to bottom
    this.shouldScroll = true;

    console.log('💬 Message added:', role, '-', content.substring(0, 50) + '...');
  }

  clear() {
    this.messages = [];
    this.question = '';
    this.context = '';
    this.errorMessage = null;

    // Clear localStorage when clearing chat
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ Chat history cleared');
  }

  /**
   * Format message content: convert markdown-like syntax to HTML
   * Handles: **bold**, numbered lists, line breaks, horizontal rules
   */
  formatMessage(content: string): SafeHtml {
    if (!content) return '';

    let formatted = content
      // Replace --- with horizontal rule
      .replace(/^---$/gm, '<hr class="my-2"/>')
      // Replace **text** at start of line with bold heading (no extra line break)
      .replace(/^\*\*(.+?)\*\*$/gm, '<div class="font-semibold mt-2 mb-1">$1</div>')
      // Replace **text** inline with bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Replace numbered list items (1., 2., etc) with styled list items
      .replace(/^(\d+\.\s+)(.+)$/gm, '<div class="ml-4 my-1"><span class="font-semibold text-blue-600">$1</span>$2</div>')
      // Replace bullet points (- or *) with styled bullets
      .replace(/^[-*]\s+(.+)$/gm, '<div class="ml-4 my-1">• $1</div>')
      // Replace double newlines with paragraph breaks
      .replace(/\n\n/g, '<br/><br/>')
      // Replace single newlines with line breaks
      .replace(/\n/g, '<br/>');

    return this.sanitizer.sanitize(1, formatted) || '';
  }
}
