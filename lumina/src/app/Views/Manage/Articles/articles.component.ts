import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ArticleService } from '../../../Services/Article/article.service';
import { Article } from '../../../Interfaces/article.interfaces';
import { ToastrService } from 'ngx-toastr';

interface ArticleStats {
  totalArticles: number;
  pendingArticles: number;
  approvedArticles: number;
  monthlyViews: number;
}

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './articles.component.html',
  styleUrls: ['./articles.component.scss']
})
export class ArticlesComponent implements OnInit {
  // Loading/Error states
  isLoading = false;
  errorMessage: string | null = null;

  // Statistics
  stats: ArticleStats = {
    totalArticles: 0,
    pendingArticles: 0,
    approvedArticles: 0,
    monthlyViews: 0
  };

  // Articles data
  articles: Article[] = [];

  // Filter states
  selectedStatus: string = 'all';
  searchTerm: string = '';

  // Rejection modal
  showRejectModal = false;
  rejectingArticle: Article | null = null;
  rejectionReason: string = '';

  constructor(
    private articleService: ArticleService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadArticles();
  }

  // Load articles from API
  loadArticles() {
    this.isLoading = true;
    this.errorMessage = null;

    this.articleService.getAllArticles().subscribe({
      next: (response: any) => {
        this.articles = response.map((article: any) => this.articleService.convertToArticle(article));
        this.updateStats();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Lỗi khi tải danh sách bài viết:', error);
        this.errorMessage = 'Không thể tải danh sách bài viết';
        this.isLoading = false;
      }
    });
  }

  // Update statistics
  updateStats() {
    this.stats.totalArticles = this.articles.length;
    this.stats.pendingArticles = this.articles.filter(a => a.status === 'pending').length;
    this.stats.approvedArticles = this.articles.filter(a => a.status === 'published').length;
    this.stats.monthlyViews = this.articles.reduce((sum, a) => sum + a.views, 0);
  }

  // Filter articles
  get filteredArticles(): Article[] {
    let filtered = this.articles;

    // Filter by status
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(article => {
        if (this.selectedStatus === 'pending') return article.status === 'pending';
        if (this.selectedStatus === 'approved') return article.status === 'published';
        if (this.selectedStatus === 'rejected') return article.status === 'draft' && article.rejectionReason;
        return true;
      });
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(term) ||
        article.summary.toLowerCase().includes(term) ||
        article.author.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  // Get status badge class
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending': return 'badge-warning';
      case 'published': return 'badge-success';
      case 'draft': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  }

  // Get status text
  getStatusText(status: string, rejectionReason?: string): string {
    if (status === 'draft' && rejectionReason) {
      return 'Đã từ chối';
    }
    switch (status) {
      case 'pending': return 'Chờ duyệt';
      case 'published': return 'Đã duyệt';
      case 'draft': return 'Bản nháp';
      default: return 'Không xác định';
    }
  }

  // Duyệt bài viết
  approveArticle(article: Article) {
    this.articleService.reviewArticle(article.id, true).subscribe({
      next: (response) => {
        this.toastr.success('Bài viết đã được duyệt thành công!');
        this.loadArticles();
      },
      error: (error) => {
        console.error('Lỗi khi duyệt bài viết:', error);
        this.toastr.error('Có lỗi xảy ra khi duyệt bài viết');
      }
    });
  }

  // Từ chối bài viết
  rejectArticle(article: Article) {
    this.rejectingArticle = article;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  // Xác nhận từ chối với lý do
  confirmReject() {
    if (!this.rejectionReason.trim()) {
      this.toastr.warning('Vui lòng nhập lý do từ chối');
      return;
    }

    this.articleService.reviewArticle(this.rejectingArticle!.id, false, this.rejectionReason).subscribe({
      next: (response) => {
        this.toastr.success('Bài viết đã được từ chối');
        this.showRejectModal = false;
        this.rejectingArticle = null;
        this.rejectionReason = '';
        this.loadArticles();
      },
      error: (error) => {
        console.error('Lỗi khi từ chối bài viết:', error);
        this.toastr.error('Có lỗi xảy ra khi từ chối bài viết');
      }
    });
  }

  // Hủy từ chối
  cancelReject() {
    this.showRejectModal = false;
    this.rejectingArticle = null;
    this.rejectionReason = '';
  }

  // Xem chi tiết bài viết
  viewArticle(article: Article) {
    this.router.navigate(['/manage/articles', article.id]);
  }

  // Clear search
  clearSearch() {
    this.searchTerm = '';
  }

  // Clear all filters
  clearFilters() {
    this.selectedStatus = 'all';
    this.searchTerm = '';
  }
}