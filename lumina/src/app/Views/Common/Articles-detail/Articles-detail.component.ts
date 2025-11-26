import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HeaderComponent } from '../header/header.component';
import { ReportPopupComponent } from '../../User/Report/report-popup/report-popup.component';
import { ArticleService } from '../../../Services/Article/article.service';
import { ArticleResponse, ArticleProgress } from '../../../Interfaces/article.interfaces';
import { ChatBoxComponent } from './chat-box/chat-box.component';
import { NoteComponent } from './note/note.component';
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
  imports: [CommonModule, FormsModule, HeaderComponent, ChatBoxComponent, NoteComponent, ReportPopupComponent],
  templateUrl: './Articles-detail.component.html',
  styleUrls: ['./Articles-detail.component.scss']
})
export class BlogDetailComponent implements OnInit {
  article: ArticleResponse | null = null;
  isLoading: boolean = true;
  error: string = '';
  contentArticle: string = '';
  // Additional properties for UI
  isLogin: boolean = false;
  showReportPopup: boolean = false;

  // Progress tracking by sections
  currentSectionIndex: number = 0;
  currentSectionId: number = 0; // Track current section ID for note component
  completedSections: Set<number> = new Set();
  articleProgress: ArticleProgress | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private articleService: ArticleService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadArticle();
    this.isLogin = this.authService.getCurrentUser() !== null;
  }

  onReportPopupClose(): void {
    console.log('[BlogDetailComponent] Report popup close received');
    this.showReportPopup = false;
    // Force change detection in case needed
    this.cdr.detectChanges();
  }
  // Load existing progress
  loadArticleProgress(): void {
    if (!this.article || !this.isLogin) return;

    const articleId = this.article.articleId;
    this.articleService.getUserArticleProgress([articleId]).subscribe({
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
    if (this.article) {
      this.currentSectionId = this.article.sections[this.currentSectionIndex]?.sectionId || 0;
    }

    // Scroll to current section
    setTimeout(() => {
      this.scrollToCurrentSection();
    }, 100);
  }

  // Check if section can be accessed
  canAccessSection(sectionIndex: number): boolean {
    // Nếu chưa đăng nhập, cho phép xem tất cả sections
    if (!this.isLogin) return true;

    if (sectionIndex === 0) return true; // First section is always accessible
    return this.completedSections.has(sectionIndex - 1); // Can access if previous is completed
  }

  // Check if section is completed
  isSectionCompleted(sectionIndex: number): boolean {
    return this.completedSections.has(sectionIndex);
  }

  // Mark section as read (chỉ cho phép khi đã đăng nhập)
  markSectionAsRead(sectionIndex: number): void {
    if (!this.article || !this.isLogin) return;

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
      this.currentSectionId = this.article.sections[sectionIndex]?.sectionId || 0;
      this.scrollToTop();
    }
  }

  // Previous section
  previousSection(): void {
    if (this.currentSectionIndex > 0) {
      this.currentSectionIndex--;
      if (this.article) {
        this.currentSectionId = this.article.sections[this.currentSectionIndex]?.sectionId || 0;
      }
      this.scrollToTop();
    }
  }

  // Next section
  nextSection(): void {
    if (this.article && this.currentSectionIndex < this.article.sections.length - 1) {
      // Check if can access next section
      if (this.canAccessSection(this.currentSectionIndex + 1)) {
        this.currentSectionIndex++;
        this.currentSectionId = this.article.sections[this.currentSectionIndex]?.sectionId || 0;
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

    const articleId = this.article.articleId;
    const totalSections = this.article.sections.length;
    const completedCount = this.completedSections.size;
    const progressPercent = Math.round((completedCount / totalSections) * 100);
    const status = progressPercent === 100 ? 'completed' : progressPercent > 0 ? 'in_progress' : 'not_started';

    // Save progress to backend
    this.articleService.saveArticleProgress(articleId, {
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
      articleId: articleId,
      progressPercent: progressPercent,
      status: status as 'not_started' | 'in_progress' | 'completed',
      lastAccessedAt: new Date().toISOString(),
      completedAt: status === 'completed' ? new Date().toISOString() : undefined
    };
  }

  // Mark current section as done
  markSectionAsDone(): void {
    if (!this.article || !this.isLogin) return;

    // Mark current section as completed
    this.completedSections.add(this.currentSectionIndex);
    
    // Update progress
    this.updateProgress();
    
    // Check if all sections are completed
    const totalSections = this.article.sections.length;
    const completedCount = this.completedSections.size;
    
    // If all sections are completed, mark article as done in backend
    if (completedCount === totalSections) {
      const articleId = this.article.articleId;
      this.articleService.markArticleAsDone(articleId).subscribe({
        next: () => {
          console.log('All sections completed - Article marked as done');
        },
        error: (error) => {
          console.error('Error marking article as done:', error);
        }
      });
    }
    
    // Auto-scroll to next section if available
    if (this.currentSectionIndex < this.article.sections.length - 1) {
      setTimeout(() => {
        this.goToSection(this.currentSectionIndex + 1);
      }, 500);
    }
  }

  // Check if article is completed
  isArticleCompleted(): boolean {
    return this.articleProgress?.status === 'completed' || false;
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
        this.contentArticle = article.sections.map(section => section.sectionContent).join('\n\n');
        
        // Debug: Log section content to see what we're receiving
        console.log('Article loaded:', article);
        console.log('Sections:', article.sections);
        article.sections.forEach((section, index) => {
          console.log(`Section ${index} content:`, section.sectionContent);
          console.log(`Section ${index} content type:`, typeof section.sectionContent);
          console.log(`Section ${index} content length:`, section.sectionContent?.length);
        });
        
        this.isLoading = false;

        // Initialize section tracking
        this.currentSectionIndex = 0;
        this.currentSectionId = article.sections[0]?.sectionId || 0;
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

  // Get current section ID for note component
  getCurrentSectionId(): number {
    if (!this.article || !this.article.sections || this.article.sections.length === 0) {
      return 0;
    }
    return this.article.sections[this.currentSectionIndex]?.sectionId || 0;
  }

  // Extract YouTube video ID from URL
  private extractYouTubeId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  // Convert YouTube URL to embed iframe
  private convertYouTubeUrlToEmbed(content: string): string {
    // Check if content is a YouTube URL
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = content.trim().match(youtubeRegex);
    
    if (match && match[1]) {
      const videoId = match[1];
      // Add necessary parameters to prevent video from stopping
      // enablejsapi=1: Enable JavaScript API
      // origin: Required for security
      // rel=0: Don't show related videos from other channels
      // modestbranding=1: Reduce YouTube branding
      const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&rel=0&modestbranding=1&playsinline=1`;
      
      return `<div class="youtube-embed-container">
        <iframe 
          width="100%" 
          height="400" 
          src="${embedUrl}" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowfullscreen
          loading="lazy"
          style="max-width: 100%; border-radius: 12px;">
        </iframe>
      </div>`;
    }
    
    return content;
  }

  // Sanitize HTML content from Quill editor to allow images and videos
  getSanitizedContent(content: string): SafeHtml {
    if (!content) {
      console.log('getSanitizedContent: content is empty');
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    
    console.log('getSanitizedContent - Original content:', content);
    console.log('getSanitizedContent - Content type:', typeof content);
    
    // Check if content is a YouTube URL (plain text)
    if (content.trim().startsWith('http') && (content.includes('youtube.com') || content.includes('youtu.be'))) {
      const embedHtml = this.convertYouTubeUrlToEmbed(content);
      return this.sanitizer.bypassSecurityTrustHtml(embedHtml);
    }
    
    // Check if content is Quill Delta format (JSON string)
    let processedContent = content;
    try {
      // Try to parse as JSON (Quill Delta format)
      const parsed = JSON.parse(content);
      if (parsed && parsed.ops) {
        console.log('Content is Quill Delta format, converting to HTML...');
        // This is Quill Delta format - we need to convert it to HTML
        // For now, we'll use a simple approach or you might need quill-delta-to-html library
        processedContent = this.convertDeltaToHtml(parsed);
        console.log('Converted HTML:', processedContent);
      }
    } catch (e) {
      // Not JSON, assume it's already HTML
      console.log('Content is already HTML format');
    }
    
    // Check for YouTube URLs in HTML content and convert to embeds
    processedContent = processedContent.replace(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g,
      (match, videoId) => {
        // Add necessary parameters to prevent video from stopping
        const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&rel=0&modestbranding=1&playsinline=1`;
        
        return `<div class="youtube-embed-container">
          <iframe 
            width="100%" 
            height="400" 
            src="${embedUrl}" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowfullscreen
            loading="lazy"
            style="max-width: 100%; border-radius: 12px;">
          </iframe>
        </div>`;
      }
    );
    
    // Ensure img tags have proper attributes for display
    processedContent = processedContent.replace(
      /<img([^>]*)>/gi,
      (match, attributes) => {
        // Check if style attribute exists
        if (!attributes.includes('style')) {
          return `<img${attributes} style="max-width: 100%; height: auto; display: block; margin: 1rem auto;">`;
        } else if (!attributes.includes('max-width')) {
          // Add max-width if style exists but doesn't have max-width
          return match.replace('style="', 'style="max-width: 100%; height: auto; display: block; margin: 1rem auto; ');
        }
        return match;
      }
    );
    
    // Ensure video tags have proper attributes
    processedContent = processedContent.replace(
      /<video([^>]*)>/gi,
      (match, attributes) => {
        if (!attributes.includes('style')) {
          return `<video${attributes} style="max-width: 100%; height: auto; display: block; margin: 1rem auto;" controls>`;
        } else if (!attributes.includes('controls')) {
          return match.replace('>', ' controls>');
        }
        return match;
      }
    );
    
    // Use bypassSecurityTrustHtml to allow images and videos from Cloudinary
    // Note: This is safe because content comes from our own database (staff-created articles)
    return this.sanitizer.bypassSecurityTrustHtml(processedContent);
  }

  // Get sanitized content for current section
  getCurrentSectionContent(): SafeHtml {
    if (!this.article || !this.article.sections || this.article.sections.length === 0) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    const section = this.article.sections[this.currentSectionIndex];
    const content = section?.sectionContent || '';
    console.log('getCurrentSectionContent - Section index:', this.currentSectionIndex);
    console.log('getCurrentSectionContent - Section content:', content);
    return this.getSanitizedContent(content);
  }

  // Convert Quill Delta format to HTML (simple implementation)
  private convertDeltaToHtml(delta: any): string {
    if (!delta || !delta.ops) return '';
    
    let html = '';
    for (const op of delta.ops) {
      if (op.insert) {
        if (typeof op.insert === 'string') {
          // Text content
          let text = op.insert;
          if (op.attributes) {
            if (op.attributes.bold) text = `<strong>${text}</strong>`;
            if (op.attributes.italic) text = `<em>${text}</em>`;
            if (op.attributes.underline) text = `<u>${text}</u>`;
            if (op.attributes.header) {
              const level = op.attributes.header;
              text = `<h${level}>${text}</h${level}>`;
            }
          }
          html += text;
        } else if (op.insert.image) {
          // Image embed
          html += `<img src="${op.insert.image}" style="max-width: 100%; height: auto; display: block; margin: 1rem auto;" />`;
        } else if (op.insert.video) {
          // Video embed
          html += `<video src="${op.insert.video}" controls style="max-width: 100%; height: auto; display: block; margin: 1rem auto;"></video>`;
        }
      }
    }
    return html;
  }
}
