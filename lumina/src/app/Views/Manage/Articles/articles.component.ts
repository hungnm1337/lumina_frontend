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

  // Pagination
  page: number = 1;
  pageSize: number = 8;
  totalItems: number = 0;
  totalPages: number = 0;

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
        // Filter out draft articles (manager không xem draft)
        const allArticles = response.map((article: any) => this.articleService.convertToArticle(article));
        this.articles = allArticles.filter((article: Article) => article.status !== 'draft' || article.rejectionReason);
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

    // Manager không xem draft (trừ khi có rejectionReason - đã bị từ chối)
    // Đã filter ở loadArticles, nhưng đảm bảo lại ở đây
    filtered = filtered.filter(article => article.status !== 'draft' || article.rejectionReason);

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

    // Update pagination
    this.totalItems = filtered.length;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize) || 1;
    if (this.page > this.totalPages) this.page = this.totalPages;

    return filtered;
  }

  // Get paged articles
  get pagedArticles(): Article[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredArticles.slice(start, start + this.pageSize);
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

  // Get status class for styling (similar to staff)
  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'published': return 'status-published';
      case 'draft': return 'status-draft';
      default: return 'status-draft';
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
    this.router.navigate(['/manager/manage-posts', article.id]);
  }

  // Toggle hide/show article - Uses IsPublished field
  toggleHideArticle(article: Article) {
    // Toggle IsPublished: true = hiển thị, false = ẩn
    const newPublishedStatus = !article.isPublished;
    this.articleService.toggleHideArticle(article.id, newPublishedStatus).subscribe({
      next: (response) => {
        article.isPublished = newPublishedStatus;
        this.toastr.success(newPublishedStatus ? 'Bài viết đã được hiển thị' : 'Bài viết đã được ẩn');
        this.loadArticles(); // Reload to update list
      },
      error: (error) => {
        console.error('Lỗi khi ẩn/hiện bài viết:', error);
        this.toastr.error('Có lỗi xảy ra khi ẩn/hiện bài viết');
      }
    });
  }

  // Clear search
  clearSearch() {
    this.searchTerm = '';
    this.page = 1; // Reset to first page when clearing search
  }

  // Clear all filters
  clearFilters() {
    this.selectedStatus = 'all';
    this.searchTerm = '';
    this.page = 1;
  }

  // Handle status filter change
  onStatusChange() {
    this.page = 1; // Reset to first page when filter changes
  }

  // Pagination methods
  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
    }
  }

  goToPage(pageNum: number) {
    this.page = pageNum;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, this.page - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }
}