import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';

interface Article {
  id: number;
  title: string;
  summary: string;
  category: string;
  status: 'published' | 'draft' | 'pending';
  author: string;
  authorRole: string;
  publishDate: string;
  views: number;
  likes: number;
  tags: string[];
  sections: ArticleSection[];
}

interface ArticleSection {
  type: 'đoạn văn' | 'hình ảnh' | 'video' | 'danh sách';
  content: string;
}

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
  searchTerm = '';
  selectedCategory = '';
  selectedStatus = '';
  isModalOpen = false;
  editingArticle: Article | null = null;
  articleForm: FormGroup;

  categories = [
    'Listening Tips', 
    'Reading Strategies', 
    'Writing Guide', 
    'Speaking Practice', 
    'Grammar', 
    'Vocabulary'
  ];

  sectionTypes = [
    { value: 'đoạn văn', label: 'Đoạn văn' },
    { value: 'hình ảnh', label: 'Hình ảnh' },
    { value: 'video', label: 'Video' },
    { value: 'danh sách', label: 'Danh sách' }
  ];
  
  constructor(private fb: FormBuilder, private router: Router) {
    this.articleForm = this.fb.group({
      category: ['', Validators.required],
      status: ['draft', Validators.required],
      title: ['', [Validators.required, Validators.minLength(5)]],
      summary: ['', [Validators.required, Validators.minLength(20)]],
      sections: this.fb.array([]),
      tags: ['']
    });
    this.loadSampleData();
  }

  ngOnInit() {
    this.filterArticles();
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

  loadSampleData() {
    this.articles = [
      {
        id: 1,
        title: '10 Tips cải thiện Listening TOEIC',
        summary: 'Hướng dẫn chi tiết các phương pháp hiệu quả để nâng cao điểm số phần Listening TOEIC. Bài viết cung cấp những kỹ thuật thiết thực giúp học viên cải thiện khả năng nghe hiểu một cách nhanh chóng.',
        category: 'Listening Tips',
        author: 'Nguyễn Văn A',
        authorRole: 'Content Staff',
        publishDate: '15/12/2024',
        status: 'published',
        views: 1234,
        likes: 89,
        tags: ['TOEIC', 'Listening', 'Tips'],
        sections: [
          { type: 'đoạn văn', content: 'Nghe là một trong bốn kỹ năng quan trọng nhất trong TOEIC. Để đạt điểm cao, bạn cần luyện tập thường xuyên và áp dụng những phương pháp hiệu quả.' },
          { type: 'đoạn văn', content: 'Dưới đây là 10 tips cải thiện listening hiệu quả nhất mà chúng tôi đã tổng hợp từ kinh nghiệm giảng dạy nhiều năm.' }
        ]
      },
      {
        id: 2,
        title: 'Strategies for TOEIC Reading',
        summary: 'Comprehensive guide to improve reading comprehension skills for TOEIC test. Learn proven strategies to tackle different types of reading questions efficiently.',
        category: 'Reading Strategies',
        author: 'Trần Thị B',
        authorRole: 'Senior Content Staff',
        publishDate: '12/12/2024',
        status: 'published',
        views: 956,
        likes: 67,
        tags: ['TOEIC', 'Reading', 'Strategies'],
        sections: [
          { type: 'đoạn văn', content: 'Reading comprehension chiếm một phần quan trọng trong bài thi TOEIC. Việc nắm vững các chiến lược đọc hiểu sẽ giúp bạn tiết kiệm thời gian và đạt điểm cao.' },
          { type: 'danh sách', content: '1. Đọc lướt để nắm ý chính\n2. Tìm từ khóa trong câu hỏi\n3. Loại trừ đáp án sai\n4. Quản lý thời gian hiệu quả' }
        ]
      },
      {
        id: 3,
        title: 'Writing Task 1 Guidelines',
        summary: 'Essential tips for tackling TOEIC writing tasks effectively. Master the art of structured writing with clear examples and practice exercises.',
        category: 'Writing Guide',
        author: 'Lê Văn C',
        authorRole: 'Content Staff',
        publishDate: '10/12/2024',
        status: 'draft',
        views: 0,
        likes: 0,
        tags: ['TOEIC', 'Writing', 'Guidelines'],
        sections: [
          { type: 'đoạn văn', content: 'Writing là kỹ năng quan trọng trong TOEIC, đòi hỏi bạn phải có khả năng diễn đạt ý tưởng một cách rõ ràng và logic.' }
        ]
      }
    ];
    this.filteredArticles = [...this.articles];
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
    this.filterArticles();
  }

  onCategoryChange() {
    this.filterArticles();
  }

  onStatusChange() {
    this.filterArticles();
  }

  openModal(article: Article | null = null) {
    this.editingArticle = article;
    this.isModalOpen = true;
    
    // Clear existing sections
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
    if (this.articleForm.valid) {
      const formData = this.articleForm.value;
      const tags = formData.tags ? formData.tags.split(',').map((tag: string) => tag.trim()) : [];
      
      if (this.editingArticle) {
        // Update existing article
        const index = this.articles.findIndex(a => a.id === this.editingArticle!.id);
        if (index !== -1) {
          this.articles[index] = {
            ...this.articles[index],
            title: formData.title,
            summary: formData.summary,
            category: formData.category,
            status: formData.status,
            sections: formData.sections,
            tags: tags
          };
        }
      } else {
        // Create new article
        const newArticle: Article = {
          id: Math.max(...this.articles.map(a => a.id)) + 1,
          title: formData.title,
          summary: formData.summary,
          category: formData.category,
          status: formData.status,
          sections: formData.sections,
          author: 'Current User',
          authorRole: 'Content Staff',
          publishDate: new Date().toLocaleDateString('vi-VN'),
          views: 0,
          likes: 0,
          tags: tags
        };
        this.articles.push(newArticle);
      }
      
      this.filterArticles();
      this.closeModal();
    }
  }

  deleteArticle(id: number) {
    if (confirm('Bạn có chắc chắn muốn xóa bài viết này?')) {
      this.articles = this.articles.filter(a => a.id !== id);
      this.filterArticles();
    }
  }

  publishArticle(id: number) {
    const article = this.articles.find(a => a.id === id);
    if (article) {
      article.status = 'published';
      article.publishDate = new Date().toLocaleDateString('vi-VN');
      this.filterArticles();
    }
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
