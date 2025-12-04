import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ArticleService } from '../../../../Services/Article/article.service';
import { ArticleResponse } from '../../../../Interfaces/article.interfaces';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './article-detail.component.html',
  styleUrls: ['./article-detail.component.scss']
})
export class ArticleDetailComponent implements OnInit {
  article: ArticleResponse | null = null;
  isLoading: boolean = true;
  error: string = '';

  // Rejection modal
  showRejectModal = false;
  rejectionReason: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private articleService: ArticleService,
    private sanitizer: DomSanitizer,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadArticle();
  }

  loadArticle(): void {
    this.isLoading = true;
    this.error = '';

    const articleId = this.route.snapshot.paramMap.get('id');
    if (!articleId) {
      this.error = 'Không tìm thấy bài viết';
      this.isLoading = false;
      return;
    }

    // Use manager endpoint to view any article including pending
    this.articleService.getArticleByIdForManager(+articleId).subscribe({
      next: (article) => {
        this.article = article;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading article:', error);
        this.error = 'Không thể tải bài viết. Vui lòng thử lại sau.';
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/manager/manage-posts']);
  }

  // Get status class
  getStatusClass(): string {
    if (!this.article) return '';
    const status = this.article.status?.toLowerCase() || '';
    if (status === 'pending') return 'status-pending';
    if (status === 'published') return 'status-published';
    if (status === 'draft' && this.article.rejectionReason) return 'status-rejected';
    return 'status-draft';
  }

  // Get status text
  getStatusText(): string {
    if (!this.article) return '';
    if (this.article.status?.toLowerCase() === 'draft' && this.article.rejectionReason) {
      return 'Đã từ chối';
    }
    const status = this.article.status?.toLowerCase() || '';
    switch (status) {
      case 'pending': return 'Chờ duyệt';
      case 'published': return 'Đã duyệt';
      case 'draft': return 'Bản nháp';
      default: return 'Không xác định';
    }
  }

  // Format date
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  // Sanitize HTML content and convert YouTube URLs to embeds
  sanitizeHtml(html: string): SafeHtml {
    if (!html) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    // Check if content is a YouTube URL (plain text)
    if (html.trim().startsWith('http') && (html.includes('youtube.com') || html.includes('youtu.be'))) {
      const embedHtml = this.convertYouTubeUrlToEmbed(html);
      return this.sanitizer.bypassSecurityTrustHtml(embedHtml);
    }

    // Check if content is Quill Delta format (JSON string)
    let processedContent = html;
    try {
      // Try to parse as JSON (Quill Delta format)
      const parsed = JSON.parse(html);
      if (parsed && parsed.ops) {
        // This is Quill Delta format - convert to HTML
        processedContent = this.convertDeltaToHtml(parsed);
      }
    } catch (e) {
      // Not JSON, assume it's already HTML
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
        if (!attributes.includes('style')) {
          return `<img${attributes} style="max-width: 100%; height: auto; display: block; margin: 1rem auto;">`;
        } else if (!attributes.includes('max-width')) {
          return match.replace('style="', 'style="max-width: 100%; height: auto; display: block; margin: 1rem auto; ');
        }
        return match;
      }
    );

    // Use bypassSecurityTrustHtml to allow iframes and other content
    // Note: This is safe because content comes from our own database (staff-created articles)
    return this.sanitizer.bypassSecurityTrustHtml(processedContent);
  }

  // Convert Quill Delta to HTML (simplified version)
  private convertDeltaToHtml(delta: any): string {
    if (!delta || !delta.ops) return '';

    let html = '';
    for (const op of delta.ops) {
      if (op.insert) {
        if (typeof op.insert === 'string') {
          let text = op.insert.replace(/\n/g, '<br>');

          // Apply formatting
          if (op.attributes) {
            if (op.attributes.bold) text = `<strong>${text}</strong>`;
            if (op.attributes.italic) text = `<em>${text}</em>`;
            if (op.attributes.underline) text = `<u>${text}</u>`;
            if (op.attributes.header) {
              const level = op.attributes.header;
              text = `<h${level}>${text}</h${level}>`;
            }
            if (op.attributes.list === 'ordered') {
              text = `<ol><li>${text}</li></ol>`;
            } else if (op.attributes.list === 'bullet') {
              text = `<ul><li>${text}</li></ul>`;
            }
          }

          html += text;
        } else if (op.insert && typeof op.insert === 'object') {
          // Handle embeds (images, videos, etc.)
          if (op.insert.image) {
            html += `<img src="${op.insert.image}" style="max-width: 100%; height: auto; display: block; margin: 1rem auto;">`;
          }
        }
      }
    }

    return html;
  }

  // Approve article
  approveArticle() {
    if (!this.article) return;

    this.articleService.reviewArticle(this.article.articleId, true).subscribe({
      next: (response) => {
        this.toastr.success('Bài viết đã được duyệt thành công!');
        this.loadArticle(); // Reload to update status
      },
      error: (error) => {
        console.error('Lỗi khi duyệt bài viết:', error);
        this.toastr.error('Có lỗi xảy ra khi duyệt bài viết');
      }
    });
  }

  // Reject article
  rejectArticle() {
    if (!this.article) return;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  // Confirm rejection
  confirmReject() {
    if (!this.rejectionReason.trim()) {
      this.toastr.warning('Vui lòng nhập lý do từ chối');
      return;
    }

    if (!this.article) return;

    this.articleService.reviewArticle(this.article.articleId, false, this.rejectionReason).subscribe({
      next: (response) => {
        this.toastr.success('Bài viết đã được từ chối');
        this.showRejectModal = false;
        this.rejectionReason = '';
        this.loadArticle(); // Reload to update status
      },
      error: (error) => {
        console.error('Lỗi khi từ chối bài viết:', error);
        this.toastr.error('Có lỗi xảy ra khi từ chối bài viết');
      }
    });
  }

  // Cancel rejection
  cancelReject() {
    this.showRejectModal = false;
    this.rejectionReason = '';
  }

  // Check if can approve/reject
  canApproveReject(): boolean {
    if (!this.article) return false;
    return this.article.status?.toLowerCase() === 'pending';
  }
}

