import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ArticleService } from '../../../../Services/Article/article.service';
import { ToastService } from '../../../../Services/Toast/toast.service';
import { AuthService } from '../../../../Services/Auth/auth.service';
import { UploadService } from '../../../../Services/Upload/upload.service';
import {
  Article,
  ArticleCategory,
  ArticleCreate
} from '../../../../Interfaces/article.interfaces';
import { QuillModule } from 'ngx-quill';
import Quill from 'quill';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule,QuillModule ],
  templateUrl: './articles.component.html',
  styleUrls: ['./articles.component.scss']
})
export class ArticlesComponent implements OnInit {
  // Data Properties
  articles: Article[] = [];
  filteredArticles: Article[] = [];
  categories: ArticleCategory[] = [];
  categoryNames: string[] = [];
  
  // State Properties - CHANGED TO STAFF
  isStaff = false;  // Changed from isManager
  isModalOpen = false;
  isAddCategoryModalOpen = false;
  editingArticle: Article | null = null;
  isLoading = true;
  isSubmitting = false;
  
  // Form Properties
  articleForm: FormGroup;
  categoryForm: FormGroup;
  isSubmittingCategory = false;
  
  // Filter Properties
  searchTerm = '';
  selectedCategory = '';
  selectedStatus: 'draft' | 'pending' | 'published' | '' = '';
  
  // Pagination Properties
  page = 1;
  pageSize = 6;
  total = 0;
  sortBy: 'createdAt' | 'title' | 'category' = 'createdAt';
  sortDir: 'asc' | 'desc' = 'desc';
  
  // Utility Properties
  Math = Math;

  // Upload state
  uploadingImages: { [key: number]: boolean } = {}; // Track upload state per section index

  // Confirmation Modal Properties
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmType: 'delete' | 'approval' | 'reject' = 'delete';
  pendingAction: (() => void) | null = null;
  
  // Quill editor instances - store references to each editor
  quillEditors: Map<number, any> = new Map(); // Map section index to Quill instance

  // Section types for dropdown
  sectionTypes = [
    { value: 'đoạn văn', label: 'Đoạn văn' },
    { value: 'hình ảnh', label: 'Hình ảnh' },
    { value: 'video', label: 'Video' },
    { value: 'danh sách', label: 'Danh sách' }
  ];

  // Quill editor configuration - will be set dynamically per section
  quillModules: any = {};

  constructor(
    private fb: FormBuilder,
    private articleService: ArticleService,
    private toastService: ToastService,
    private authService: AuthService,
    private uploadService: UploadService
  ) {
    this.articleForm = this.fb.group({
      category: ['', Validators.required],
      title: ['', [Validators.required, Validators.minLength(5)]],
      summary: ['', [Validators.required, Validators.minLength(20)]],
      sections: this.fb.array([]),
      tags: ['']
    });

    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]]
    });
  }

  // ===== UPDATED NGONINIT - STAFF LOGIC =====
  ngOnInit() {
    const roleId = this.authService.getRoleId();
    // Staff can create/edit content (roleId = 3)
    this.isStaff = (roleId === 3);
    this.loadCategories();
    this.loadArticles();
  }

  // ===== ROLE CHECKING METHODS =====
  isManagerRole(): boolean {
    const roleId = this.authService.getRoleId();
    return roleId === 2; // Only Manager can approve/reject
  }

  canEditArticle(article: Article): boolean {
    // Staff can edit their own articles or all if they have permission
    return this.isStaff;
  }

  canApproveReject(): boolean {
    return this.isManagerRole();
  }

  // ===== FORM ARRAY GETTERS =====
  get sections(): FormArray {
    return this.articleForm.get('sections') as FormArray;
  }

  // ===== SECTION MANAGEMENT METHODS =====
  createSectionFormGroup(): FormGroup {
    const formGroup = this.fb.group({
      type: ['đoạn văn', Validators.required],
      content: [''],
      sectionTitle: ['', Validators.required],
      youtubeUrl: [''] // Keep for backward compatibility, but not used in UI
    });

    // Custom validator: content is required
    // For video type, content should contain YouTube URL
    formGroup.get('content')?.setValidators([
      (control) => {
        const type = formGroup.get('type')?.value;
        const content = control.value || '';
        
        if (!content || content.trim() === '') {
          return { required: true };
        }
        
        // If type is video, check if content contains YouTube URL
        if (type === 'video') {
          const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
          if (!youtubeRegex.test(content.trim())) {
            return { invalidYoutubeUrl: true };
          }
        }
        
        return null;
      }
    ]);

    // Update validation when type changes
    formGroup.get('type')?.valueChanges.subscribe(() => {
      formGroup.get('content')?.updateValueAndValidity();
    });

    return formGroup;
  }

  addSection(): void {
    this.sections.push(this.createSectionFormGroup());
  }

  removeSection(index: number): void {
    if (this.sections.length > 1) {
      this.sections.removeAt(index);
    }
  }

  moveSectionUp(index: number): void {
    if (index > 0) {
      const section = this.sections.at(index);
      this.sections.removeAt(index);
      this.sections.insert(index - 1, section);
    }
  }

  moveSectionDown(index: number): void {
    if (index < this.sections.length - 1) {
      const section = this.sections.at(index);
      this.sections.removeAt(index);
      this.sections.insert(index + 1, section);
    }
  }

  // ===== DATA LOADING METHODS =====
  loadCategories(): void {
    this.articleService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.categoryNames = categories.map(cat => cat.name);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.toastService.error('Không thể tải danh mục bài viết');
      }
    });
  }

  loadArticles(): void {
    this.isLoading = true;
    this.articleService.queryArticles({
      page: this.page,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
      search: this.searchTerm || undefined,
      status: this.selectedStatus || undefined
    }).subscribe({
      next: (res) => {
        this.articles = res.items.map(article => this.articleService.convertToArticle(article));
        this.filteredArticles = this.articles;
        this.total = res.total;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading articles:', error);
        this.toastService.error('Không thể tải danh sách bài viết');
        this.isLoading = false;
        this.articles = [];
        this.filteredArticles = [];
      }
    });
  }

  // ===== FILTER & SEARCH METHODS =====
  onFilterChange(): void {
    this.page = 1;
    this.loadArticles();
  }

  onSearchChange(): void {
    this.onFilterChange();
  }

  onCategoryChange(): void {
    this.onFilterChange();
  }

  onStatusChange(): void {
    this.onFilterChange();
  }

  // ===== PAGINATION METHODS =====
  nextPage(): void {
    if (this.page * this.pageSize < this.total) {
      this.page += 1;
      this.loadArticles();
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page -= 1;
      this.loadArticles();
    }
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.page = 1;
    this.loadArticles();
  }

  changeSort(sortBy: 'createdAt'|'title'|'category', sortDir: 'asc'|'desc'): void {
    this.sortBy = sortBy;
    this.sortDir = sortDir;
    this.page = 1;
    this.loadArticles();
  }

  // ===== MODAL MANAGEMENT =====
  openModal(article: Article | null = null): void {
    this.editingArticle = article;
    this.isModalOpen = true;
    
    // Clear existing sections
    while (this.sections.length !== 0) {
      this.sections.removeAt(0);
    }

    if (article) {
      // Edit mode
      this.articleForm.patchValue({
        category: article.category,
        title: article.title,
        summary: article.summary,
        tags: article.tags ? article.tags.join(', ') : ''
      });

      // Add sections từ dữ liệu có sẵn
      if (article.sections && article.sections.length > 0) {
        article.sections.forEach(sectionData => {
          // Extract YouTube URL from content if it's a YouTube link
          let youtubeUrl = '';
          let content = sectionData.content || '';
          
          // Check if content contains YouTube URL
          const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
          const match = content.match(youtubeRegex);
          if (match) {
            youtubeUrl = content;
            content = ''; // Clear content if YouTube URL is found
          }
          
          this.sections.push(this.fb.group({
            type: [sectionData.type || 'đoạn văn', Validators.required],
            content: [content, Validators.required],
            sectionTitle: [sectionData.sectionTitle || '', Validators.required],
            youtubeUrl: [youtubeUrl]
          }));
        });
      } else {
        // Thêm ít nhất 1 section nếu không có
        this.addSection();
      }
    } else {
      // Create mode
      this.articleForm.reset({ 
        category: '', 
        title: '',
        summary: '',
        tags: ''
      });
      this.addSection(); // Tạo section đầu tiên
    }
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingArticle = null;
    this.articleForm.reset();
    while (this.sections.length !== 0) {
      this.sections.removeAt(0);
    }
    // Clear Quill editor references
    this.quillEditors.clear();
    this.uploadingImages = {};
  }

  // ===== CRUD OPERATIONS =====
  saveArticle(): void {
    if (!this.articleForm.valid) {
      this.toastService.error("Vui lòng điền đầy đủ các trường bắt buộc.");
      return;
    }

    this.isSubmitting = true;
    const formData = this.articleForm.value;
    const selectedCategory = this.categories.find(cat => cat.name === formData.category);
    
    if (!selectedCategory) {
      this.toastService.error('Vui lòng chọn danh mục hợp lệ');
      this.isSubmitting = false;
      return;
    }

    // Process tags
    const tagsArray = formData.tags ? 
      formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag) : 
      [];

    // Debug: Log section content before saving
    console.log('=== SAVING ARTICLE ===');
    console.log('Form sections:', formData.sections);
    
    const articlePayload = {
      title: formData.title,
      summary: formData.summary,
      categoryId: selectedCategory.id,
      tags: tagsArray,
      sections: formData.sections.map((section: any, index: number) => {
        let content = section.content;
        
        // Get Quill instance to extract HTML if content is Delta format
        const quill = this.quillEditors.get(index);
        if (quill) {
          try {
            // Try to get HTML from Quill editor
            const editorElement = quill.root || quill.container?.querySelector('.ql-editor');
            if (editorElement) {
              content = editorElement.innerHTML;
              console.log(`Section ${index} - Extracted HTML from Quill:`, content);
            }
          } catch (e) {
            console.warn(`Section ${index} - Could not extract HTML from Quill:`, e);
          }
        }
        
        // Check if content is Delta format (JSON)
        if (typeof content === 'string') {
          try {
            const parsed = JSON.parse(content);
            if (parsed && parsed.ops) {
              console.log(`Section ${index} - Content is Delta format, converting to HTML...`);
              // Convert Delta to HTML
              content = this.convertDeltaToHtmlString(parsed);
              console.log(`Section ${index} - Converted HTML:`, content);
            }
          } catch (e) {
            // Not JSON, assume it's HTML
            console.log(`Section ${index} - Content is already HTML`);
          }
        }
        
        console.log(`Section ${index} final content:`, content);
        console.log(`Section ${index} contains img tag:`, content?.includes('<img'));
        
        // If type is video, extract YouTube URL from content if it's a plain URL
        let finalContent = content;
        if (section.type === 'video') {
          // Check if content is a plain YouTube URL (not HTML)
          const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
          const match = content.trim().match(youtubeRegex);
          
          if (match) {
            // Content is a plain YouTube URL, use it directly
            finalContent = content.trim();
          } else {
            // Content might be HTML from Quill, try to extract YouTube URL from it
            const htmlMatch = content.match(youtubeRegex);
            if (htmlMatch) {
              finalContent = htmlMatch[0];
            }
          }
        }
        
        return {
          sectionTitle: section.sectionTitle || `Section ${index + 1}`,
          sectionContent: finalContent,
          type: section.type,
          orderIndex: index
        };
      })
    };
    
    console.log('Article payload to send:', JSON.stringify(articlePayload, null, 2));

    if (this.editingArticle) {
      // Update existing article
      const wasPublished = this.editingArticle.status === 'published';
      
      this.articleService.updateArticle(this.editingArticle.id, articlePayload).subscribe({
        next: (response: any) => {
          if (wasPublished && response?.status === 'pending') {
            this.toastService.warning('Bài viết đã được cập nhật và chuyển về trạng thái chờ duyệt. Vui lòng đợi manager duyệt lại.');
          } else {
            this.toastService.success('Cập nhật bài viết thành công!');
          }
          this.finalizeSave();
        },
        error: (err) => this.handleSaveError(err, 'cập nhật')
      });
    } else {
      // Create new article
      const createPayload: ArticleCreate = { 
        ...articlePayload, 
        publishNow: false 
      };
      
      this.articleService.createArticle(createPayload).subscribe({
        next: () => {
          this.toastService.success('Tạo bài viết thành công!');
          this.finalizeSave();
        },
        error: (err) => this.handleSaveError(err, 'tạo mới')
      });
    }
  }

  deleteArticle(id: number): void {
    const article = this.filteredArticles.find(a => a.id === id);
    this.confirmType = 'delete';
    this.confirmTitle = 'Xác nhận xóa';
    this.confirmMessage = `Bạn có chắc chắn muốn xóa bài viết "${article?.title || 'này'}"?`;
    this.pendingAction = () => {
      this.isLoading = true;
      this.articleService.deleteArticle(id).subscribe({
        next: () => {
          this.toastService.success('Xóa bài viết thành công!');
          this.loadArticles();
          this.closeConfirmModal();
        },
        error: (error) => {
          this.toastService.error('Không thể xóa bài viết.');
          this.isLoading = false;
          this.closeConfirmModal();
        }
      });
    };
    this.showConfirmModal = true;
  }

  submitForApproval(id: number): void {
    const article = this.filteredArticles.find(a => a.id === id);
    const isResubmission = article?.rejectionReason;
    this.confirmType = 'approval';
    this.confirmTitle = isResubmission ? 'Xác nhận gửi lại' : 'Xác nhận gửi phê duyệt';
    this.confirmMessage = isResubmission 
      ? `Bạn có chắc muốn gửi lại bài viết "${article?.title || 'này'}" để phê duyệt?`
      : `Bạn có chắc muốn gửi bài viết "${article?.title || 'này'}" để phê duyệt?`;
    this.pendingAction = () => {
      this.isLoading = true;
      this.articleService.requestApproval(id).subscribe({
        next: () => {
          if (isResubmission) {
            this.toastService.success('Bài viết đã được gửi lại để duyệt!');
            if (article) {
              article.rejectionReason = undefined;
            }
          } else {
            this.toastService.success('Đã gửi yêu cầu phê duyệt!');
          }
          
          if (article) {
            article.status = 'pending';
          }
          this.isLoading = false;
          this.closeConfirmModal();
        },
        error: (err) => {
          console.error("Error submitting for approval:", err);
          this.toastService.error('Gửi yêu cầu thất bại.');
          this.isLoading = false;
          this.closeConfirmModal();
        }
      });
    };
    this.showConfirmModal = true;
  }

  // ===== MANAGER-ONLY OPERATIONS =====
  approveArticle(id: number): void {
    if (!this.isManagerRole()) {
      this.toastService.error('Bạn không có quyền phê duyệt bài viết.');
      return;
    }
    
    this.isLoading = true;
    this.articleService.reviewArticle(id, true).subscribe({
      next: () => {
        this.toastService.success('Đã phê duyệt và xuất bản bài viết!');
        this.loadArticles();
      },
      error: () => {
        this.toastService.error('Phê duyệt thất bại.');
        this.isLoading = false;
      }
    });
  }

  rejectArticle(id: number): void {
    if (!this.isManagerRole()) {
      this.toastService.error('Bạn không có quyền từ chối bài viết.');
      return;
    }
    
    const article = this.filteredArticles.find(a => a.id === id);
    this.confirmType = 'reject';
    this.confirmTitle = 'Xác nhận từ chối';
    this.confirmMessage = `Bạn có chắc muốn từ chối và trả bài viết "${article?.title || 'này'}" về trạng thái Nháp?`;
    this.pendingAction = () => {
      this.isLoading = true;
      this.articleService.reviewArticle(id, false).subscribe({
        next: () => {
          this.toastService.info('Đã từ chối và trả lại bài viết.');
          this.loadArticles();
          this.closeConfirmModal();
        },
        error: () => {
          this.toastService.error('Từ chối thất bại.');
          this.isLoading = false;
          this.closeConfirmModal();
        }
      });
    };
    this.showConfirmModal = true;
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.confirmTitle = '';
    this.confirmMessage = '';
    this.pendingAction = null;
  }

  confirmAction(): void {
    if (this.pendingAction) {
      this.pendingAction();
    }
  }

  // ===== HELPER METHODS =====
  private finalizeSave(): void {
    this.isSubmitting = false;
    this.closeModal();
    this.loadArticles();
  }

  private handleSaveError(error: any, action: string): void {
    this.isSubmitting = false;
    console.error(`Error ${action} article:`, error);
    this.toastService.error(`Không thể ${action} bài viết. Vui lòng thử lại.`);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'published': return 'status-published';
      case 'draft': return 'status-draft';
      case 'pending': return 'status-pending';
      default: return '';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'published': return 'Đã xuất bản';
      case 'draft': return 'Bản nháp';
      case 'pending': return 'Chờ duyệt';
      default: return status;
    }
  }

  // ===== STATISTICS METHODS =====
  getPublishedCount(): number {
    return this.filteredArticles.filter(a => a.status === 'published').length;
  }

  getPendingCount(): number {
    return this.filteredArticles.filter(a => a.status === 'pending').length;
  }

  getDraftCount(): number {
    return this.filteredArticles.filter(a => a.status === 'draft').length;
  }

  getCategoryCount(categoryName: string): number {
    return this.filteredArticles.filter(a => a.category === categoryName).length;
  }

  // ===== TEMPLATE HELPER METHODS =====
  getSectionCount(article: Article): number {
    return article.sections ? article.sections.length : 0;
  }

  getArticleDate(article: Article): Date {
    return (article as any).createdDate || (article as any).updatedDate || (article as any).createdAt || new Date();
  }

  getAuthorName(article: Article): string {
    if ((article as any).author?.name) {
      return (article as any).author.name;
    }
    if ((article as any).authorName) {
      return (article as any).authorName;
    }
    if ((article as any).authorId) {
      return `User #${(article as any).authorId}`;
    }
    return 'Staff User';
  }

  // ===== QUICK ACTION METHODS =====
  filterByStatus(status: string): void {
    this.selectedStatus = status as any;
    this.onStatusChange();
  }

  showMyDrafts(): void {
    this.filterByStatus('draft');
  }

  showPendingReview(): void {
    this.filterByStatus('pending');
  }

  showPublished(): void {
    this.filterByStatus('published');
  }

  // ===== QUILL EDITOR IMAGE/VIDEO HANDLERS =====
  imageHandler(sectionIndex: number) {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        this.toastService.error('Kích thước ảnh không được vượt quá 10MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.toastService.error('Vui lòng chọn file ảnh hợp lệ');
        return;
      }

      this.uploadImageToCloudinary(file, sectionIndex);
    };
  }

  videoHandler(sectionIndex: number) {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'video/*');
    input.click();

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      // Validate file size (max 100MB for video)
      if (file.size > 100 * 1024 * 1024) {
        this.toastService.error('Kích thước video không được vượt quá 100MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('video/')) {
        this.toastService.error('Vui lòng chọn file video hợp lệ');
        return;
      }

      this.uploadVideoToCloudinary(file, sectionIndex);
    };
  }

  uploadImageToCloudinary(file: File, sectionIndex: number): void {
    this.uploadingImages[sectionIndex] = true;
    this.toastService.info('Đang upload ảnh lên Cloudinary...');

    this.uploadService.uploadFile(file).subscribe({
      next: (response) => {
        if (response && response.url) {
          // Insert image into Quill editor
          this.insertImageIntoEditor(response.url, sectionIndex);
          this.toastService.success('Upload ảnh thành công!');
        } else {
          this.toastService.error('Upload ảnh thất bại: Không nhận được URL');
        }
        this.uploadingImages[sectionIndex] = false;
      },
      error: (error) => {
        console.error('Error uploading image:', error);
        this.toastService.error('Upload ảnh thất bại. Vui lòng thử lại.');
        this.uploadingImages[sectionIndex] = false;
      }
    });
  }

  uploadVideoToCloudinary(file: File, sectionIndex: number): void {
    this.uploadingImages[sectionIndex] = true;
    this.toastService.info('Đang upload video lên Cloudinary...');

    this.uploadService.uploadFile(file).subscribe({
      next: (response) => {
        if (response && response.url) {
          // Insert video into Quill editor
          this.insertVideoIntoEditor(response.url, sectionIndex);
          this.toastService.success('Upload video thành công!');
        } else {
          this.toastService.error('Upload video thất bại: Không nhận được URL');
        }
        this.uploadingImages[sectionIndex] = false;
      },
      error: (error) => {
        console.error('Error uploading video:', error);
        this.toastService.error('Upload video thất bại. Vui lòng thử lại.');
        this.uploadingImages[sectionIndex] = false;
      }
    });
  }

  insertImageIntoEditor(imageUrl: string, sectionIndex: number): void {
    // Try to get Quill instance from stored map first
    let quill = this.quillEditors.get(sectionIndex);
    
    // Check if we have a valid Quill instance
    if (quill && typeof quill.getSelection === 'function') {
      try {
        this.insertImageToQuill(quill, imageUrl);
        return;
      } catch (error) {
        console.error('Error inserting image into Quill, using form control fallback:', error);
      }
    }
    
    // Fallback: Update form control directly (ngx-quill will sync automatically)
    // This is more reliable than trying to manipulate Quill instance
    console.log('Using form control method to insert image');
    this.insertImageToFormControl(imageUrl, sectionIndex);
  }

  // Fallback: Insert image HTML directly into form control
  private insertImageToFormControl(imageUrl: string, sectionIndex: number): void {
    const sectionControl = this.sections.at(sectionIndex);
    if (sectionControl) {
      const currentContent = sectionControl.get('content')?.value || '';
      
      // Check if content is Delta format
      let currentHtml = currentContent;
      try {
        const parsed = JSON.parse(currentContent);
        if (parsed && parsed.ops) {
          // Convert Delta to HTML first
          currentHtml = this.convertDeltaToHtmlString(parsed);
        }
      } catch (e) {
        // Already HTML
      }
      
      const imageHtml = `<img src="${imageUrl}" alt="Uploaded image" style="max-width: 100%; height: auto; display: block; margin: 1rem auto;" />`;
      const newContent = currentHtml ? `${currentHtml}<p><br></p>${imageHtml}` : `<p>${imageHtml}</p>`;
      
      // Update form control - ngx-quill will sync automatically
      sectionControl.get('content')?.setValue(newContent);
      console.log('Image inserted via form control:', imageUrl);
      console.log('New content:', newContent);
    }
  }

  private insertImageToQuill(quill: any, imageUrl: string): void {
    // Ensure we have the actual Quill instance
    let actualQuill = quill;
    
    // If it's not a Quill instance, try to get it
    if (!actualQuill || typeof actualQuill.getSelection !== 'function') {
      // Try to get from stored object
      if (quill && quill.quillEditor) {
        actualQuill = quill.quillEditor;
      } else if (quill && quill.quill) {
        actualQuill = quill.quill;
      } else if (quill && quill.getQuill) {
        actualQuill = quill.getQuill();
      }
    }
    
    // If still not valid, try to find from DOM
    if (!actualQuill || typeof actualQuill.getSelection !== 'function') {
      console.warn('Invalid Quill instance, trying to find from DOM...');
      return; // Will use form control fallback
    }
    
    try {
      // Get current selection or use end of document
      let range = actualQuill.getSelection(true);
      if (!range || range.length === 0) {
        // If no selection, get the length and set cursor at end
        const length = actualQuill.getLength();
        range = { index: length - 1, length: 0 };
      }
      
      const index = range.index;
      
      // Insert image using insertEmbed
      actualQuill.insertEmbed(index, 'image', imageUrl, 'user');
      
      // Move cursor after image
      actualQuill.setSelection(index + 1);
      
      console.log('Image inserted successfully into Quill:', imageUrl);
    } catch (error) {
      console.error('Error inserting image into Quill:', error);
      // Fallback: insert as HTML using clipboard
      try {
        const length = actualQuill.getLength();
        actualQuill.insertText(length - 1, '\n');
        actualQuill.clipboard.dangerouslyPasteHTML(length, `<img src="${imageUrl}" alt="Uploaded image" style="max-width: 100%; height: auto;" />`);
        actualQuill.setSelection(length + 1);
        console.log('Image inserted via HTML fallback');
      } catch (htmlError) {
        console.error('Error with HTML fallback:', htmlError);
        throw htmlError; // Re-throw to trigger form control fallback
      }
    }
  }

  insertVideoIntoEditor(videoUrl: string, sectionIndex: number): void {
    // Try to get Quill instance from stored map first
    let quill = this.quillEditors.get(sectionIndex);
    
    if (!quill) {
      // Fallback: try to find from DOM
      setTimeout(() => {
        const editorElements = document.querySelectorAll('.ql-editor');
        const editorElement = editorElements[sectionIndex] as HTMLElement;
        
        if (!editorElement) {
          console.warn(`Editor element not found for section ${sectionIndex}`);
          return;
        }

        // Get Quill instance from the element
        quill = (editorElement as any).__quill || Quill.find(editorElement);
        
        if (quill) {
          this.insertVideoToQuill(quill, videoUrl);
        } else {
          console.warn(`Quill instance not found for section ${sectionIndex}`);
        }
      }, 100);
    } else {
      // Use stored instance directly
      this.insertVideoToQuill(quill, videoUrl);
    }
  }

  private insertVideoToQuill(quill: any, videoUrl: string): void {
    try {
      // Get current selection or use end of document
      const range = quill.getSelection(true);
      const index = range ? range.index : quill.getLength();
      
      // Insert newline and video
      quill.insertText(index, '\n');
      quill.insertEmbed(index + 1, 'video', videoUrl, 'user');
      quill.setSelection(index + 2);
      
      console.log('Video inserted successfully:', videoUrl);
    } catch (error) {
      console.error('Error inserting video:', error);
      // Fallback: insert as HTML
      const range = quill.getSelection(true);
      const index = range ? range.index : quill.getLength();
      quill.insertText(index, '\n');
      quill.clipboard.dangerouslyPasteHTML(index + 1, `<video src="${videoUrl}" controls style="max-width: 100%;"></video>`);
      quill.setSelection(index + 2);
    }
  }

  // Get Quill configuration for a specific section
  getQuillConfig(sectionIndex: number): any {
    return {
      toolbar: {
        container: [
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          [{ 'font': [] }],
          [{ 'size': [] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'script': 'sub'}, { 'script': 'super' }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'indent': '-1'}, { 'indent': '+1' }],
          [{ 'align': [] }],
          ['link', 'image', 'video'],
          ['clean']
        ],
        handlers: {
          'image': () => this.imageHandler(sectionIndex),
          'video': () => this.videoHandler(sectionIndex)
        }
      },
      // Configure Quill to use HTML format instead of Delta
      format: 'html'
    };
  }

  // Handle Quill editor creation event
  onEditorCreated(editor: any, sectionIndex: number): void {
    // ngx-quill passes QuillEditorComponent, we need to get quillEditor property
    let quillInstance = null;
    
    if (editor) {
      // Try different ways to get Quill instance
      if (editor.quillEditor && typeof editor.quillEditor.getSelection === 'function') {
        quillInstance = editor.quillEditor;
      } else if (editor.quill && typeof editor.quill.getSelection === 'function') {
        quillInstance = editor.quill;
      } else if (editor.getQuill && typeof editor.getQuill().getSelection === 'function') {
        quillInstance = editor.getQuill();
      } else if (editor.editor && typeof editor.editor.getSelection === 'function') {
        quillInstance = editor.editor;
      } else if (typeof editor.getSelection === 'function') {
        // If editor itself is Quill instance
        quillInstance = editor;
      } else {
        // Try to find Quill from DOM element
        const editorElement = editor.nativeElement || editor.elementRef?.nativeElement;
        if (editorElement) {
          const qlEditor = editorElement.querySelector('.ql-editor');
          if (qlEditor) {
            quillInstance = (qlEditor as any).__quill || Quill.find(qlEditor);
          }
        }
      }
    }
    
    if (quillInstance && typeof quillInstance.getSelection === 'function') {
      this.quillEditors.set(sectionIndex, quillInstance);
      console.log(`Quill editor stored for section ${sectionIndex}`, quillInstance);
      console.log(`Quill instance has getSelection:`, typeof quillInstance.getSelection);
    } else {
      console.warn(`Could not extract valid Quill instance for section ${sectionIndex}`, editor);
      // Store the editor object anyway, we'll try to extract it later
      this.quillEditors.set(sectionIndex, editor);
    }
  }

  // Convert Quill Delta format to HTML string
  private convertDeltaToHtmlString(delta: any): string {
    if (!delta || !delta.ops) return '';
    
    let html = '';
    for (const op of delta.ops) {
      if (op.insert) {
        if (typeof op.insert === 'string') {
          // Text content
          let text = this.escapeHtml(op.insert);
          if (op.attributes) {
            if (op.attributes.bold) text = `<strong>${text}</strong>`;
            if (op.attributes.italic) text = `<em>${text}</em>`;
            if (op.attributes.underline) text = `<u>${text}</u>`;
            if (op.attributes.strike) text = `<s>${text}</s>`;
            if (op.attributes.header) {
              const level = op.attributes.header;
              text = `<h${level}>${text}</h${level}>`;
            }
            if (op.attributes.list) {
              text = `<li>${text}</li>`;
            }
            if (op.attributes.link) {
              text = `<a href="${op.attributes.link}">${text}</a>`;
            }
          }
          html += text;
        } else if (op.insert && typeof op.insert === 'object') {
          // Embedded content
          if (op.insert.image) {
            // Image embed
            const imageUrl = typeof op.insert.image === 'string' ? op.insert.image : op.insert.image.src || op.insert.image.url;
            html += `<img src="${imageUrl}" style="max-width: 100%; height: auto; display: block; margin: 1rem auto;" />`;
          } else if (op.insert.video) {
            // Video embed
            const videoUrl = typeof op.insert.video === 'string' ? op.insert.video : op.insert.video.src || op.insert.video.url;
            html += `<video src="${videoUrl}" controls style="max-width: 100%; height: auto; display: block; margin: 1rem auto;"></video>`;
          }
        }
      }
    }
    return html;
  }

  // Escape HTML to prevent XSS
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ===== CATEGORY MANAGEMENT METHODS =====
  openAddCategoryModal(): void {
    this.categoryForm.reset();
    this.isAddCategoryModalOpen = true;
  }

  closeAddCategoryModal(): void {
    this.categoryForm.reset();
    this.isAddCategoryModalOpen = false;
  }

  onSubmitCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const categoryName = this.categoryForm.get('name')?.value?.trim();
    if (!categoryName) {
      this.toastService.error('Vui lòng nhập tên category');
      return;
    }

    // Check if category already exists
    const categoryExists = this.categories.some(
      cat => cat.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (categoryExists) {
      this.toastService.error('Category này đã tồn tại!');
      return;
    }

    this.isSubmittingCategory = true;
    this.articleService.createCategory({ name: categoryName }).subscribe({
      next: (response) => {
        this.toastService.success('Category đã được tạo thành công!');
        this.loadCategories(); // Reload categories list
        this.closeAddCategoryModal();
        this.isSubmittingCategory = false;
      },
      error: (error) => {
        console.error('Error creating category:', error);
        this.toastService.error(error?.error?.message || 'Không thể tạo category. Vui lòng thử lại.');
        this.isSubmittingCategory = false;
      }
    });
  }
}
