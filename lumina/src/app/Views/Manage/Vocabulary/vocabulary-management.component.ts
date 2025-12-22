import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { VocabularyService } from '../../../Services/Vocabulary/vocabulary.service';
import { ToastService } from '../../../Services/Toast/toast.service';
import { AuthService } from '../../../Services/Auth/auth.service';
import {
  Vocabulary,
  VocabularyCategory,
  VocabularyListResponse,
  VocabularyStats
} from '../../../Interfaces/vocabulary.interfaces';

interface VocabularyReviewRequest {
  isApproved: boolean;
  comment?: string;
}

@Component({
  selector: 'app-vocabulary-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './vocabulary-management.component.html',
  styleUrls: ['./vocabulary-management.component.scss']
})
export class VocabularyManagementComponent implements OnInit, OnDestroy {
  // ----- TRẠNG THÁI GIAO DIỆN -----
  currentView: 'lists' | 'words' = 'lists';
  selectedList: VocabularyListResponse | null = null;

  // ----- DỮ LIỆU -----
  vocabularies: Vocabulary[] = [];
  filteredVocabularies: Vocabulary[] = [];
  vocabularyLists: VocabularyListResponse[] = [];
  allListsForStats: VocabularyListResponse[] = []; // All lists for statistics (not filtered)
  stats: VocabularyStats[] = [];
  
  // ----- STATS METHODS -----
  getTotalCount(): number {
    return this.allListsForStats.length;
  }
  
  getPendingCount(): number {
    return this.allListsForStats.filter(list => list.status?.toLowerCase() === 'pending').length;
  }
  
  getPublishedCount(): number {
    return this.allListsForStats.filter(list => list.status?.toLowerCase() === 'published').length;
  }

  // ----- TRẠNG THÁI BỘ LỌC VÀ TÌM KIẾM -----
  searchTerm = '';
  statusFilter = 'all'; // all, pending, approved, rejected
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;
  private subscriptions: Subscription[] = [];

  // ----- TRẠNG THÁI MODAL REVIEW -----
  isReviewModalOpen = false;
  reviewingList: VocabularyListResponse | null = null;
  rejectionReason: string = '';

  // ----- TRẠNG THÁI MODAL APPROVE -----
  showApproveModal = false;
  approvingList: VocabularyListResponse | null = null;

  // ----- TRẠNG THÁI MODAL REJECTION VIEW -----
  showRejectionViewModal = false;
  selectedRejectedList: VocabularyListResponse | null = null;

  // ----- TRẠNG THÁI KHÁC -----
  isLoading = false;
  isSubmitting = false;
  isApproving = false;
  isRejecting = false;

  // ----- DỮ LIỆU TĨNH -----
  categories: VocabularyCategory[] = [
    { id: 'business', name: 'Business', icon: '💼', count: 0, color: 'blue' },
    { id: 'technology', name: 'Technology', icon: '💻', count: 0, color: 'purple' },
    { id: 'travel', name: 'Travel', icon: '✈️', count: 0, color: 'green' },
    { id: 'health', name: 'Health', icon: '🏥', count: 0, color: 'red' },
    { id: 'finance', name: 'Finance', icon: '💰', count: 0, color: 'orange' },
    { id: 'education', name: 'Education', icon: '🎓', count: 0, color: 'indigo' }
  ];
  partsOfSpeech = ['Noun', 'Verb', 'Adjective', 'Adverb', 'Preposition', 'Conjunction', 'Phrasal Verb'];
  
  // ----- PHÂN TRANG -----
  page: number = 1;
  pageSize: number = 10; // For vocabulary lists
  wordsPageSize: number = 9; // For vocabulary words (detail view)
  totalItems: number = 0;
  totalPages: number = 0;

  constructor(
    private fb: FormBuilder,
    private vocabularyService: VocabularyService,
    private toastService: ToastService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadVocabularyLists();

    // Setup search debounce
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.searchTerm = searchTerm;
      this.onSearchChange();
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
    if (event.key === 'Escape' && (this.isReviewModalOpen || this.showApproveModal)) {
      if (this.isReviewModalOpen) {
        this.cancelReject();
      }
      if (this.showApproveModal) {
        this.cancelApprove();
      }
    }
  }

  // ----- QUẢN LÝ GIAO DIỆN -----
  selectList(list: VocabularyListResponse) {
    this.selectedList = list;
    this.currentView = 'words';
    this.loadVocabularies(list.vocabularyListId);
  }

  showListView() {
    this.currentView = 'lists';
    this.selectedList = null;
    this.vocabularies = [];
    this.filteredVocabularies = [];
    this.searchTerm = '';
    this.loadVocabularyLists();
  }

  // ----- TẢI DỮ LIỆU -----
  loadVocabularyLists() {
    this.isLoading = true;
    const sub = this.vocabularyService.getVocabularyLists(this.searchTerm).subscribe({
      next: (lists) => { 
        // Hiển thị các folder của Staff (RoleId = 3) với các status:
        // 1. Pending (cần duyệt)
        // 2. Rejected (bị từ chối)
        // 3. Published (đã duyệt)
        let allLists = lists.filter(list => {
          const status = list.status?.toLowerCase();
          const isStaffCreated = list.makeByRoleId === 3; // RoleId 3 = Staff
          
          return isStaffCreated && (
            status === 'pending' || 
            status === 'rejected' ||
            status === 'published'
          );
        }); 
        
        // Store all lists for stats (không filter)
        this.allListsForStats = allLists;
        
        // Apply status filter for display
        if (this.statusFilter !== 'all') {
          allLists = allLists.filter(list => {
            const status = list.status?.toLowerCase();
            return status === this.statusFilter.toLowerCase();
          });
        }
        
        // Sắp xếp theo thứ tự ưu tiên: pending -> rejected -> published
        allLists.sort((a, b) => {
          const getPriority = (list: VocabularyListResponse): number => {
            const status = list.status?.toLowerCase();
            // 1. Pending (cần duyệt) - ưu tiên cao nhất
            if (status === 'pending') return 1;
            // 2. Rejected (từ chối) - ưu tiên thứ hai
            if (status === 'rejected') return 2;
            // 3. Published (đã duyệt) - ưu tiên thấp nhất
            if (status === 'published') return 3;
            // Các trường hợp khác
            return 4;
          };

          const priorityA = getPriority(a);
          const priorityB = getPriority(b);

          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }
          // Nếu cùng priority, sắp xếp theo ngày tạo (mới nhất trước)
          const dateA = new Date(a.createAt).getTime();
          const dateB = new Date(b.createAt).getTime();
          return dateB - dateA;
        });
        
        this.vocabularyLists = allLists;
        this.updatePagination();
        this.isLoading = false; 
      },
      error: (error) => { 
        this.handleError(error, 'tải danh sách từ điển');
        this.isLoading = false; 
      }
    });
    this.subscriptions.push(sub);
  }

  loadVocabularies(listId: number) {
    this.isLoading = true;
    this.page = 1; // Reset to first page when loading new list
    const sub = this.vocabularyService.getVocabularies(listId, this.searchTerm).subscribe({
        next: (vocabularies) => {
            this.vocabularies = vocabularies.map(v => this.vocabularyService.convertToVocabulary(v));
            this.filterVocabularies();
            this.isLoading = false;
        },
        error: (error) => { 
          this.handleError(error, 'tải danh sách từ vựng');
          this.isLoading = false; 
        }
    });
    this.subscriptions.push(sub);
  }

  // ----- TÌM KIẾM & LỌC -----
  filterVocabularyLists() {
    // Note: vocabularyLists đã được filter ở loadVocabularyLists
    // Chỉ cần update pagination
    this.updatePagination();
  }

  filterVocabularies() {
    this.filteredVocabularies = this.vocabularies.filter(vocab =>
      vocab.word.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      vocab.definition.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    this.page = 1;
    this.updatePagination();
  }

  onSearchChange() {
    if (this.currentView === 'lists') {
      this.loadVocabularyLists();
    } else if (this.currentView === 'words' && this.selectedList) {
      this.loadVocabularies(this.selectedList.vocabularyListId);
    }
  }

  // Search input handler for debounce
  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  onStatusFilterChange() {
    this.loadVocabularyLists();
  }

  clearSearch() {
    this.searchTerm = '';
    this.onSearchChange();
  }

  // ----- DUYỆT/TỪ CHỐI -----
  approveList(list: VocabularyListResponse) {
    // Check authorization
    const roleId = this.authService.getRoleId();
    if (roleId !== 2) { // 2 = Manager
      this.toastService.error('Bạn không có quyền phê duyệt danh sách từ vựng.');
      return;
    }

    // Prevent multiple approvals
    if (this.isApproving || this.isRejecting) {
      this.toastService.warning('Đang xử lý, vui lòng đợi...');
      return;
    }

    // Show confirmation modal
    this.approvingList = list;
    this.showApproveModal = true;
  }

  // Confirm approval
  confirmApprove() {
    if (!this.approvingList) return;

    // Check authorization again
    const roleId = this.authService.getRoleId();
    if (roleId !== 2) {
      this.toastService.error('Bạn không có quyền phê duyệt danh sách từ vựng.');
      this.cancelApprove();
      return;
    }

    if (this.isApproving) {
      return;
    }

    this.isApproving = true;
    const reviewData: VocabularyReviewRequest = {
      isApproved: true,
      comment: ''
    };

    const sub = this.vocabularyService.reviewVocabularyList(this.approvingList.vocabularyListId, reviewData).subscribe({
      next: () => {
        this.toastService.success('Đã duyệt danh sách từ vựng thành công!');
        this.showApproveModal = false;
        this.approvingList = null;
        this.loadVocabularyLists();
        this.isApproving = false;
      },
      error: (error) => {
        this.handleError(error, 'duyệt danh sách từ vựng');
        this.isApproving = false;
      }
    });
    this.subscriptions.push(sub);
  }

  // Cancel approval
  cancelApprove() {
    this.showApproveModal = false;
    this.approvingList = null;
  }

  rejectList(list: VocabularyListResponse) {
    this.reviewingList = list;
    this.rejectionReason = '';
    this.isReviewModalOpen = true;
  }

  confirmReject() {
    // Check authorization
    const roleId = this.authService.getRoleId();
    if (roleId !== 2) {
      this.toastService.error('Bạn không có quyền từ chối danh sách từ vựng.');
      this.cancelReject();
      return;
    }

    const reason = this.rejectionReason.trim();
    
    if (!reason) {
      this.toastService.warning('Vui lòng nhập lý do từ chối');
      return;
    }

    if (reason.length < 10) {
      this.toastService.warning('Lý do từ chối phải có ít nhất 10 ký tự');
      return;
    }

    if (reason.length > 500) {
      this.toastService.warning('Lý do từ chối không được vượt quá 500 ký tự');
      return;
    }

    if (!this.reviewingList) {
      return;
    }

    // Sanitize rejection reason to prevent XSS
    const sanitizedReason = this.sanitizeText(reason);

    if (this.isRejecting) {
      return;
    }

    this.isRejecting = true;
    const reviewData: VocabularyReviewRequest = {
      isApproved: false,
      comment: sanitizedReason
    };

    const sub = this.vocabularyService.reviewVocabularyList(this.reviewingList.vocabularyListId, reviewData).subscribe({
      next: () => {
        this.toastService.success('Đã từ chối danh sách từ vựng');
        this.cancelReject();
        this.loadVocabularyLists();
        this.isRejecting = false;
      },
      error: (error) => {
        this.handleError(error, 'từ chối danh sách từ vựng');
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

  // Sanitize HTML content for display
  sanitizeHtml(html: string): SafeHtml {
    if (!html) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    
    // Sanitize HTML content
    const sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '');
    
    return this.sanitizer.bypassSecurityTrustHtml(sanitized);
  }

  cancelReject() {
    this.isReviewModalOpen = false;
    this.reviewingList = null;
    this.rejectionReason = '';
  }

  // ----- PHÂN TRANG -----
  get pagedVocabularies() { 
    const start = (this.page - 1) * this.wordsPageSize; 
    return this.filteredVocabularies.slice(start, start + this.wordsPageSize); 
  }

  get pagedVocabularyLists() {
    const start = (this.page - 1) * this.pageSize;
    return this.vocabularyLists.slice(start, start + this.pageSize);
  }

  updatePagination() { 
    this.totalItems = this.currentView === 'lists' ? this.vocabularyLists.length : this.filteredVocabularies.length; 
    const currentPageSize = this.currentView === 'lists' ? this.pageSize : this.wordsPageSize;
    this.totalPages = Math.ceil(this.totalItems / currentPageSize) || 1; 
    if (this.page > this.totalPages) this.page = this.totalPages; 
  }

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
  
  getStartIndex(): number {
    const currentPageSize = this.currentView === 'lists' ? this.pageSize : this.wordsPageSize;
    return (this.page - 1) * currentPageSize + 1;
  }
  
  getEndIndex(): number {
    const currentPageSize = this.currentView === 'lists' ? this.pageSize : this.wordsPageSize;
    return Math.min(this.page * currentPageSize, this.totalItems);
  }

  // ----- HELPERS -----
  getCategoryName(categoryId: string): string { 
    const category = this.categories.find(c => c.id === categoryId); 
    return category?.name || categoryId; 
  }

  getPartOfSpeechClass(partOfSpeech: string): string { 
    const lower = partOfSpeech.toLowerCase(); 
    if (lower.includes('verb')) return 'pos-verb'; 
    if (lower.includes('noun')) return 'pos-noun'; 
    return 'pos-other'; 
  }

  getStatusClass(status: string | undefined): string {
    switch (status?.toLowerCase()) {
      case 'published': return 'status-published';
      case 'draft': return 'status-draft';
      case 'pending': return 'status-pending';
      case 'rejected': return 'status-rejected';
      default: return 'status-draft';
    }
  }

  getStatusText(status: string | undefined): string {
    switch (status?.toLowerCase()) {
      case 'published': return 'Đã xuất bản';
      case 'draft': return 'Bản nháp';
      case 'pending': return 'Chờ duyệt';
      case 'rejected': return 'Bị từ chối';
      default: return 'Bản nháp';
    }
  }

  getStatusIcon(status: string | undefined): string {
    switch (status?.toLowerCase()) {
      case 'published': return '✅';
      case 'draft': return '📝';
      case 'pending': return '⏳';
      case 'rejected': return '❌';
      default: return '📝';
    }
  }

  handleImageError(event: Event, vocab: Vocabulary): void {
    // Hide image on error
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
    }
  }

  canReview(list: VocabularyListResponse): boolean {
    return list.status?.toLowerCase() === 'pending';
  }

  canSendBackToStaff(list: VocabularyListResponse): boolean {
    return list.status?.toLowerCase() === 'rejected';
  }

  sendBackToStaff(list: VocabularyListResponse) {
    // Check authorization
    const roleId = this.authService.getRoleId();
    if (roleId !== 2) {
      this.toastService.error('Bạn không có quyền gửi lại danh sách về staff.');
      return;
    }

    if (confirm('Bạn có chắc muốn gửi lại danh sách này về staff để chỉnh sửa?')) {
      this.isSubmitting = true;
      const sub = this.vocabularyService.sendBackToStaff(list.vocabularyListId).subscribe({
        next: () => {
          this.toastService.success('Đã gửi lại danh sách về staff!');
          this.loadVocabularyLists();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.handleError(error, 'gửi lại danh sách về staff');
          this.isSubmitting = false;
        }
      });
      this.subscriptions.push(sub);
    }
  }

  // Open rejection view modal
  openRejectionViewModal(list: VocabularyListResponse): void {
    this.selectedRejectedList = list;
    this.showRejectionViewModal = true;
  }

  // Close rejection view modal
  closeRejectionViewModal(): void {
    this.showRejectionViewModal = false;
    this.selectedRejectedList = null;
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
    
    this.toastService.error(errorMessage);
  }

  // Helper for template
  Math = Math;
}


