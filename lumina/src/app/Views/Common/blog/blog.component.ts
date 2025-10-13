import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { ArticleService } from '../../../Services/Article/article.service';
import { ArticleResponse, ArticleCategory } from '../../../Interfaces/article.interfaces';

interface BlogArticle {
  id: number;
  title: string;
  summary: string;
  category: string;
  categoryColor: string;
  readTime: string;
  author: {
    name: string;
    avatar: string;
    avatarColor: string;
  };
  publishDate: string;
  likes: number;
  comments: number;
  views: number;
  tags: string[];
  isFeatured: boolean;
  isTrending: boolean;
  imagePlaceholder: string;
}

interface BlogAuthor {
  id: number;
  name: string;
  expertise: string;
  avatar: string;
  avatarColor: string;
  articlesCount: number;
  followers: string;
  isFollowing: boolean;
}

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.scss']
})
export class BlogComponent implements OnInit {
  searchQuery: string = '';
  selectedCategory: string = 'all';
  selectedSort: string = 'newest';
  
  // Real data from API
  publishedArticles: ArticleResponse[] = [];
  categories: ArticleCategory[] = [];
  isLoading: boolean = true;
  error: string = '';
  
  // Filter categories for UI
  filterCategories = [
    { id: 'all', name: 'Tất cả', icon: 'fas fa-th' },
    { id: 'study-tips', name: 'Mẹo học tập', icon: 'fas fa-lightbulb' },
    { id: 'grammar', name: 'Ngữ pháp', icon: 'fas fa-file-alt' },
    { id: 'vocabulary', name: 'Từ vựng', icon: 'fas fa-font' },
    { id: 'listening', name: 'Nghe', icon: 'fas fa-headphones' },
    { id: 'reading', name: 'Đọc', icon: 'fas fa-book' }
  ];

  // Computed properties for display
  get featuredArticles(): ArticleResponse[] {
    return this.publishedArticles.slice(0, 2);
  }

  get latestArticles(): ArticleResponse[] {
    return this.publishedArticles.slice(0, 3);
  }

  get featuredAuthors(): BlogAuthor[] {
    // Extract unique authors from published articles
    const authors = new Map();
    this.publishedArticles.forEach(article => {
      if (!authors.has(article.authorName)) {
        authors.set(article.authorName, {
          id: authors.size + 1,
          name: article.authorName,
          expertise: 'Content Creator',
          avatar: article.authorName.charAt(0).toUpperCase(),
          avatarColor: this.getAuthorAvatarColor(authors.size),
          articlesCount: this.publishedArticles.filter(a => a.authorName === article.authorName).length,
          followers: Math.floor(Math.random() * 50) + 10 + 'K',
          isFollowing: false
        });
      }
    });
    return Array.from(authors.values()).slice(0, 4);
  }

  newsletterEmail: string = '';

  constructor(
    private router: Router,
    private articleService: ArticleService
  ) { }

  ngOnInit(): void {
    this.loadPublishedArticles();
    this.loadCategories();
  }

  loadPublishedArticles(): void {
    this.isLoading = true;
    this.error = '';
    
    this.articleService.queryArticles({
      isPublished: true,
      status: 'published',
      sortBy: 'createdAt',
      sortDir: 'desc'
    }).subscribe({
      next: (response) => {
        this.publishedArticles = response.items;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading articles:', error);
        this.error = 'Không thể tải bài viết. Vui lòng thử lại sau.';
        this.isLoading = false;
      }
    });
  }

  loadCategories(): void {
    this.articleService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  onCategorySelect(categoryId: string): void {
    this.selectedCategory = categoryId;
    this.filterArticles();
  }

  onSearch(): void {
    this.filterArticles();
  }

  filterArticles(): void {
    this.isLoading = true;
    
    const params: any = {
      isPublished: true,
      status: 'published',
      sortBy: 'createdAt',
      sortDir: 'desc'
    };

    if (this.searchQuery.trim()) {
      params.search = this.searchQuery.trim();
    }

    if (this.selectedCategory !== 'all') {
      // Map UI category to backend category ID
      const category = this.categories.find(c => 
        c.name.toLowerCase().includes(this.selectedCategory.toLowerCase())
      );
      if (category) {
        params.categoryId = category.id;
      }
    }

    this.articleService.queryArticles(params).subscribe({
      next: (response) => {
        this.publishedArticles = response.items;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error filtering articles:', error);
        this.error = 'Không thể lọc bài viết. Vui lòng thử lại sau.';
        this.isLoading = false;
      }
    });
  }

  onSubscribeNewsletter(): void {
    if (this.newsletterEmail) {
      console.log('Subscribing email:', this.newsletterEmail);
      // Implement newsletter subscription logic
      this.newsletterEmail = '';
    }
  }

  onFollowAuthor(authorId: number): void {
    const author = this.featuredAuthors.find(a => a.id === authorId);
    if (author) {
      author.isFollowing = !author.isFollowing;
    }
  }

  formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  goToArticleDetail(articleId: number): void {
    this.router.navigate(['/blog', articleId]);
  }

  getAuthorAvatarColor(index: number): string {
    const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500'];
    return colors[index % colors.length];
  }

  getCategoryColor(categoryName: string): string {
    const category = categoryName.toLowerCase();
    if (category.includes('mẹo') || category.includes('tip')) return 'bg-green-500';
    if (category.includes('ngữ pháp') || category.includes('grammar')) return 'bg-blue-500';
    if (category.includes('từ vựng') || category.includes('vocabulary')) return 'bg-red-500';
    if (category.includes('nghe') || category.includes('listening')) return 'bg-purple-500';
    if (category.includes('đọc') || category.includes('reading')) return 'bg-orange-500';
    return 'bg-gray-500';
  }

  getCardBackgroundColor(articleId: number): string {
    const colors = [
      '#e0f2fe', // Light blue
      '#fce7f3', // Light pink
      '#f0fdf4', // Light green
      '#fef3c7', // Light yellow
      '#f3e8ff', // Light purple
    ];
    return colors[articleId % colors.length];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  getReadTime(content: string): string {
    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} phút đọc`;
  }
}
