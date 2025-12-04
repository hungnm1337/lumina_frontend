// src/app/components/staff/vocabulary/vocabulary.component.ts

import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
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
export class VocabularyComponent implements OnInit, OnDestroy {
  // ----- TRẠNG THÁI GIAO DIỆN -----
  currentView: 'lists' | 'words' = 'lists';
  selectedList: VocabularyListResponse | null = null;

  // ----- DỮ LIỆU -----
  vocabularies: Vocabulary[] = [];
  filteredVocabularies: Vocabulary[] = [];
  vocabularyLists: VocabularyListResponse[] = [];
  stats: VocabularyStats[] = [];

  // ----- TRẠNG THÁI BỘ LỌC VÀ TÌM KIẾM -----
  searchTerm = '';
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;
  private subscriptions: Subscription[] = [];

  // ----- TRẠNG THÁI MODAL TẠO TỪ VỰNG -----
  isModalOpen = false;
  editingVocabulary: Vocabulary | null = null;
  vocabularyForm: FormGroup;

  // ----- TRẠNG THÁI MODAL TẠO DANH SÁCH -----
  isListModalOpen = false;
  listForm: FormGroup;

  // ----- TRẠNG THÁI CONFIRMATION MODAL -----
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmType: 'delete' | 'approval' = 'delete';
  pendingDeleteId: number | null = null;
  pendingApprovalList: VocabularyListResponse | null = null;

  // ----- TRẠNG THÁI KHÁC -----
  isLoading = false;
  isSubmitting = false;
  
  // ----- IMAGE UPLOAD STATE -----
  isUploadingImage = false;
  selectedImageFile: File | null = null;
  imagePreview: string | null = null;

  // ----- FORM STATE TRACKING -----
  hasUnsavedChanges = false;

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
  pageSize: number = 6;
  totalItems: number = 0;
  totalPages: number = 0;

  constructor(
    private fb: FormBuilder,
    private vocabularyService: VocabularyService,
    private uploadService: UploadService,
    private toastService: ToastService,
    private speechService: SpeechService,
    private sanitizer: DomSanitizer
  ) {
    // Form cho việc thêm/sửa từ vựng
    this.vocabularyForm = this.fb.group({
      word: ['', [
        Validators.required, 
        Validators.minLength(1),
        Validators.maxLength(100),
        Validators.pattern(/^[a-zA-Z\s\-']+$/) // Chỉ cho phép chữ cái, khoảng trắng, dấu gạch ngang, dấu nháy đơn
      ]],
      category: ['', [
        Validators.required,
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-Z\s\-]+$/) // Chỉ cho phép chữ cái, khoảng trắng, dấu gạch ngang
      ]],
      partOfSpeech: ['', [
        Validators.required,
        Validators.pattern(/^(Noun|Verb|Adjective|Adverb|Preposition|Conjunction|Phrasal Verb)$/)
      ]],
      definition: ['', [Validators.required, Validators.maxLength(1000)]],
      example: ['', [Validators.required, Validators.maxLength(500)]],
      translation: ['', [Validators.required, Validators.maxLength(500)]],
      imageUrl: [''] // Image URL
    });

    // Form cho việc tạo danh sách mới
    this.listForm = this.fb.group({
      name: ['', [
        Validators.required, 
        Validators.minLength(3),
        Validators.maxLength(100),
        Validators.pattern(/^[a-zA-Z0-9\s\-_]+$/)
      ]],
      isPublic: [false]
    });
  }

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
    this.subscriptions.push(this.searchSubscription);

    // Track form changes for unsaved changes warning
    this.vocabularyForm.valueChanges.subscribe(() => {
      this.hasUnsavedChanges = true;
    });
    this.listForm.valueChanges.subscribe(() => {
      this.hasUnsavedChanges = true;
    });
  }

  ngOnDestroy(): void {
    // Unsubscribe all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }

    // Cleanup image preview
    if (this.imagePreview && this.imagePreview.startsWith('data:')) {
      URL.revokeObjectURL(this.imagePreview);
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's' && this.isModalOpen) {
      event.preventDefault();
      if (this.vocabularyForm.valid) {
        this.saveVocabulary();
      }
    }
    if (event.key === 'Escape' && (this.isModalOpen || this.isListModalOpen)) {
      if (this.isModalOpen) {
        this.closeModal();
      } else {
        this.closeCreateListModal();
      }
    }
  }

  // ----- QUẢN LÝ GIAO DIỆN -----
  selectList(list: VocabularyListResponse) {
    this.selectedList = list;
    this.currentView = 'words';
    this.loadVocabularies(list.vocabularyListId);
  }

  // Reload selected list để cập nhật status
  reloadSelectedList() {
    if (this.selectedList) {
      this.isLoading = true;
      const sub = this.vocabularyService.getVocabularyLists(this.searchTerm).subscribe({
        next: (lists) => {
          const updatedList = lists.find(l => l.vocabularyListId === this.selectedList?.vocabularyListId);
          if (updatedList) {
            this.selectedList = updatedList;
          }
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
      this.subscriptions.push(sub);
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

  // ----- TẢI DỮ LIỆU -----
  loadVocabularyLists() {
    this.isLoading = true;
    const sub = this.vocabularyService.getVocabularyLists(this.searchTerm).subscribe({
      next: (lists) => { 
        this.vocabularyLists = lists; 
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

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  clearSearch() {
    this.searchTerm = '';
    this.onSearchChange();
  }

  // ----- STATS METHODS -----
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

  // ----- MODAL DANH SÁCH -----
  openCreateListModal() { 
    this.isListModalOpen = true; 
    this.listForm.reset({ isPublic: false }); 
    this.hasUnsavedChanges = false;
  }
  
  closeCreateListModal() { 
    if (this.hasUnsavedChanges && !confirm('Bạn có chắc muốn đóng? Dữ liệu chưa lưu sẽ bị mất.')) {
      return;
    }
    this.isListModalOpen = false; 
    this.hasUnsavedChanges = false;
  }
  saveNewList() {
    if (this.listForm.invalid || this.isSubmitting) {
      if (this.listForm.invalid) {
        this.listForm.markAllAsTouched();
      }
      return;
    }
    this.isSubmitting = true;
    const sub = this.vocabularyService.createVocabularyList(this.listForm.value).subscribe({
      next: (newList) => {
        this.toastService.success(`Đã tạo danh sách "${newList.name}"!`);
        this.isSubmitting = false; 
        this.hasUnsavedChanges = false;
        this.closeCreateListModal(); 
        this.loadVocabularyLists();
      },
      error: (err) => { 
        this.handleError(err, 'tạo danh sách');
        this.isSubmitting = false; 
      }
    });
    this.subscriptions.push(sub);
  }

  // ----- MODAL TỪ VỰNG (CRUD) -----
  openModal(vocabulary: Vocabulary | null = null) {
    this.editingVocabulary = vocabulary;
    this.isModalOpen = true;
    if (vocabulary) {
      // Dùng patchValue để điền dữ liệu vào form khi chỉnh sửa
      this.vocabularyForm.patchValue({
        ...vocabulary,
        imageUrl: vocabulary.imageUrl || ''
      });
      this.imagePreview = vocabulary.imageUrl || null;
    } else {
      // Reset form khi tạo mới
      this.vocabularyForm.reset();
      this.imagePreview = null;
    }
    this.selectedImageFile = null;
  }

  closeModal() {
    if (this.hasUnsavedChanges && !confirm('Bạn có chắc muốn đóng? Dữ liệu chưa lưu sẽ bị mất.')) {
      return;
    }
    this.isModalOpen = false;
    this.editingVocabulary = null;
    this.selectedImageFile = null;
    // Cleanup image preview
    if (this.imagePreview && this.imagePreview.startsWith('data:')) {
      URL.revokeObjectURL(this.imagePreview);
    }
    this.imagePreview = null;
    this.hasUnsavedChanges = false;
  }
  
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.toastService.error('Vui lòng chọn file ảnh hợp lệ!');
        input.value = ''; // Clear input
        return;
      }

      // Validate file extension
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        this.toastService.error('Định dạng file không được hỗ trợ. Chỉ chấp nhận: JPG, PNG, GIF, WEBP');
        input.value = ''; // Clear input
        return;
      }
      
      // Validate file size (max 5MB) - TRƯỚC khi tạo preview
      if (file.size > 5 * 1024 * 1024) {
        this.toastService.error('Kích thước ảnh không được vượt quá 5MB!');
        input.value = ''; // Clear input
        return;
      }
      
      // Revoke previous preview URL if exists
      if (this.imagePreview && this.imagePreview.startsWith('data:')) {
        URL.revokeObjectURL(this.imagePreview);
      }
      
      this.selectedImageFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.onerror = () => {
        this.toastService.error('Lỗi khi đọc file ảnh');
        this.selectedImageFile = null;
        this.imagePreview = null;
        input.value = ''; // Clear input
      };
      reader.readAsDataURL(file);
    }
  }
  
  removeImage(): void {
    // Cleanup image preview
    if (this.imagePreview && this.imagePreview.startsWith('data:')) {
      URL.revokeObjectURL(this.imagePreview);
    }
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.vocabularyForm.patchValue({ imageUrl: '' });
  }
  
  saveVocabulary() {
    // Prevent multiple submissions
    if (this.isSubmitting || this.isUploadingImage) {
      this.toastService.warning('Đang xử lý, vui lòng đợi...');
      return;
    }
    
    if (this.vocabularyForm.invalid || !this.selectedList) {
      if (!this.selectedList) {
        this.toastService.error("Lỗi: Không có danh sách nào được chọn.");
        return;
      }
      if (this.vocabularyForm.invalid) {
        this.toastService.error("Vui lòng điền đầy đủ thông tin bắt buộc.");
        this.vocabularyForm.markAllAsTouched();
        return;
      }
      return;
    }
    
    this.isSubmitting = true;
    const formData = this.vocabularyForm.value;

    // Validate translation không chứa "|||" sẽ gây lỗi parsing
    if (formData.translation && formData.translation.includes('|||')) {
      this.toastService.error('Translation không được chứa ký tự "|||"');
      this.isSubmitting = false;
      return;
    }

    // Validate duplicate word
    if (!this.validateDuplicateWord(formData.word)) {
      this.isSubmitting = false;
      return;
    }

    // Sanitize HTML content to prevent XSS
    const sanitizedDefinition = this.sanitizeHtmlContent(formData.definition || '');
    const sanitizedTranslation = this.sanitizeHtmlContent(formData.translation || '');
    const sanitizedExample = this.sanitizeHtmlContent(formData.example || '');

    // Lưu translation vào definition field với format "DEFINITION|||TRANSLATION"
    // Vì backend không có translation field riêng
    const definitionWithTranslation = sanitizedTranslation 
      ? `${sanitizedDefinition}|||${sanitizedTranslation}`
      : sanitizedDefinition;

    // Update formData với sanitized values
    formData.definition = sanitizedDefinition;
    formData.translation = sanitizedTranslation;
    formData.example = sanitizedExample;

    // Logic cho CHỈNH SỬA
    if (this.editingVocabulary) {
      // Nếu có file ảnh mới được chọn, upload lên Cloudinary trước
      if (this.selectedImageFile) {
        this.isUploadingImage = true;
        this.toastService.info('Hệ thống đang lưu lại từ vựng...');
        
        this.uploadService.uploadFile(this.selectedImageFile).subscribe({
          next: (response) => {
            if (response && response.url) {
              // Sau khi upload thành công, tiếp tục update vocabulary với imageUrl mới
              this.updateVocabularyWithImageUrl(formData, definitionWithTranslation, response.url);
            } else {
              this.handleError({ status: 0, error: { message: 'Upload ảnh thất bại: Không nhận được URL' } }, 'upload ảnh');
              this.isUploadingImage = false;
              this.isSubmitting = false;
            }
          },
          error: (error) => {
            this.handleError(error, 'upload ảnh');
            this.isUploadingImage = false;
            this.isSubmitting = false;
          }
        });
      } else {
        // Không có file mới, update vocabulary với imageUrl hiện tại (hoặc rỗng nếu đã xóa)
        const currentImageUrl = formData.imageUrl?.trim();
        const imageUrlToSend = currentImageUrl === '' ? null : (currentImageUrl || undefined);
        this.updateVocabularyWithImageUrl(formData, definitionWithTranslation, imageUrlToSend);
      }
    }
    // Logic cho TẠO MỚI
    else {
      // Nếu có file ảnh mới được chọn, upload lên Cloudinary trước
      if (this.selectedImageFile) {
        this.isUploadingImage = true;
        this.toastService.info('Hệ thống đang lưu lại từ vựng...');
        
        this.uploadService.uploadFile(this.selectedImageFile).subscribe({
          next: (response) => {
            if (response && response.url) {
              // Sau khi upload thành công, tiếp tục tạo vocabulary với imageUrl mới
              this.createVocabularyWithImageUrl(formData, definitionWithTranslation, response.url);
            } else {
              this.handleError({ status: 0, error: { message: 'Upload ảnh thất bại: Không nhận được URL' } }, 'upload ảnh');
              this.isUploadingImage = false;
              this.isSubmitting = false;
            }
          },
          error: (error) => {
            this.handleError(error, 'upload ảnh');
            this.isUploadingImage = false;
            this.isSubmitting = false;
          }
        });
      } else {
        // Không có file mới, tạo vocabulary với imageUrl hiện tại (nếu có)
        this.createVocabularyWithImageUrl(formData, definitionWithTranslation, formData.imageUrl?.trim() || undefined);
      }
    }
  }

  // Validate duplicate word in the same list
  validateDuplicateWord(word: string): boolean {
    if (!this.selectedList) return true;
    
    const existingWord = this.vocabularies.find(
      v => v.word.toLowerCase() === word.toLowerCase() && 
      v.id !== this.editingVocabulary?.id
    );
    
    if (existingWord) {
      this.toastService.warning(`Từ "${word}" đã tồn tại trong danh sách này.`);
      return false;
    }
    return true;
  }

  // Sanitize HTML content to prevent XSS
  private sanitizeHtmlContent(html: string): string {
    if (!html || html.trim() === '') return '';
    
    // Remove script tags and event handlers
    let sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '');
    
    // Allow safe HTML tags
    const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                        'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre'];
    
    // Create a temporary element to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = sanitized;
    
    // Remove disallowed tags
    const allElements = temp.querySelectorAll('*');
    allElements.forEach(el => {
      const tagName = el.tagName.toLowerCase();
      if (!allowedTags.includes(tagName)) {
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
        }
      } else {
        // Remove dangerous attributes
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('on') || (attr.name === 'href' && attr.value.startsWith('javascript:'))) {
            el.removeAttribute(attr.name);
          }
        });
      }
    });
    
    return temp.innerHTML;
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

  private updateVocabularyWithImageUrl(formData: any, definitionWithTranslation: string, imageUrl: string | undefined): void {
    const updateData: any = {
      word: formData.word, 
      typeOfWord: formData.partOfSpeech, 
      category: formData.category,
      definition: definitionWithTranslation, 
      example: formData.example
    };
    
    // Chỉ thêm imageUrl vào request nếu có giá trị
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl || null; // Nếu empty string, gửi null để xóa ảnh
    }
    
    const wasPublished = this.selectedList!.status?.toLowerCase() === 'published';
    this.vocabularyService.updateVocabulary(this.editingVocabulary!.id, updateData).subscribe({
        next: (response: any) => {
          if (response.statusChanged || wasPublished) {
            this.toastService.warning('Từ vựng đã được cập nhật thành công. Danh sách đã được chuyển về trạng thái chờ duyệt. Vui lòng đợi manager duyệt lại.');
          } else {
            this.toastService.success('Cập nhật từ vựng thành công!');
          }
          // Reload cả vocabulary list để cập nhật status
          this.loadVocabularyLists();
          // Reload selected list để cập nhật status hiển thị
          this.reloadSelectedList();
          this.loadVocabularies(this.selectedList!.vocabularyListId);
          this.hasUnsavedChanges = false;
          this.closeModal();
          this.isSubmitting = false;
          this.isUploadingImage = false;
          this.selectedImageFile = null; // Reset selected file
        },
        error: (error) => { 
          this.handleError(error, 'cập nhật từ vựng');
          this.isSubmitting = false;
          this.isUploadingImage = false;
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
      
      // Chỉ thêm imageUrl vào request nếu có giá trị
      if (imageUrl !== undefined && imageUrl !== null && imageUrl !== '') {
        vocabularyData.imageUrl = imageUrl;
      }
      
      const wasPublished = this.selectedList.status?.toLowerCase() === 'published';
      this.vocabularyService.createVocabulary(vocabularyData).subscribe({
        next: (response: any) => {
          if (response.statusChanged || wasPublished) {
            this.toastService.warning('Từ vựng đã được thêm thành công. Danh sách đã được chuyển về trạng thái chờ duyệt. Vui lòng đợi manager duyệt lại.');
          } else {
            this.toastService.success('Tạo từ vựng thành công!');
          }
          // Reload cả vocabulary list để cập nhật status
          this.loadVocabularyLists();
          // Reload selected list để cập nhật status hiển thị
          this.reloadSelectedList();
          this.loadVocabularies(this.selectedList!.vocabularyListId);
          this.hasUnsavedChanges = false;
          this.closeModal();
          this.isSubmitting = false;
          this.isUploadingImage = false;
          this.selectedImageFile = null; // Reset selected file
        },
        error: (error) => { 
          this.handleError(error, 'tạo từ vựng');
          this.isSubmitting = false;
          this.isUploadingImage = false;
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
      const sub = this.vocabularyService.deleteVocabulary(this.pendingDeleteId).subscribe({
        next: () => {
          this.toastService.success('Xóa từ vựng thành công!');
          if (this.selectedList) this.loadVocabularies(this.selectedList.vocabularyListId);
          this.closeConfirmModal();
        },
        error: (error) => { 
          this.handleError(error, 'xóa từ vựng');
          this.isLoading = false;
          this.closeConfirmModal();
        }
      });
      this.subscriptions.push(sub);
    }
  }

  // ----- PHÂN TRANG -----
  get pagedVocabularies() { 
    const start = (this.page - 1) * this.pageSize; 
    return this.filteredVocabularies.slice(start, start + this.pageSize); 
  }
  
  updatePagination() { 
    this.totalItems = this.filteredVocabularies.length; 
    this.totalPages = Math.ceil(this.totalItems / this.pageSize) || 1; 
    if (this.page > this.totalPages && this.totalPages > 0) {
      this.page = this.totalPages; 
    }
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

  // Handle image error
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

  // ----- HELPERS & TEXT-TO-SPEECH -----
  speakWord(word: string) { this.speechService.speakWord(word); }
  getCategoryName(categoryId: string): string { const category = this.categories.find(c => c.id === categoryId); return category?.name || categoryId; }
  getPartOfSpeechClass(partOfSpeech: string): string { const lower = partOfSpeech.toLowerCase(); if (lower.includes('verb')) return 'pos-verb'; if (lower.includes('noun')) return 'pos-noun'; return 'pos-other'; }

  // ===== APPROVAL METHODS =====
  requestApproval(list: VocabularyListResponse, event: Event): void {
    event.stopPropagation(); // Ngăn click vào card
    this.pendingApprovalList = list;
    this.confirmType = 'approval';
    this.confirmTitle = 'Xác nhận gửi phê duyệt';
    this.confirmMessage = 'Bạn có chắc muốn gửi danh sách từ vựng này để phê duyệt?';
    this.showConfirmModal = true;
  }

  confirmApproval() {
    if (this.pendingApprovalList) {
      this.isSubmitting = true;
      const sub = this.vocabularyService.requestApproval(this.pendingApprovalList.vocabularyListId).subscribe({
        next: () => {
          this.toastService.success('Đã gửi yêu cầu phê duyệt!');
          this.loadVocabularyLists(); // Reload lists
          this.isSubmitting = false;
          this.closeConfirmModal();
        },
        error: (err) => {
          this.handleError(err, 'gửi yêu cầu phê duyệt');
          this.isSubmitting = false;
          this.closeConfirmModal();
        }
      });
      this.subscriptions.push(sub);
    }
  }

  closeConfirmModal() {
    this.showConfirmModal = false;
    this.pendingDeleteId = null;
    this.pendingApprovalList = null;
    this.confirmTitle = '';
    this.confirmMessage = '';
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
}