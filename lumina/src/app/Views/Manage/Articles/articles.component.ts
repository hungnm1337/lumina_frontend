import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Article {
  id: number;
  title: string;
  description: string;
  author: {
    name: string;
    avatar: string;
  };
  category: string;
  status: 'pending' | 'approved' | 'rejected' | 'draft';
  views: number;
  createdDate: string;
  updatedDate?: string;
}

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
export class ArticlesComponent implements OnInit {
  // Loading/Error states
  isLoading = false;
  errorMessage: string | null = null;

  // Statistics
  stats: ArticleStats = {
    totalArticles: 1247,
    pendingArticles: 89,
    approvedArticles: 1158,
    monthlyViews: 342000
  };

  // Articles data
  articles: Article[] = [
    {
      id: 1,
      title: '10 Tips Cải thiện Listening TOEIC',
      description: 'Hướng dẫn chi tiết các kỹ thuật luyện nghe hiệu quả cho kỳ thi TOEIC',
      author: { name: 'Nguyễn Thành', avatar: 'NT' },
      category: 'Listening',
      status: 'pending',
      views: 2456,
      createdDate: '15/10/2025'
    },
    {
      id: 2,
      title: 'Chiến lược Reading Part 7',
      description: 'Cách tiếp cận và xử lý hiệu quả phần đọc hiểu cuối cùng của TOEIC',
      author: { name: 'Lê Hương', avatar: 'LH' },
      category: 'Reading',
      status: 'approved',
      views: 1893,
      createdDate: '14/10/2025'
    },
    {
      id: 3,
      title: '500 Từ vựng TOEIC thường gặp',
      description: 'Tổng hợp các từ vựng quan trọng nhất trong kỳ thi TOEIC với ví dụ minh họa',
      author: { name: 'Phạm Việt', avatar: 'PV' },
      category: 'Vocabulary',
      status: 'approved',
      views: 4127,
      createdDate: '13/10/2025'
    },
    {
      id: 4,
      title: 'Grammar Focus: Câu điều kiện',
      description: 'Phân tích chi tiết các loại câu điều kiện trong tiếng Anh và cách sử dụng',
      author: { name: 'Trần Bình', avatar: 'TB' },
      category: 'Grammar',
      status: 'rejected',
      views: 342,
      createdDate: '12/10/2025'
    },
    {
      id: 5,
      title: 'Lịch học TOEIC 3 tháng',
      description: 'Kế hoạch học tập chi tiết trong 3 tháng để đạt mục tiêu TOEIC mong muốn',
      author: { name: 'Hoàng Mai', avatar: 'HM' },
      category: 'Tips',
      status: 'draft',
      views: 0,
      createdDate: '11/10/2025'
    }
  ];

  filteredArticles: Article[] = [];
  
  // Filter states
  statusFilter = '';
  categoryFilter = '';
  authorFilter = '';
  keywordFilter = '';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  // Categories
  categories = [
    'Tất cả danh mục',
    'Listening',
    'Reading', 
    'Vocabulary',
    'Grammar',
    'Tips'
  ];

  // Status options
  statusOptions = [
    'Tất cả',
    'Chờ duyệt',
    'Đã phê duyệt',
    'Bị từ chối',
    'Bản nháp'
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.filteredArticles = [...this.articles];
    this.calculatePagination();
    this.loadArticlesData();
  }

  private loadArticlesData(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Simulate API call
    setTimeout(() => {
      this.isLoading = false;
      this.calculatePagination();
    }, 1000);
  }

  // Filter and search methods
  applyFilters(): void {
    let filtered = [...this.articles];

    // Status filter
    if (this.statusFilter && this.statusFilter !== 'Tất cả') {
      const statusMap: { [key: string]: string } = {
        'Chờ duyệt': 'pending',
        'Đã phê duyệt': 'approved',
        'Bị từ chối': 'rejected',
        'Bản nháp': 'draft'
      };
      filtered = filtered.filter(article => article.status === statusMap[this.statusFilter]);
    }

    // Category filter
    if (this.categoryFilter && this.categoryFilter !== 'Tất cả danh mục') {
      filtered = filtered.filter(article => article.category === this.categoryFilter);
    }

    // Author filter
    if (this.authorFilter) {
      filtered = filtered.filter(article => 
        article.author.name.toLowerCase().includes(this.authorFilter.toLowerCase())
      );
    }

    // Keyword filter
    if (this.keywordFilter) {
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(this.keywordFilter.toLowerCase()) ||
        article.description.toLowerCase().includes(this.keywordFilter.toLowerCase())
      );
    }

    this.filteredArticles = filtered;
    this.currentPage = 1;
    this.calculatePagination();
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.categoryFilter = '';
    this.authorFilter = '';
    this.keywordFilter = '';
    this.applyFilters();
  }

  // Pagination methods
  private calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredArticles.length / this.itemsPerPage);
  }

  getPaginatedArticles(): Article[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredArticles.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  changeItemsPerPage(newSize: number): void {
    this.itemsPerPage = newSize;
    this.currentPage = 1;
    this.calculatePagination();
  }

  // Article actions
  approveArticle(article: Article): void {
    article.status = 'approved';
    this.stats.approvedArticles++;
    this.stats.pendingArticles--;
    this.applyFilters();
  }

  rejectArticle(article: Article): void {
    article.status = 'rejected';
    this.stats.pendingArticles--;
    this.applyFilters();
  }

  deleteArticle(article: Article): void {
    const index = this.articles.findIndex(a => a.id === article.id);
    if (index > -1) {
      this.articles.splice(index, 1);
      this.stats.totalArticles--;
      if (article.status === 'approved') {
        this.stats.approvedArticles--;
      } else if (article.status === 'pending') {
        this.stats.pendingArticles--;
      }
      this.applyFilters();
    }
  }

  editArticle(article: Article): void {
    // Navigate to edit page or open modal
    console.log('Edit article:', article);
  }

  reapproveArticle(article: Article): void {
    article.status = 'pending';
    this.stats.pendingArticles++;
    this.applyFilters();
  }

  createNewArticle(): void {
    // Navigate to create article page
    console.log('Create new article');
  }

  // Utility methods
  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'draft': return 'status-draft';
      default: return 'status-default';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Chờ duyệt';
      case 'approved': return 'Đã phê duyệt';
      case 'rejected': return 'Bị từ chối';
      case 'draft': return 'Bản nháp';
      default: return status;
    }
  }

  getCategoryClass(category: string): string {
    return `category-${category.toLowerCase()}`;
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toString();
  }

  getTrendPercentage(): number {
    return 12.3; // Mock data
  }

  getTrendText(): string {
    return '+12.3% tháng này';
  }

  // Refresh data
  refreshData(): void {
    this.loadArticlesData();
  }
}
