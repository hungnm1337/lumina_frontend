import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { VocabularyService } from '../../../../Services/Vocabulary/vocabulary.service';
import { UploadService } from '../../../../Services/Upload/upload.service';
import { ToastService } from '../../../../Services/Toast/toast.service';
import { SpeechService } from '../../../../Services/Speech/speech.service';
import {
  Vocabulary,
  VocabularyCategory,
  VocabularyListResponse,
  VocabularyStats
} from '../../../../Interfaces/vocabulary.interfaces';

@Component({
  selector: 'app-vocabulary',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './vocabulary.component.html',
  styleUrls: ['./vocabulary.component.scss']
})
export class VocabularyComponent implements OnInit {
  currentView: 'lists' | 'words' = 'lists';
  selectedList: VocabularyListResponse | null = null;

  vocabularies: Vocabulary[] = [];
  filteredVocabularies: Vocabulary[] = [];
  vocabularyLists: VocabularyListResponse[] = [];
  stats: VocabularyStats[] = [];

  searchTerm = '';

  isModalOpen = false;
  editingVocabulary: Vocabulary | null = null;
  vocabularyForm: FormGroup;

  isListModalOpen = false;
  listForm: FormGroup;

  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmType: 'delete' | 'approval' | 'cancel' = 'delete';
  pendingDeleteId: number | null = null;
  pendingApprovalList: VocabularyListResponse | null = null;

  initialVocabularyFormValue: any = null;
  initialListFormValue: any = null;
  initialImagePreview: string | null = null;
  initialSelectedImageFile: File | null = null;

  // Rejection Modal Properties
  showRejectionModal = false;
  selectedRejectedList: VocabularyListResponse | null = null;

  // Pagination Properties for Vocabulary Lists
  listCurrentPage = 1;
  listsPerPage = 9;

  isLoading = false;
  isSubmitting = false;

  isUploadingImage = false;
  selectedImageFile: File | null = null;
  imagePreview: string | null = null;

  categories: VocabularyCategory[] = [
    { id: 'business', name: 'Business', icon: '💼', count: 0, color: 'blue' },
    { id: 'technology', name: 'Technology', icon: '💻', count: 0, color: 'purple' },
    { id: 'travel', name: 'Travel', icon: '✈️', count: 0, color: 'green' },
    { id: 'health', name: 'Health', icon: '🏥', count: 0, color: 'red' },
    { id: 'finance', name: 'Finance', icon: '💰', count: 0, color: 'orange' },
    { id: 'education', name: 'Education', icon: '🎓', count: 0, color: 'indigo' }
  ];
  partsOfSpeech = ['Noun', 'Verb', 'Adjective', 'Adverb', 'Preposition', 'Conjunction', 'Phrasal Verb'];

  page: number = 1;
  pageSize: number = 6;
  totalItems: number = 0;
  totalPages: number = 0;

  constructor(
    private fb: FormBuilder,
    private vocabularyService: VocabularyService,
    private uploadService: UploadService,
    private toastService: ToastService,
    private speechService: SpeechService
  ) {
    this.vocabularyForm = this.fb.group({
      word: ['', Validators.required],
      category: ['', Validators.required],
      partOfSpeech: ['', Validators.required],
      definition: ['', Validators.required],
      example: ['', Validators.required],
      translation: ['', Validators.required],
      imageUrl: ['']
    });

    this.listForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]]
    });
  }

  ngOnInit() {
    this.loadVocabularyLists();
  }

  selectList(list: VocabularyListResponse) {
    this.selectedList = list;
    this.currentView = 'words';
    this.loadVocabularies(list.vocabularyListId);
  }

  reloadSelectedList() {
    if (this.selectedList) {
      this.vocabularyService.getVocabularyLists(this.searchTerm).subscribe({
        next: (lists) => {
          const updatedList = lists.find(l => l.vocabularyListId === this.selectedList?.vocabularyListId);
          if (updatedList) {
            this.selectedList = updatedList;
          }
        }
      });
    }
  }

  showListView() {
    this.currentView = 'lists';
    this.selectedList = null;
    this.vocabularies = [];
    this.filteredVocabularies = [];
    this.searchTerm = '';
    this.loadVocabularyLists();
  }

  loadVocabularyLists() {
    this.isLoading = true;
    this.vocabularyService.getVocabularyLists(this.searchTerm).subscribe({
      next: (lists) => { this.vocabularyLists = lists; this.isLoading = false; },
      error: (error) => { this.toastService.error('Không thể tải danh sách từ điển'); this.isLoading = false; }
    });
  }

  loadVocabularies(listId: number) {
    this.isLoading = true;
    this.vocabularyService.getVocabularies(listId, this.searchTerm).subscribe({
      next: (vocabularies) => {
        this.vocabularies = vocabularies.map(v => this.vocabularyService.convertToVocabulary(v));
        this.filterVocabularies();
        this.isLoading = false;
      },
      error: (error) => { this.toastService.error('Không thể tải danh sách từ vựng'); this.isLoading = false; }
    });
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

  clearSearch() {
    this.searchTerm = '';
    this.onSearchChange();
  }

  getPendingCount(): number {
    return this.vocabularyLists.filter(list =>
      list.status?.toLowerCase() === 'pending' ||
      list.status?.toLowerCase() === 'draft'
    ).length;
  }

  getPublishedCount(): number {
    return this.vocabularyLists.filter(list =>
      list.status?.toLowerCase() === 'published'
    ).length;
  }

  openCreateListModal() {
    this.isListModalOpen = true;
    this.listForm.reset();
    this.initialListFormValue = JSON.stringify(this.listForm.value);
  }

  closeCreateListModal() {
    if (this.hasListFormChanged()) {
      this.showCancelConfirm('list');
    } else {
      this.isListModalOpen = false;
      this.initialListFormValue = null;
    }
  }

  forceCloseCreateListModal() {
    this.isListModalOpen = false;
    this.initialListFormValue = null;
  }

  hasListFormChanged(): boolean {
    if (!this.initialListFormValue) return false;
    const currentValue = JSON.stringify(this.listForm.value);
    return currentValue !== this.initialListFormValue;
  }
  saveNewList() {
    if (this.listForm.invalid || this.isSubmitting) return;
    this.isSubmitting = true;
    this.vocabularyService.createVocabularyList(this.listForm.value).subscribe({
      next: (newList) => {
        this.toastService.success(`Đã tạo danh sách "${newList.name}"!`);
        this.isSubmitting = false;
        this.forceCloseCreateListModal();
        this.loadVocabularyLists();
      },
      error: (err) => { this.toastService.error("Tạo danh sách thất bại."); this.isSubmitting = false; }
    });
  }

  openModal(vocabulary: Vocabulary | null = null) {
    this.editingVocabulary = vocabulary;
    this.isModalOpen = true;
    if (vocabulary) {
      this.vocabularyForm.patchValue({
        ...vocabulary,
        imageUrl: vocabulary.imageUrl || ''
      });
      this.imagePreview = vocabulary.imageUrl || null;
    } else {
      this.vocabularyForm.reset();
      this.imagePreview = null;
    }
    this.selectedImageFile = null;

    this.initialVocabularyFormValue = JSON.stringify(this.vocabularyForm.value);
    this.initialImagePreview = this.imagePreview;
    this.initialSelectedImageFile = this.selectedImageFile;
  }

  closeModal() {
    if (this.hasVocabularyFormChanged()) {
      this.showCancelConfirm('vocabulary');
    } else {
      this.forceCloseModal();
    }
  }

  forceCloseModal() {
    this.isModalOpen = false;
    this.editingVocabulary = null;
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.initialVocabularyFormValue = null;
    this.initialImagePreview = null;
    this.initialSelectedImageFile = null;
  }

  hasVocabularyFormChanged(): boolean {
    if (!this.initialVocabularyFormValue) return false;

    const currentFormValue = JSON.stringify(this.vocabularyForm.value);
    const formChanged = currentFormValue !== this.initialVocabularyFormValue;

    const imageChanged = this.imagePreview !== this.initialImagePreview ||
      this.selectedImageFile !== this.initialSelectedImageFile;

    return formChanged || imageChanged;
  }

  showCancelConfirm(modalType: 'vocabulary' | 'list') {
    this.confirmType = 'cancel';
    this.confirmTitle = 'Xác nhận hủy';
    this.confirmMessage = 'Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn hủy?';
    this.pendingApprovalList = modalType === 'list' ? {} as VocabularyListResponse : null;
    this.showConfirmModal = true;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (!file.type.startsWith('image/')) {
        this.toastService.error('Vui lòng chọn file ảnh hợp lệ!');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.toastService.error('Kích thước ảnh không được vượt quá 5MB!');
        return;
      }

      this.selectedImageFile = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.vocabularyForm.patchValue({ imageUrl: '' });
  }

  saveVocabulary() {
    console.log('saveVocabulary called');
    console.log('Form valid:', this.vocabularyForm.valid);
    console.log('Form errors:', this.vocabularyForm.errors);
    console.log('Form value:', this.vocabularyForm.value);
    console.log('isSubmitting:', this.isSubmitting);
    console.log('selectedList:', this.selectedList);

    if (this.vocabularyForm.invalid || this.isSubmitting || !this.selectedList) {
      if (!this.selectedList) {
        this.toastService.error("Lỗi: Không có danh sách nào được chọn.");
        return;
      }
      if (this.vocabularyForm.invalid) {
        this.toastService.error("Vui lòng điền đầy đủ thông tin bắt buộc.");
        return;
      }
      return;
    }

    this.isSubmitting = true;
    const formData = this.vocabularyForm.value;
    console.log('Form data to submit:', formData);

    const definitionWithTranslation = formData.translation
      ? `${formData.definition}|||${formData.translation}`
      : formData.definition;

    if (this.editingVocabulary) {
      if (this.selectedImageFile) {
        this.isUploadingImage = true;
        this.toastService.info('Hệ thống đang lưu lại từ vựng...');

        console.log('📤 [STAFF] Uploading image file for UPDATE:', this.selectedImageFile.name, 'Size:', this.selectedImageFile.size);

        this.uploadService.uploadFile(this.selectedImageFile).subscribe({
          next: (response) => {
            console.log('📥 [STAFF] Upload response for UPDATE:', response);
            if (response && response.url) {
              console.log('✅ [STAFF] Image uploaded successfully for UPDATE, URL:', response.url);
              this.updateVocabularyWithImageUrl(formData, definitionWithTranslation, response.url);
            } else {
              console.error('❌ [STAFF] Upload response missing URL for UPDATE:', response);
              this.toastService.error('Upload ảnh thất bại: Không nhận được URL');
              this.isUploadingImage = false;
              this.isSubmitting = false;
            }
          },
          error: (error) => {
            console.error('❌ [STAFF] Error uploading image for UPDATE:', error);
            this.toastService.error('Upload ảnh thất bại. Vui lòng thử lại.');
            this.isUploadingImage = false;
            this.isSubmitting = false;
          }
        });
      } else {
        console.log('ℹ️ [STAFF] No image file selected for UPDATE, using existing imageUrl:', formData.imageUrl);
        const currentImageUrl = formData.imageUrl?.trim();
        const imageUrlToSend = currentImageUrl === '' ? null : (currentImageUrl || undefined);
        this.updateVocabularyWithImageUrl(formData, definitionWithTranslation, imageUrlToSend);
      }
    }
    else {
      if (this.selectedImageFile) {
        this.isUploadingImage = true;
        this.toastService.info('Hệ thống đang lưu lại từ vựng...');

        console.log('📤 [STAFF] Uploading image file for CREATE:', this.selectedImageFile.name, 'Size:', this.selectedImageFile.size);

        this.uploadService.uploadFile(this.selectedImageFile).subscribe({
          next: (response) => {
            console.log('📥 [STAFF] Upload response for CREATE:', response);
            if (response && response.url) {
              console.log('✅ [STAFF] Image uploaded successfully for CREATE, URL:', response.url);
              this.createVocabularyWithImageUrl(formData, definitionWithTranslation, response.url);
            } else {
              console.error('❌ [STAFF] Upload response missing URL for CREATE:', response);
              this.toastService.error('Upload ảnh thất bại: Không nhận được URL');
              this.isUploadingImage = false;
              this.isSubmitting = false;
            }
          },
          error: (error) => {
            console.error('❌ [STAFF] Error uploading image for CREATE:', error);
            this.toastService.error('Upload ảnh thất bại. Vui lòng thử lại.');
            this.isUploadingImage = false;
            this.isSubmitting = false;
          }
        });
      } else {
        console.log('ℹ️ [STAFF] No image file selected for CREATE, creating vocabulary without image');
        this.createVocabularyWithImageUrl(formData, definitionWithTranslation, formData.imageUrl?.trim() || undefined);
      }
    }
  }

  private updateVocabularyWithImageUrl(formData: any, definitionWithTranslation: string, imageUrl: string | undefined): void {
    const updateData: any = {
      word: formData.word,
      typeOfWord: formData.partOfSpeech,
      category: formData.category,
      definition: definitionWithTranslation,
      example: formData.example
    };

    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl || null;
    }

    console.log('Updating vocabulary:', updateData);
    const wasPublished = this.selectedList!.status?.toLowerCase() === 'published';
    this.vocabularyService.updateVocabulary(this.editingVocabulary!.id, updateData).subscribe({
      next: (response: any) => {
        if (response.statusChanged || wasPublished) {
          this.toastService.warning('Từ vựng đã được cập nhật thành công. Danh sách đã được chuyển về trạng thái chờ duyệt. Vui lòng đợi manager duyệt lại.');
        } else {
          this.toastService.success('Cập nhật từ vựng thành công!');
        }
        this.loadVocabularyLists();
        this.reloadSelectedList();
        this.loadVocabularies(this.selectedList!.vocabularyListId);
        this.forceCloseModal();
        this.isSubmitting = false;
        this.isUploadingImage = false;
        this.selectedImageFile = null; // Reset selected file
      },
      error: (error) => {
        console.error('Update vocabulary error:', error);
        this.isSubmitting = false;
        this.isUploadingImage = false;
        this.toastService.error("Cập nhật thất bại.");
      }
    });
  }

  private createVocabularyWithImageUrl(formData: any, definitionWithTranslation: string, imageUrl: string | undefined): void {
    if (!this.selectedList) {
      this.toastService.error('Lỗi: Không có danh sách nào được chọn.');
      this.isSubmitting = false;
      this.isUploadingImage = false;
      return;
    }

    const vocabularyData: any = {
      vocabularyListId: this.selectedList.vocabularyListId,
      word: formData.word,
      typeOfWord: formData.partOfSpeech,
      category: formData.category,
      definition: definitionWithTranslation,
      example: formData.example
    };

    if (imageUrl !== undefined && imageUrl !== null && imageUrl !== '') {
      vocabularyData.imageUrl = imageUrl;
      console.log('✅ [STAFF] Adding imageUrl to request:', imageUrl);
    } else {
      console.warn('⚠️ [STAFF] No imageUrl provided or imageUrl is empty');
    }

    console.log('📤 [STAFF] Sending vocabulary data to backend:', JSON.stringify(vocabularyData, null, 2));
    const wasPublished = this.selectedList.status?.toLowerCase() === 'published';
    this.vocabularyService.createVocabulary(vocabularyData).subscribe({
      next: (response: any) => {
        if (response.statusChanged || wasPublished) {
          this.toastService.warning('Từ vựng đã được thêm thành công. Danh sách đã được chuyển về trạng thái chờ duyệt. Vui lòng đợi manager duyệt lại.');
        } else {
          this.toastService.success('Tạo từ vựng thành công!');
        }
        this.loadVocabularyLists();
        this.reloadSelectedList();
        this.loadVocabularies(this.selectedList!.vocabularyListId);
        this.forceCloseModal();
        this.isSubmitting = false;
        this.isUploadingImage = false;
        this.selectedImageFile = null; // Reset selected file
      },
      error: (error) => {
        console.error('Create vocabulary error:', error);
        this.isSubmitting = false;
        this.isUploadingImage = false;
        this.toastService.error("Tạo từ vựng thất bại.");
      }
    });
  }

  deleteVocabulary(id: number) {
    this.pendingDeleteId = id;
    this.confirmType = 'delete';
    this.confirmTitle = 'Xác nhận xóa';
    this.confirmMessage = 'Bạn có chắc chắn muốn xóa từ vựng này?';
    this.showConfirmModal = true;
  }

  confirmDelete() {
    if (this.pendingDeleteId) {
      this.isLoading = true;
      this.vocabularyService.deleteVocabulary(this.pendingDeleteId).subscribe({
        next: () => {
          this.toastService.success('Xóa từ vựng thành công!');
          if (this.selectedList) this.loadVocabularies(this.selectedList.vocabularyListId);
          this.closeConfirmModal();
        },
        error: (error) => {
          this.toastService.error('Không thể xóa từ vựng.');
          this.isLoading = false;
          this.closeConfirmModal();
        }
      });
    }
  }

  get pagedVocabularies() { const start = (this.page - 1) * this.pageSize; return this.filteredVocabularies.slice(start, start + this.pageSize); }
  updatePagination() { this.totalItems = this.filteredVocabularies.length; this.totalPages = Math.ceil(this.totalItems / this.pageSize) || 1; if (this.page > this.totalPages) this.page = this.totalPages; }
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

  handleImageError(event: Event, vocab: Vocabulary): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    console.warn('Failed to load image for vocabulary:', vocab.word, 'URL:', vocab.imageUrl);
  }

  getStartIndex(): number {
    return (this.page - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }

  speakWord(word: string) { this.speechService.speakWord(word); }
  getCategoryName(categoryId: string): string { const category = this.categories.find(c => c.id === categoryId); return category?.name || categoryId; }
  getPartOfSpeechClass(partOfSpeech: string): string { const lower = partOfSpeech.toLowerCase(); if (lower.includes('verb')) return 'pos-verb'; if (lower.includes('noun')) return 'pos-noun'; return 'pos-other'; }

  requestApproval(list: VocabularyListResponse, event: Event): void {
    event.stopPropagation();
    this.pendingApprovalList = list;
    this.confirmType = 'approval';
    this.confirmTitle = 'Xác nhận gửi phê duyệt';
    this.confirmMessage = 'Bạn có chắc muốn gửi danh sách từ vựng này để phê duyệt?';
    this.showConfirmModal = true;
  }

  confirmApproval() {
    if (this.pendingApprovalList) {
      this.isSubmitting = true;
      this.vocabularyService.requestApproval(this.pendingApprovalList.vocabularyListId).subscribe({
        next: () => {
          this.toastService.success('Đã gửi yêu cầu phê duyệt!');
          this.loadVocabularyLists();
          this.isSubmitting = false;
          this.closeConfirmModal();
        },
        error: (err) => {
          console.error("Error requesting approval:", err);
          this.toastService.error('Gửi yêu cầu thất bại.');
          this.isSubmitting = false;
          this.closeConfirmModal();
        }
      });
    }
  }

  closeConfirmModal() {
    this.showConfirmModal = false;
    this.pendingDeleteId = null;
    this.pendingApprovalList = null;
    this.confirmTitle = '';
    this.confirmMessage = '';
  }

  confirmCancel() {
    if (this.pendingApprovalList) {
      this.forceCloseCreateListModal();
    } else {
      this.forceCloseModal();
    }
    this.closeConfirmModal();
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

  // ===== REJECTION MODAL METHODS =====
  openRejectionModal(list: VocabularyListResponse): void {
    this.selectedRejectedList = list;
    this.showRejectionModal = true;
  }

  closeRejectionModal(): void {
    this.showRejectionModal = false;
    this.selectedRejectedList = null;
  }

  editRejectedList(): void {
    if (this.selectedRejectedList) {
      this.selectList(this.selectedRejectedList);
      this.closeRejectionModal();
    }
  }

  // ===== PAGINATION METHODS FOR VOCABULARY LISTS =====
  get paginatedVocabularyLists(): VocabularyListResponse[] {
    const startIndex = (this.listCurrentPage - 1) * this.listsPerPage;
    const endIndex = startIndex + this.listsPerPage;
    return this.vocabularyLists.slice(startIndex, endIndex);
  }

  get listTotalPages(): number {
    return Math.ceil(this.vocabularyLists.length / this.listsPerPage);
  }

  goToListPage(page: number): void {
    if (page >= 1 && page <= this.listTotalPages) {
      this.listCurrentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextListPage(): void {
    this.goToListPage(this.listCurrentPage + 1);
  }

  previousListPage(): void {
    this.goToListPage(this.listCurrentPage - 1);
  }
}