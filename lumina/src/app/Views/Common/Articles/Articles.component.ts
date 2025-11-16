import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { ArticleService } from '../../../Services/Article/article.service';
import { ArticleResponse, ArticleCategory, ArticleProgress } from '../../../Interfaces/article.interfaces';
import { AuthService } from '../../../Services/Auth/auth.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

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
  selector: 'app-blog-articles',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './Articles.component.html',
  styleUrls: ['./Articles.component.scss']
})
export class BlogArticlesComponent implements OnInit, OnDestroy {
  searchQuery: string = '';
  selectedCategory: string = 'all';
  selectedSort: string = 'newest';

  // Real data from API
  publishedArticles: ArticleResponse[] = [];
  categories: ArticleCategory[] = [];
  isLoading: boolean = true;
  error: string = '';

  // Article progress tracking
  articleProgressMap: Map<number, ArticleProgress> = new Map();

  // Router subscription for navigation events
  private routerSubscription?: Subscription;

  // Filter categories for UI
  filterCategories = [
    { id: 'all', name: 'All', icon: 'fas fa-th' },
    { id: 'study-tips', name: 'Study tips', icon: 'fas fa-lightbulb' },
    { id: 'grammar', name: 'Grammar', icon: 'fas fa-file-alt' },
    { id: 'vocabulary', name: 'Vocabulary', icon: 'fas fa-font' },
    { id: 'listening', name: 'Listening', icon: 'fas fa-headphones' },
    { id: 'reading', name: 'Reading', icon: 'fas fa-book' }
  ];

  // Pagination for latest articles
  currentPage: number = 1;
  itemsPerPage: number = 6;

  // Computed properties for display
  get featuredArticles(): ArticleResponse[] {
    return this.publishedArticles.slice(0, 2);
  }

  get latestArticles(): ArticleResponse[] {
    if (!this.showAllLatestArticles) {
      return this.publishedArticles.slice(0, 3);
    }

    // Show paginated articles
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.publishedArticles.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.publishedArticles.length / this.itemsPerPage);
  }

  get hasMoreArticles(): boolean {
    return this.publishedArticles.length > 3;
  }

  // Flag to show all articles in latest section
  showAllLatestArticles: boolean = false;

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

  // Track login status
  isLogin: boolean = false;

  constructor(
    private router: Router,
    private articleService: ArticleService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.isLogin = this.authService.getCurrentUser() !== null;
    this.loadPublishedArticles();
    this.loadCategories();

    // Subscribe to router events to reload progress when navigating back from detail page
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // If we're on the articles list page and have articles loaded, reload progress
        if (event.url === '/articles' && this.publishedArticles.length > 0) {
          this.reloadArticleProgress();
        }
      });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  // Reload progress for all current articles
  reloadArticleProgress(): void {
    if (this.isLogin && this.publishedArticles.length > 0) {
      const articleIds = this.publishedArticles.map(a => a.articleId);
      this.loadArticleProgress(articleIds);
    }
  }

  loadPublishedArticles(): void {
    this.isLoading = true;
    this.error = '';
    this.currentPage = 1; // Reset to first page

    this.articleService.queryArticles({
      isPublished: true,
      status: 'published',
      sortBy: 'createdAt',
      sortDir: 'desc'
    }).subscribe({
      next: (response) => {
        this.publishedArticles = response.items;
        if (this.isLogin) {
          this.loadArticleProgress(response.items.map(a => a.articleId));
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading articles:', error);
        this.error = 'Unable to load articles. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  // Load article progress for all articles
  loadArticleProgress(articleIds: number[]): void {
    if (articleIds.length === 0) return;

    this.articleService.getUserArticleProgress(articleIds).subscribe({
      next: (progressList) => {
        progressList.forEach(progress => {
          this.articleProgressMap.set(progress.articleId, progress);
        });
      },
      error: (error) => {
        console.error('Error loading article progress:', error);
        // Don't show error to user, just log it
      }
    });
  }

  // Get progress for a specific article
  getArticleProgress(articleId: number): ArticleProgress {
    return this.articleProgressMap.get(articleId) || {
      articleId,
      progressPercent: 0,
      status: 'not_started'
    };
  }

  // Get status badge class
  getStatusBadgeClass(status: string): string {
    switch(status) {
      case 'completed': return 'status-badge completed';
      case 'in_progress': return 'status-badge in-progress';
      default: return 'status-badge not-started';
    }
  }

  // Get status text
  getStatusText(status: string): string {
    switch(status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      default: return 'Not Started';
    }
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
    this.currentPage = 1; // Reset to first page when filtering
    this.showAllLatestArticles = false; // Reset view state when filtering

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
        if (this.isLogin) {
          this.loadArticleProgress(response.items.map(a => a.articleId));
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error filtering articles:', error);
        this.error = 'Unable to filter articles. Please try again later.';
        this.isLoading = false;
      }
    });
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
    this.router.navigate(['/articles', articleId]);
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
    return `${minutes} min read`;
  }

  onViewMoreLatestArticles(): void {
    if (!this.showAllLatestArticles) {
      this.showAllLatestArticles = true;
      this.currentPage = 1; // Reset to first page when expanding
    } else {
      this.showAllLatestArticles = false;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      // Scroll to top of latest articles section
      const element = document.querySelector('.latest-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }
}



