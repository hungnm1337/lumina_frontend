import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VocabularyService } from '../../../Services/Vocabulary/vocabulary.service';
import { ToastService } from '../../../Services/Toast/toast.service';
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
export class VocabularyManagementComponent implements OnInit {
  // ----- TRẠNG THÁI GIAO DIỆN -----
  currentView: 'lists' | 'words' = 'lists';
  selectedList: VocabularyListResponse | null = null;

  // ----- DỮ LIỆU -----
  vocabularies: Vocabulary[] = [];
  filteredVocabularies: Vocabulary[] = [];
  vocabularyLists: VocabularyListResponse[] = [];
  stats: VocabularyStats[] = [];
  
  // ----- STATS METHODS -----
  getTotalCount(): number {
    return this.vocabularyLists.length;
  }
  
  getPendingCount(): number {
    return this.vocabularyLists.filter(list => list.status?.toLowerCase() === 'pending').length;
  }
  
  getPublishedCount(): number {
    return this.vocabularyLists.filter(list => list.status?.toLowerCase() === 'published').length;
  }

  // ----- TRẠNG THÁI BỘ LỌC VÀ TÌM KIẾM -----
  searchTerm = '';
  statusFilter = 'all'; // all, pending, approved, rejected

  // ----- TRẠNG THÁI MODAL REVIEW -----
  isReviewModalOpen = false;
  reviewingList: VocabularyListResponse | null = null;
  rejectionReason: string = '';

  // ----- TRẠNG THÁI KHÁC -----
  isLoading = false;
  isSubmitting = false;

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
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadVocabularyLists();
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
    this.vocabularyService.getVocabularyLists(this.searchTerm).subscribe({
      next: (lists) => { 
        console.log('Manager received vocabulary lists:', lists);
        // Chỉ hiển thị:
        // 1. Các folder có status = "Pending" (đã gửi yêu cầu phê duyệt)
        // 2. Các folder có status = "Published" mà do Staff tạo (RoleId = 3)
        let allLists = lists.filter(list => {
          const status = list.status?.toLowerCase();
          const isStaffCreated = list.makeByRoleId === 3; // RoleId 3 = Staff
          
          return status === 'pending' || 
                 (status === 'published' && isStaffCreated);
        }); 
        
        // Apply status filter
        if (this.statusFilter !== 'all') {
          allLists = allLists.filter(list => {
            const status = list.status?.toLowerCase();
            return status === this.statusFilter.toLowerCase();
          });
        }
        
        this.vocabularyLists = allLists;
        this.updatePagination();
        this.isLoading = false; 
      },
      error: (error) => { 
        console.error('Error loading vocabulary lists:', error);
        this.toastService.error('Không thể tải danh sách từ điển: ' + (error.error?.message || error.message)); 
        this.isLoading = false; 
      }
    });
  }

  loadVocabularies(listId: number) {
    this.isLoading = true;
    this.page = 1; // Reset to first page when loading new list
    this.vocabularyService.getVocabularies(listId, this.searchTerm).subscribe({
        next: (vocabularies) => {
            this.vocabularies = vocabularies.map(v => this.vocabularyService.convertToVocabulary(v));
            this.filterVocabularies();
            this.isLoading = false;
        },
        error: (error) => { 
          this.toastService.error('Không thể tải danh sách từ vựng'); 
          this.isLoading = false; 
        }
    });
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

  onStatusFilterChange() {
    this.loadVocabularyLists();
  }

  clearSearch() {
    this.searchTerm = '';
    this.onSearchChange();
  }

  // ----- DUYỆT/TỪ CHỐI -----
  approveList(list: VocabularyListResponse) {
    if (!list || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const reviewData: VocabularyReviewRequest = {
      isApproved: true,
      comment: ''
    };

    this.vocabularyService.reviewVocabularyList(list.vocabularyListId, reviewData).subscribe({
      next: () => {
        this.toastService.success('Đã duyệt danh sách từ vựng thành công!');
        this.loadVocabularyLists();
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Approve error:', error);
        this.toastService.error('Có lỗi xảy ra khi duyệt danh sách.');
        this.isSubmitting = false;
      }
    });
  }

  rejectList(list: VocabularyListResponse) {
    this.reviewingList = list;
    this.rejectionReason = '';
    this.isReviewModalOpen = true;
  }

  confirmReject() {
    if (!this.rejectionReason.trim()) {
      this.toastService.warning('Vui lòng nhập lý do từ chối');
      return;
    }

    if (!this.reviewingList || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const reviewData: VocabularyReviewRequest = {
      isApproved: false,
      comment: this.rejectionReason.trim()
    };

    this.vocabularyService.reviewVocabularyList(this.reviewingList.vocabularyListId, reviewData).subscribe({
      next: () => {
        this.toastService.success('Đã từ chối danh sách từ vựng');
        this.cancelReject();
        this.loadVocabularyLists();
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Reject error:', error);
        this.toastService.error('Có lỗi xảy ra khi từ chối danh sách.');
        this.isSubmitting = false;
      }
    });
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

  nextPage() { if (this.page < this.totalPages) this.page++; }
  prevPage() { if (this.page > 1) this.page--; }
  goToPage(pageNum: number) { this.page = pageNum; }
  
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
    if (confirm('Bạn có chắc muốn gửi lại danh sách này về staff để chỉnh sửa?')) {
      this.isSubmitting = true;
      this.vocabularyService.sendBackToStaff(list.vocabularyListId).subscribe({
        next: () => {
          this.toastService.success('Đã gửi lại danh sách về staff!');
          this.loadVocabularyLists();
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Send back error:', error);
          this.toastService.error('Có lỗi xảy ra khi gửi lại danh sách.');
          this.isSubmitting = false;
        }
      });
    }
  }
}


