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
        this.currentRoute = event.url;
        // Đóng chatbox nếu chuyển sang trang không cho phép hiển thị
        if (!this.shouldShowChatbox) {
          this.isOpen = false;
        }
      });

    // Theo dõi trạng thái authentication
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
      // Đóng chatbox nếu đăng xuất
      if (!this.isAuthenticated) {
        this.isOpen = false;
      }
    });

    // Set route ban đầu
    this.currentRoute = this.router.url;
    
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

    // 2. Không hiển thị ở trang Articles-detail (articles/:id)
    // Route: /articles/:id (không phải /articles)
    if (this.currentRoute.match(/^\/articles\/\d+/)) {
      return false;
    }

    // 3. Không hiển thị khi đang làm bài thi
    // Route: /homepage/user-dashboard/exam/:id hoặc /homepage/user-dashboard/part/:id
    if (this.currentRoute.includes('/user-dashboard/exam/') || 
        this.currentRoute.includes('/user-dashboard/part/')) {
      return false;
    }

    return true;
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