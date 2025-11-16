import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { ArticleService } from '../../../Services/Article/article.service';
import { ArticleResponse, ArticleProgress } from '../../../Interfaces/article.interfaces';
import { ChatBoxComponent } from '../blog-detail/chat-box/chat-box.component';
import { NoteComponent } from '../blog-detail/note/note.component';
import { AuthService } from '../../../Services/Auth/auth.service';
interface BlogComment {
  id: number;
  author: {
    name: string;
    avatar: string;
    avatarColor: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  replies: number;
  isLiked: boolean;
}

interface BlogArticle {
  id: number;
  title: string;
  category: string;
  categoryColor: string;
  publishDate: string;
  readTime: string;
  author: {
    name: string;
    title: string;
    avatar: string;
    avatarColor: string;
    bio: string;
    articlesCount: number;
    followers: string;
    likes: string;
  };
  likes: number;
  shareText: string;
  introduction: string;
  content: {
    sections: {
      title: string;
      content: string;
      tips?: {
        title: string;
        items: string[];
      };
      resources?: {
        title: string;
        items: string[];
      };
      quote?: {
        text: string;
        author: string;
      };
    }[];
  };
  finalAdvice: {
    title: string;
    content: string;
  };
  tags: string[];
  commentsCount: number;
}

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, ChatBoxComponent, NoteComponent],
  templateUrl: './Articles-detail.component.html',
  styleUrls: ['./Articles-detail.component.scss']
})
export class BlogDetailComponent implements OnInit {
  article: ArticleResponse | null = null;
  isLoading: boolean = true;
  error: string = '';
  contentArticle : string = '';
  // Additional properties for UI
  articleLikes: number = 0;
  isFollowing: boolean = false;
  isLogin: boolean = false;
  
  // Progress tracking by sections
  currentSectionIndex: number = 0;
  completedSections: Set<number> = new Set();
  articleProgress: ArticleProgress | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private articleService: ArticleService
  ) { }

  ngOnInit(): void {
    this.loadArticle();
    this.isLogin = this.authService.getCurrentUser() !== null;
  }
  
  
  // Load existing progress
  loadArticleProgress(): void {
    if (!this.article || !this.isLogin) return;
    
    this.articleService.getUserArticleProgress([this.article.articleId]).subscribe({
      next: (progressList) => {
        if (progressList.length > 0) {
          this.articleProgress = progressList[0];
          // Restore completed sections based on progress
          this.restoreCompletedSections();
        }
      },
      error: (error) => {
        console.error('Error loading article progress:', error);
      }
    });
  }
  
  // Restore completed sections from progress
  restoreCompletedSections(): void {
    if (!this.article || !this.articleProgress) return;
    
    const totalSections = this.article.sections.length;
    const progressPercent = this.articleProgress.progressPercent;
    
    // Calculate how many sections should be completed
    const completedCount = Math.floor((progressPercent / 100) * totalSections);
    
    for (let i = 0; i < completedCount && i < totalSections; i++) {
      this.completedSections.add(i);
    }
    
    // Set current section to first uncompleted section
    this.currentSectionIndex = completedCount < totalSections ? completedCount : totalSections - 1;
    
    // Scroll to current section
    setTimeout(() => {
      this.scrollToCurrentSection();
    }, 100);
  }
  
  // Check if section can be accessed
  canAccessSection(sectionIndex: number): boolean {
    if (sectionIndex === 0) return true; // First section is always accessible
    return this.completedSections.has(sectionIndex - 1); // Can access if previous is completed
  }
  
  // Check if section is completed
  isSectionCompleted(sectionIndex: number): boolean {
    return this.completedSections.has(sectionIndex);
  }
  
  // Mark section as read
  markSectionAsRead(sectionIndex: number): void {
    if (!this.article) return;
    
    this.completedSections.add(sectionIndex);
    this.updateProgress();
    
    // Auto-scroll to next section if available
    if (sectionIndex < this.article.sections.length - 1) {
      setTimeout(() => {
        this.goToSection(sectionIndex + 1);
      }, 500);
    }
  }
  
  // Go to specific section
  goToSection(sectionIndex: number): void {
    if (!this.article || sectionIndex < 0 || sectionIndex >= this.article.sections.length) return;
    
    if (this.canAccessSection(sectionIndex)) {
      this.currentSectionIndex = sectionIndex;
      this.scrollToTop();
    }
  }
  
  // Previous section
  previousSection(): void {
    if (this.currentSectionIndex > 0) {
      this.currentSectionIndex--;
      this.scrollToTop();
    }
  }
  
  // Next section
  nextSection(): void {
    if (this.article && this.currentSectionIndex < this.article.sections.length - 1) {
      // Check if can access next section
      if (this.canAccessSection(this.currentSectionIndex + 1)) {
        this.currentSectionIndex++;
        this.scrollToTop();
      }
    }
  }
  
  // Scroll to top of article content
  scrollToTop(): void {
    const element = document.querySelector('.article-content');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  
  // Scroll to current section (legacy - keep for compatibility)
  scrollToCurrentSection(): void {
    this.scrollToTop();
  }
  
  // Update progress based on completed sections
  updateProgress(): void {
    if (!this.article || !this.isLogin) return;
    
    const totalSections = this.article.sections.length;
    const completedCount = this.completedSections.size;
    const progressPercent = Math.round((completedCount / totalSections) * 100);
    const status = progressPercent === 100 ? 'completed' : progressPercent > 0 ? 'in_progress' : 'not_started';
    
    // Save progress to backend
    this.articleService.saveArticleProgress(this.article.articleId, {
      progressPercent: progressPercent,
      status: status
    }).subscribe({
      next: (response) => {
        console.log('Progress saved successfully');
      },
      error: (error) => {
        console.error('Error saving progress:', error);
      }
    });
    
    // Update local progress
    this.articleProgress = {
      articleId: this.article.articleId,
      progressPercent: progressPercent,
      status: status as 'not_started' | 'in_progress' | 'completed',
      lastAccessedAt: new Date().toISOString(),
      completedAt: status === 'completed' ? new Date().toISOString() : undefined
    };
  }
  
  // Get progress percent
  getProgressPercent(): number {
    if (!this.article || !this.article.sections || this.article.sections.length === 0) {
      return 0;
    }
    const totalSections = this.article.sections.length;
    const completedCount = this.completedSections.size;
    return Math.round((completedCount / totalSections) * 100);
  }

  // Get section button class for navigator (giống exam)
  getSectionButtonClass(sectionIndex: number): string {
    if (this.currentSectionIndex === sectionIndex) {
      return 'active'; // Màu xanh - đang xem
    }
    if (this.isSectionCompleted(sectionIndex)) {
      return 'completed'; // Màu xanh lá - đã hoàn thành
    }
    if (this.canAccessSection(sectionIndex)) {
      return 'accessible'; // Màu xám - có thể truy cập
    }
    return 'locked'; // Màu xám nhạt - bị khóa
  }

  loadArticle(): void {
    this.isLoading = true;
    this.error = '';

    const articleId = this.route.snapshot.paramMap.get('id');
    if (!articleId) {
      this.error = 'Article not found';
      this.isLoading = false;
      return;
    }

    this.articleService.getArticleById(+articleId).subscribe({
      next: (article) => {
        this.article = article;
        this.articleLikes = 0;
        this.contentArticle = article.sections.map(section => section.sectionContent).join('\n\n');
        this.isLoading = false;
        
        // Initialize section tracking
        this.currentSectionIndex = 0;
        this.completedSections.clear();
        
        // Load existing progress after article is loaded
        if (this.isLogin) {
          setTimeout(() => {
            this.loadArticleProgress();
          }, 100);
        } else {
          // If not logged in, just scroll to first section
          setTimeout(() => {
            this.scrollToCurrentSection();
          }, 100);
        }
      },
      error: (error) => {
        console.error('Error loading article:', error);
        this.error = 'Unable to load article. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  goBackToBlog(): void {
    this.router.navigate(['/articles']);
  }

  onLikeArticle(): void {
    if (this.article) {
      this.articleLikes++;
    }
  }

  onShareArticle(): void {
    console.log('Sharing article...');
  }

  onFollowAuthor(): void {
    this.isFollowing = !this.isFollowing;
  }


  formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  getCategoryColor(categoryName: string): string {
    const category = categoryName.toLowerCase();
    if (category.includes('mẹo') || category.includes('tip')) return 'bg-green-500';
    if (category.includes('ngữ pháp') || category.includes('grammar')) return 'bg-blue-500';
    if (category.includes('từ vựng') || category.includes('vocabulary')) return 'bg-red-500';
    if (category.includes('nghe') || category.includes('listening')) return 'bg-purple-500';
    if (category.includes('đọc') || category.includes('reading')) return 'bg-orange-500';
    return 'bg-gray-500';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  getReadTime(content: string): string {
    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  }

  getAuthorAvatarColor(name: string): string {
    const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }
}
