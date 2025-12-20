import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ChatComponent } from '../../User/chat/chat.component';
import { ChatMessage } from '../../../Interfaces/Chat/ChatResponseDTO.interface';
import { AuthService } from '../../../Services/Auth/auth.service';

@Component({
  selector: 'app-floating-chat',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  templateUrl: './floating-chat.component.html',
  styleUrls: ['./floating-chat.component.scss']
})
export class FloatingChatComponent implements OnInit, OnDestroy {
  isOpen = false;
  private isProcessingMessage = false;
  private routerSubscription?: Subscription;
  private authSubscription?: Subscription;
  currentRoute = '';
  isAuthenticated = false;
  
  // Lưu trữ tin nhắn trong memory
  savedMessages: ChatMessage[] = [];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    // Khởi tạo tin nhắn chào mừng nếu chưa có
    this.initializeWelcomeMessage();
  }

  ngOnInit() {
    // Theo dõi thay đổi route
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Lấy pathname (bỏ query params) để so sánh
        const urlWithoutQuery = event.url.split('?')[0];
        const previousRoute = this.currentRoute;
        this.currentRoute = urlWithoutQuery;
        
        // Kiểm tra xem có phải đang ở trang vocabulary không
        const isVocabularyPage = this.currentRoute === '/vocabulary' || this.currentRoute.startsWith('/vocabulary/');
        const wasVocabularyPage = previousRoute === '/vocabulary' || previousRoute.startsWith('/vocabulary/');
        
        // Nếu chuyển từ vocabulary sang vocabulary (có thể có query params), giữ nguyên trạng thái mở
        // Chỉ đóng nếu chuyển sang trang khác (không phải vocabulary)
        if (!isVocabularyPage) {
          this.isOpen = false;
        }
        // Nếu vẫn ở trang vocabulary, giữ nguyên trạng thái isOpen
      });

    // Theo dõi trạng thái authentication
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
      // Đóng chatbox nếu đăng xuất
      if (!this.isAuthenticated) {
        this.isOpen = false;
      }
    });

    // Set route ban đầu (bỏ query params)
    this.currentRoute = this.router.url.split('?')[0];
    
    // Set authentication state ban đầu
    this.isAuthenticated = !!this.authService.getCurrentUser();
    
    // Đóng chatbox nếu route ban đầu không cho phép
    if (!this.shouldShowChatbox) {
      this.isOpen = false;
    }
  }

  ngOnDestroy() {
    this.routerSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
  }

  // Kiểm tra xem có nên hiển thị chatbox không
  get shouldShowChatbox(): boolean {
    // 1. Không hiển thị nếu chưa đăng nhập
    if (!this.isAuthenticated) {
      return false;
    }

    // 2. Chỉ hiển thị ở trang vocabulary
    // Route: /vocabulary hoặc /vocabulary/list/:id
    if (this.currentRoute === '/vocabulary' || this.currentRoute.startsWith('/vocabulary/')) {
      return true;
    }

    return false;
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
        content: '**Xin chào! Tôi là AI Assistant**\n\nTôi có thể giúp bạn:\n\n**Tư vấn & Hỗ trợ:**\n• Cách học TOEIC hiệu quả?\n• Luyện tập kỹ năng Listening, Reading, Speaking, Writing\n• Phân tích điểm mạnh, điểm yếu trong quá trình học\n\n**Lưu ý:**\n• AI có thể tạo tối đa 30 câu hỏi mỗi lần\n• Số lượng câu hỏi tối thiểu là 10 câu\n\n**Tips**: Mô tả càng chi tiết, kết quả càng tốt!\n\nBạn muốn tôi giúp gì nào? 😊',
        timestamp: new Date(),
        conversationType: 'general'
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