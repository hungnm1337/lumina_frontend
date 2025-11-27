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
      this.error = 'Article not found';
      this.isLoading = false;
      return;
    }

    this.articleService.getArticleById(+articleId).subscribe({
      next: (article) => {
        this.article = article;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading article:', error);
        this.error = 'Unable to load article. Please try again later.';
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

  // Sanitize HTML content
  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.sanitize(1, html) || '';
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

