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
  articles: Article[] = [];
  filteredArticles: Article[] = [];
  isManager = false;
  isModalOpen = false;
  editingArticle: Article | null = null;
  articleForm: FormGroup;
  isLoading = true;
  isSubmitting = false;
  searchTerm = '';
  selectedCategory = '';
  selectedStatus: 'draft' | 'pending' | 'published' | '' = '';
  page = 1;
  pageSize = 6;
  total = 0;
  sortBy: 'createdAt' | 'title' | 'category' = 'createdAt';
  sortDir: 'asc' | 'desc' = 'desc';
  Math = Math;
  categories: ArticleCategory[] = [];
  categoryNames: string[] = [];
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

  ngOnInit() {
    const roleId = this.authService.getRoleId();
    this.isManager = (roleId === 2);
    this.loadCategories();
    this.loadArticles();
  }

  loadCategories() {
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

  loadArticles() {
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

  get sections(): FormArray {
    return this.articleForm.get('sections') as FormArray;
  }

  createSectionFormGroup(): FormGroup {
    return this.fb.group({
      type: ['đoạn văn', Validators.required],
      content: ['', Validators.required],
      sectionTitle: ['', Validators.required]
    });
  }

  addSection() { this.sections.push(this.createSectionFormGroup()); }
  removeSection(index: number) { this.sections.removeAt(index); }
  moveSectionUp(index: number) {
    if (index > 0) {
      const section = this.sections.at(index);
      this.sections.removeAt(index);
      this.sections.insert(index - 1, section);
    }
  }
  moveSectionDown(index: number) {
    if (index < this.sections.length - 1) {
      const section = this.sections.at(index);
      this.sections.removeAt(index);
      this.sections.insert(index + 1, section);
    }
  }

  onFilterChange() {
    this.page = 1;
    this.loadArticles();
  }
  
  onSearchChange() { this.onFilterChange(); }
  onCategoryChange() { this.onFilterChange(); }
  onStatusChange() { this.onFilterChange(); }

  nextPage() {
    if (this.page * this.pageSize < this.total) {
      this.page += 1;
      this.loadArticles();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page -= 1;
      this.loadArticles();
    }
  }

  changePageSize(size: number) {
    this.pageSize = size;
    this.page = 1;
    this.loadArticles();
  }

  changeSort(sortBy: 'createdAt'|'title'|'category', sortDir: 'asc'|'desc') {
    this.sortBy = sortBy;
    this.sortDir = sortDir;
    this.page = 1;
    this.loadArticles();
  }
  
  // ----- HÀM ĐÃ ĐƯỢC SỬA LẠI -----
  openModal(article: Article | null = null) {
    this.editingArticle = article;
    this.isModalOpen = true;
    while (this.sections.length !== 0) {
      this.sections.removeAt(0);
    }
    
    if (article) { // Chế độ CHỈNH SỬA
      this.articleForm.patchValue({
        category: article.category,
        status: article.status,
        title: article.title,
        summary: article.summary,
        tags: article.tags.join(', ')
      });
      
      // Lặp qua dữ liệu sections của bài viết và tạo FormGroup tương ứng
      if (article.sections && article.sections.length > 0) {
        article.sections.forEach(sectionData => {
          this.sections.push(this.fb.group({
            type: [sectionData.type, Validators.required],
            content: [sectionData.content, Validators.required],
            sectionTitle: [sectionData.sectionTitle || '', Validators.required]
          }));
        });
      }
      
    } else { // Chế độ TẠO MỚI
      this.articleForm.reset({ category: '', status: 'draft' });
      this.addSection();
    }
  }
  // ----- KẾT THÚC SỬA -----

  closeModal() {
    this.isModalOpen = false;
    this.editingArticle = null;
    this.articleForm.reset();
    while (this.sections.length !== 0) {
      this.sections.removeAt(0);
    }
  }

  saveArticle() {
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

    const articlePayload = {
      title: formData.title,
      summary: formData.summary,
      categoryId: selectedCategory.id,
      sections: formData.sections.map((section: any, index: number) => ({
        sectionTitle: section.sectionTitle || `Section ${index + 1}`,
        sectionContent: section.content,
        orderIndex: index
      }))
    };
    
    if (this.editingArticle) {
      this.articleService.updateArticle(this.editingArticle.id, articlePayload).subscribe({
        next: () => {
          this.toastService.success('Cập nhật bài viết thành công!');
          this.finalizeSave();
        },
        error: (err) => this.handleSaveError(err, 'cập nhật')
      });
    } else {
      const createPayload: ArticleCreate = { ...articlePayload, publishNow: false };
      this.articleService.createArticle(createPayload).subscribe({
        next: () => {
          this.toastService.success('Tạo bài viết thành công!');
          this.finalizeSave();
        },
        error: (err) => this.handleSaveError(err, 'tạo mới')
      });
    }
  }

  deleteArticle(id: number) {
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

  submitForApproval(id: number) {
    if (confirm('Bạn có chắc muốn gửi bài viết này để phê duyệt?')) {
      this.isLoading = true;
      this.articleService.requestApproval(id).subscribe({
        next: () => {
          this.toastService.success('Đã gửi yêu cầu phê duyệt!');
          const article = this.filteredArticles.find(a => a.id === id);
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

  approveArticle(id: number) {
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

  rejectArticle(id: number) {
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

  private finalizeSave() {
    this.isSubmitting = false;
    this.closeModal();
    this.loadArticles();
  }

  private handleSaveError(error: any, action: string) {
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
}