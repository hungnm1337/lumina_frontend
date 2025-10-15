import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { ArticleService } from '../../../../Services/Article/article.service';
import { ToastService } from '../../../../Services/Toast/toast.service';
import { 
  Article, 
  ArticleSection, 
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
  Math = Math;
  searchTerm = '';
  selectedCategory = '';
  selectedStatus = '';
  page = 1;
  pageSize = 6;
  total = 0;
  sortBy: 'createdAt' | 'title' | 'category' = 'createdAt';
  sortDir: 'asc' | 'desc' = 'desc';
  isModalOpen = false;
  editingArticle: Article | null = null;
  articleForm: FormGroup;
  isLoading = false;
  isSubmitting = false;
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
    private router: Router,
    private articleService: ArticleService,
    private toastService: ToastService
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
    this.loadCategories();
    this.loadArticles();
  }

  loadCategories() {
    this.isLoading = true;
    this.articleService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.categoryNames = categories.map(cat => cat.name);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.toastService.error('Không thể tải danh mục bài viết');
        this.isLoading = false;
        this.categoryNames = [
          'Listening Tips', 
          'Reading Strategies', 
          'Writing Guide', 
          'Speaking Practice', 
          'Grammar', 
          'Vocabulary'
        ];
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
      isPublished: this.selectedStatus === 'published' ? true : this.selectedStatus === 'draft' ? false : undefined
    }).subscribe({
      next: (res) => {
        this.articles = res.items.map(article => this.articleService.convertToArticle(article));
        this.total = res.total;
        this.filterArticles();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading articles:', error);
        this.toastService.error('Không thể tải danh sách bài viết');
        this.isLoading = false;
        this.articles = [];
        this.filterArticles();
      }
    });
  }

  get sections(): FormArray {
    return this.articleForm.get('sections') as FormArray;
  }

  createSectionFormGroup(): FormGroup {
    return this.fb.group({
      type: ['đoạn văn', Validators.required],
      content: ['', Validators.required]
    });
  }

  addSection() {
    this.sections.push(this.createSectionFormGroup());
  }

  removeSection(index: number) {
    this.sections.removeAt(index);
  }

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


  filterArticles() {
    this.filteredArticles = this.articles.filter(article => {
      const matchesSearch = article.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           article.summary.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesCategory = !this.selectedCategory || article.category === this.selectedCategory;
      const matchesStatus = !this.selectedStatus || article.status === this.selectedStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }

  onSearchChange() {
    this.page = 1;
    this.loadArticles();
  }

  onCategoryChange() {
    this.page = 1;
    this.filterArticles();
  }

  onStatusChange() {
    this.page = 1;
    this.loadArticles();
  }
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

  openModal(article: Article | null = null) {
    this.editingArticle = article;
    this.isModalOpen = true;
    while (this.sections.length !== 0) {
      this.sections.removeAt(0);
    }
    
    if (article) {
      this.articleForm.patchValue({
        category: article.category,
        status: article.status,
        title: article.title,
        summary: article.summary,
        tags: article.tags.join(', ')
      });
      
      // Add existing sections
      article.sections.forEach(section => {
        const sectionFormGroup = this.createSectionFormGroup();
        sectionFormGroup.patchValue(section);
        this.sections.push(sectionFormGroup);
      });
    } else {
      this.articleForm.reset();
      this.articleForm.patchValue({
        category: '',
        status: 'draft'
      });
      // Add one default section
      this.addSection();
    }
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingArticle = null;
    this.articleForm.reset();
    // Clear sections
    while (this.sections.length !== 0) {
      this.sections.removeAt(0);
    }
  }

  saveArticle() {
    if (this.articleForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const formData = this.articleForm.value;
      
      // Find category ID
      const selectedCategory = this.categories.find(cat => cat.name === formData.category);
      if (!selectedCategory) {
        this.toastService.error('Vui lòng chọn danh mục hợp lệ');
        this.isSubmitting = false;
        return;
      }

      // Convert form data to ArticleCreate format
      const articleData: ArticleCreate = {
        title: formData.title,
        summary: formData.summary,
        categoryId: selectedCategory.id,
        publishNow: formData.status === 'published',
        sections: formData.sections.map((section: any, index: number) => ({
          sectionTitle: `Section ${index + 1}`,
          sectionContent: section.content,
          orderIndex: index
        }))
      };

      if (this.editingArticle) {
        // Update article
        const updatePayload = {
          title: formData.title,
          summary: formData.summary,
          categoryId: selectedCategory.id,
          sections: formData.sections.map((section: any, index: number) => ({
            sectionTitle: `Section ${index + 1}`,
            sectionContent: section.content,
            orderIndex: index
          }))
        };

        this.articleService.updateArticle(this.editingArticle.id, updatePayload).subscribe({
          next: (updated) => {
            this.toastService.success('Cập nhật bài viết thành công!');
            // reload
            this.loadArticles();
            this.closeModal();
            this.isSubmitting = false;
          },
          error: (error) => {
            console.error('Error updating article:', error);
            this.toastService.error('Không thể cập nhật bài viết. Vui lòng thử lại.');
            this.isSubmitting = false;
          }
        });
      } else {
        // Create new article
        this.articleService.createArticle(articleData).subscribe({
          next: (response) => {
            this.toastService.success('Tạo bài viết thành công!');
            // Convert response to Article format and add to list
            const newArticle = this.articleService.convertToArticle(response);
            this.articles.unshift(newArticle); // Add to beginning
            this.filterArticles();
            this.closeModal();
            this.isSubmitting = false;
          },
          error: (error) => {
            console.error('Error creating article:', error);
            this.toastService.error('Không thể tạo bài viết. Vui lòng thử lại.');
            this.isSubmitting = false;
          }
        });
      }
    }
  }

  deleteArticle(id: number) {
    if (confirm('Bạn có chắc chắn muốn xóa bài viết này?')) {
      this.isLoading = true;
      
      this.articleService.deleteArticle(id).subscribe({
        next: () => {
          this.toastService.success('Xóa bài viết thành công!');
          // Xóa từ danh sách local
          this.articles = this.articles.filter(a => a.id !== id);
          this.filterArticles();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error deleting article:', error);
          this.toastService.error('Không thể xóa bài viết. Vui lòng thử lại.');
          this.isLoading = false;
        }
      });
    }
  }

  publishArticle(id: number) {
    this.isLoading = true;
    this.articleService.setPublish(id, true).subscribe({
      next: () => {
        this.toastService.success('Đã xuất bản bài viết!');
        this.loadArticles();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error publishing article:', error);
        this.toastService.error('Không thể xuất bản bài viết.');
        this.isLoading = false;
      }
    });
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