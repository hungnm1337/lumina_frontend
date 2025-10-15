import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ArticleService } from '../../../../Services/Article/article.service';
import { ToastService } from '../../../../Services/Toast/toast.service';
import { AuthService } from '../../../../Services/Auth/auth.service';
import {
  Article,
  ArticleCategory,
  ArticleCreate
} from '../../../../Interfaces/article.interfaces';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
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
  editingArticle: Article | null = null;
  isLoading = true;
  isSubmitting = false;
  
  // Form Properties
  articleForm: FormGroup;
  
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

  // Section types for dropdown
  sectionTypes = [
    { value: 'đoạn văn', label: 'Đoạn văn' },
    { value: 'hình ảnh', label: 'Hình ảnh' },
    { value: 'video', label: 'Video' },
    { value: 'danh sách', label: 'Danh sách' }
  ];

  constructor(
    private fb: FormBuilder,
    private articleService: ArticleService,
    private toastService: ToastService,
    private authService: AuthService
  ) {
    this.articleForm = this.fb.group({
      category: ['', Validators.required],
      status: ['draft', Validators.required],
      title: ['', [Validators.required, Validators.minLength(5)]],
      summary: ['', [Validators.required, Validators.minLength(20)]],
      sections: this.fb.array([]),
      tags: ['']
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
    return this.fb.group({
      type: ['đoạn văn', Validators.required],
      content: ['', Validators.required],
      sectionTitle: ['', Validators.required]
    });
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
        status: article.status,
        title: article.title,
        summary: article.summary,
        tags: article.tags ? article.tags.join(', ') : ''
      });

      // Add sections từ dữ liệu có sẵn
      if (article.sections && article.sections.length > 0) {
        article.sections.forEach(sectionData => {
          this.sections.push(this.fb.group({
            type: [sectionData.type || 'đoạn văn', Validators.required],
            content: [sectionData.content, Validators.required],
            sectionTitle: [sectionData.sectionTitle || '', Validators.required]
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
        status: 'draft',
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

    const articlePayload = {
      title: formData.title,
      summary: formData.summary,
      categoryId: selectedCategory.id,
      tags: tagsArray,
      sections: formData.sections.map((section: any, index: number) => ({
        sectionTitle: section.sectionTitle || `Section ${index + 1}`,
        sectionContent: section.content,
        type: section.type,
        orderIndex: index
      }))
    };

    if (this.editingArticle) {
      // Update existing article
      this.articleService.updateArticle(this.editingArticle.id, articlePayload).subscribe({
        next: () => {
          this.toastService.success('Cập nhật bài viết thành công!');
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
    if (confirm('Bạn có chắc chắn muốn xóa bài viết này?')) {
      this.isLoading = true;
      this.articleService.deleteArticle(id).subscribe({
        next: () => {
          this.toastService.success('Xóa bài viết thành công!');
          this.loadArticles();
        },
        error: (error) => {
          this.toastService.error('Không thể xóa bài viết.');
          this.isLoading = false;
        }
      });
    }
  }

  submitForApproval(id: number): void {
    if (confirm('Bạn có chắc muốn gửi bài viết này để phê duyệt?')) {
      this.isLoading = true;
      this.articleService.requestApproval(id).subscribe({
        next: () => {
          // Check if this is a resubmission (article has rejection reason)
          const article = this.filteredArticles.find(a => a.id === id);
          const isResubmission = article?.rejectionReason;
          
          if (isResubmission) {
            this.toastService.success('Bài viết đã được gửi lại để duyệt!');
            // Clear rejection reason after successful resubmission
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
        },
        error: (err) => {
          console.error("Error submitting for approval:", err);
          this.toastService.error('Gửi yêu cầu thất bại.');
          this.isLoading = false;
        }
      });
    }
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
    
    if (confirm('Bạn có chắc muốn từ chối và trả bài viết này về trạng thái Nháp?')) {
      this.isLoading = true;
      this.articleService.reviewArticle(id, false).subscribe({
        next: () => {
          this.toastService.info('Đã từ chối và trả lại bài viết.');
          this.loadArticles();
        },
        error: () => {
          this.toastService.error('Từ chối thất bại.');
          this.isLoading = false;
        }
      });
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
}
