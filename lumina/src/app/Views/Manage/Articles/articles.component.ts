import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ArticleService } from '../../../Services/Article/article.service';
import { AuthService } from '../../../Services/Auth/auth.service';
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
export class ArticlesComponent implements OnInit, OnDestroy {
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
  allArticlesForStats: Article[] = []; // All articles for statistics (not filtered)

  // Filter states
  selectedStatus: string = 'all';
  searchTerm: string = '';
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;
  private subscriptions: Subscription[] = [];

  // Pagination
  page: number = 1;
  pageSize: number = 8;
  totalItems: number = 0;
  totalPages: number = 0;

  // Rejection modal
  showRejectModal = false;
  rejectingArticle: Article | null = null;
  rejectionReason: string = '';

  // Rejection View Modal (for viewing rejection reasons)
  showRejectionViewModal = false;
  selectedRejectedArticle: Article | null = null;

  // Approval modal
  showApproveModal = false;
  approvingArticle: Article | null = null;

  // Loading states for actions
  isApproving = false;
  isRejecting = false;

  constructor(
    private articleService: ArticleService,
    private router: Router,
    private toastr: ToastrService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.loadArticles();

    // Setup search debounce
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.searchTerm = searchTerm;
      this.page = 1;
    });
  }

  ngOnDestroy(): void {
    // Unsubscribe all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'Escape' && (this.showRejectModal || this.showApproveModal)) {
      if (this.showRejectModal) {
        this.cancelReject();
      }
      if (this.showApproveModal) {
        this.cancelApprove();
      }
    }
  }

  // Load articles from API
  loadArticles() {
    this.isLoading = true;
    this.errorMessage = null;

    const sub = this.articleService.getAllArticles().subscribe({
      next: (response: any) => {
        // Filter out draft articles (manager không xem draft)
        const allArticles = response.map((article: any) => this.articleService.convertToArticle(article));
        this.articles = allArticles.filter((article: Article) => article.status !== 'draft' || article.rejectionReason);

        // Store all articles for stats (not filtered)
        this.allArticlesForStats = allArticles.filter((article: Article) => article.status !== 'draft' || article.rejectionReason);

        this.updateStats();
        this.isLoading = false;
      },
      error: (error: any) => {
        this.handleError(error, 'tải danh sách bài viết');
        this.errorMessage = 'Không thể tải danh sách bài viết';
        this.isLoading = false;
      }
    });
    this.subscriptions.push(sub);
  }

  // Update statistics - tính từ tất cả articles (không filter)
  updateStats() {
    this.stats.totalArticles = this.allArticlesForStats.length;
    this.stats.pendingArticles = this.allArticlesForStats.filter(a => a.status === 'pending').length;
    this.stats.approvedArticles = this.allArticlesForStats.filter(a => a.status === 'published').length;
    this.stats.monthlyViews = this.allArticlesForStats.reduce((sum, a) => sum + (a.views || 0), 0);
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

    // Sắp xếp theo thứ tự ưu tiên: pending -> rejected -> published
    filtered.sort((a, b) => {
      // Hàm để xác định thứ tự ưu tiên
      const getPriority = (article: Article): number => {
        // 1. Pending (cần duyệt) - ưu tiên cao nhất
        if (article.status === 'pending') return 1;
        // 2. Rejected (từ chối) - ưu tiên thứ hai
        if (article.status === 'draft' && article.rejectionReason) return 2;
        // 3. Published (đã duyệt) - ưu tiên thấp nhất
        if (article.status === 'published') return 3;
        // Các trường hợp khác
        return 4;
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      // Sắp xếp theo priority, nếu cùng priority thì sắp xếp theo ngày tạo (mới nhất trước)
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Nếu cùng priority, sắp xếp theo ngày tạo (mới nhất trước)
      const dateA = new Date(a.publishDate).getTime();
      const dateB = new Date(b.publishDate).getTime();
      return dateB - dateA;
    });

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
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'pending') return 'status-pending';
    if (statusLower === 'published') return 'status-published';
    if (statusLower === 'rejected') return 'status-rejected';
    return 'status-draft';
  }

  // Get status text
  getStatusText(status: string, rejectionReason?: string): string {
    const statusLower = status?.toLowerCase() || '';
    
    // Check for rejected status (either status is 'rejected' or draft with rejectionReason)
    if (statusLower === 'rejected' || (statusLower === 'draft' && rejectionReason)) {
      return 'Đã từ chối';
    }
    
    switch (statusLower) {
      case 'pending': return 'Chờ duyệt';
      case 'published': return 'Đã duyệt';
      case 'draft': return 'Bản nháp';
      default: return 'Không xác định';
    }
  }

  // Duyệt bài viết
  approveArticle(article: Article) {
    // Check authorization
    const roleId = this.authService.getRoleId();
    if (roleId !== 2) { // 2 = Manager
      this.toastr.error('Bạn không có quyền phê duyệt bài viết.');
      return;
    }

    // Prevent multiple approvals
    if (this.isApproving || this.isRejecting) {
      this.toastr.warning('Đang xử lý, vui lòng đợi...');
      return;
    }

    // Show confirmation modal
    this.approvingArticle = article;
    this.showApproveModal = true;
  }

  // Confirm approval
  confirmApprove() {
    if (!this.approvingArticle) return;

    // Check authorization again
    const roleId = this.authService.getRoleId();
    if (roleId !== 2) {
      this.toastr.error('Bạn không có quyền phê duyệt bài viết.');
      this.cancelApprove();
      return;
    }

    if (this.isApproving) {
      return;
    }

    this.isApproving = true;
    const sub = this.articleService.reviewArticle(this.approvingArticle.id, true).subscribe({
      next: (response) => {
        this.toastr.success('Bài viết đã được duyệt thành công!');
        this.showApproveModal = false;
        this.approvingArticle = null;
        this.loadArticles();
        this.isApproving = false;
      },
      error: (error) => {
        this.handleError(error, 'duyệt bài viết');
        this.isApproving = false;
      }
    });
    this.subscriptions.push(sub);
  }

  // Cancel approval
  cancelApprove() {
    this.showApproveModal = false;
    this.approvingArticle = null;
  }

  // Từ chối bài viết
  rejectArticle(article: Article) {
    this.rejectingArticle = article;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  // Xác nhận từ chối với lý do
  confirmReject() {
    // Check authorization
    const roleId = this.authService.getRoleId();
    if (roleId !== 2) {
      this.toastr.error('Bạn không có quyền từ chối bài viết.');
      this.cancelReject();
      return;
    }

    const reason = this.rejectionReason.trim();

    if (!reason) {
      this.toastr.warning('Vui lòng nhập lý do từ chối');
      return;
    }

    if (reason.length < 10) {
      this.toastr.warning('Lý do từ chối phải có ít nhất 10 ký tự');
      return;
    }

    if (reason.length > 500) {
      this.toastr.warning('Lý do từ chối không được vượt quá 500 ký tự');
      return;
    }

    // Sanitize rejection reason to prevent XSS
    const sanitizedReason = this.sanitizeText(reason);

    if (this.isRejecting) {
      return;
    }

    this.isRejecting = true;
    const sub = this.articleService.reviewArticle(this.rejectingArticle!.id, false, sanitizedReason).subscribe({
      next: (response) => {
        this.toastr.success('Bài viết đã được từ chối');
        this.showRejectModal = false;
        this.rejectingArticle = null;
        this.rejectionReason = '';
        this.loadArticles();
        this.isRejecting = false;
      },
      error: (error) => {
        this.handleError(error, 'từ chối bài viết');
        this.isRejecting = false;
      }
    });
    this.subscriptions.push(sub);
  }

  // Sanitize text to prevent XSS
  private sanitizeText(text: string): string {
    // Remove HTML tags and dangerous characters
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
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
    // Check authorization
    const roleId = this.authService.getRoleId();
    if (roleId !== 2) {
      this.toastr.error('Bạn không có quyền ẩn/hiện bài viết.');
      return;
    }

    // Toggle IsPublished: true = hiển thị, false = ẩn
    const newPublishedStatus = !article.isPublished;
    const sub = this.articleService.toggleHideArticle(article.id, newPublishedStatus).subscribe({
      next: (response) => {
        article.isPublished = newPublishedStatus;
        this.toastr.success(newPublishedStatus ? 'Bài viết đã được hiển thị' : 'Bài viết đã được ẩn');
        this.loadArticles(); // Reload to update list
      },
      error: (error) => {
        this.handleError(error, 'ẩn/hiện bài viết');
      }
    });
    this.subscriptions.push(sub);
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
    if (this.page < this.totalPages && this.totalItems > 0) {
      this.page++;
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
    }
  }

  goToPage(pageNum: number) {
    if (pageNum >= 1 && pageNum <= this.totalPages && this.totalItems > 0) {
      this.page = pageNum;
    }
  }

  // Improved error handling
  private handleError(error: any, action: string): void {
    let errorMessage = `Không thể ${action}.`;

    if (error.status === 0) {
      errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
    } else if (error.status === 401) {
      errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    } else if (error.status === 403) {
      errorMessage = 'Bạn không có quyền thực hiện thao tác này.';
    } else if (error.status === 500) {
      errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
    } else if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    this.toastr.error(errorMessage);
  }

  // Search input handler
  onSearchInput(value: string): void {
    this.searchSubject.next(value);
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

  // ===== REJECTION VIEW MODAL METHODS =====
  openRejectionViewModal(article: Article): void {
    this.selectedRejectedArticle = article;
    this.showRejectionViewModal = true;
  }

  closeRejectionViewModal(): void {
    this.showRejectionViewModal = false;
    this.selectedRejectedArticle = null;
  }

  viewRejectedArticle(): void {
    if (this.selectedRejectedArticle) {
      this.viewArticle(this.selectedRejectedArticle);
      this.closeRejectionViewModal();
    }
  }

  // Helper for template
  Math = Math;
}