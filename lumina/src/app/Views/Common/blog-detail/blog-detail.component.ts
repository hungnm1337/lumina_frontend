import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { ArticleService } from '../../../Services/Article/article.service';
import { ArticleResponse } from '../../../Interfaces/article.interfaces';
import { ChatBoxComponent } from "./chat-box/chat-box.component";

interface BlogComment {
  id: number;
  author: {
    name: string;
    avatar: string;
    avatarColor: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  replies: number;
  isLiked: boolean;
}

interface BlogArticle {
  id: number;
  title: string;
  category: string;
  categoryColor: string;
  publishDate: string;
  readTime: string;
  author: {
    name: string;
    title: string;
    avatar: string;
    avatarColor: string;
    bio: string;
    articlesCount: number;
    followers: string;
    likes: string;
  };
  likes: number;
  shareText: string;
  introduction: string;
  content: {
    sections: {
      title: string;
      content: string;
      tips?: {
        title: string;
        items: string[];
      };
      resources?: {
        title: string;
        items: string[];
      };
      quote?: {
        text: string;
        author: string;
      };
    }[];
  };
  finalAdvice: {
    title: string;
    content: string;
  };
  tags: string[];
  commentsCount: number;
}

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, ChatBoxComponent],
  templateUrl: './blog-detail.component.html',
  styleUrls: ['./blog-detail.component.scss']
})
export class BlogDetailComponent implements OnInit {
  article: ArticleResponse | null = null;
  isLoading: boolean = true;
  error: string = '';
  contentArticle : string = '';
  // Additional properties for UI
  articleLikes: number = 0;
  articleCommentsCount: number = 0;

  newComment: string = '';
  sortComments: string = 'newest';
  isFollowing: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private articleService: ArticleService
  ) { }

  ngOnInit(): void {
    this.loadArticle();
  }

  loadArticle(): void {
    this.isLoading = true;
    this.error = '';

    const articleId = this.route.snapshot.paramMap.get('id');
    if (!articleId) {
      this.error = 'Không tìm thấy bài viết';
      this.isLoading = false;
      return;
    }

    this.articleService.getArticleById(+articleId).subscribe({
      next: (article) => {
        this.article = article;
        this.articleLikes = 0;
        this.articleCommentsCount = 0;
        this.contentArticle = article.sections.map(section => section.sectionContent).join('\n\n');
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading article:', error);
        this.error = 'Không thể tải bài viết. Vui lòng thử lại sau.';
        this.isLoading = false;
      }
    });
  }

  goBackToBlog(): void {
    this.router.navigate(['/blog']);
  }

  onLikeArticle(): void {
    if (this.article) {
      this.articleLikes++;
    }
  }

  onShareArticle(): void {
    console.log('Sharing article...');
  }

  onFollowAuthor(): void {
    this.isFollowing = !this.isFollowing;
  }

  onSubmitComment(): void {

  }

  onLikeComment(commentId: number): void {

  }

  onReplyComment(commentId: number): void {
    console.log('Replying to comment:', commentId);
  }

  formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
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

  getAuthorAvatarColor(name: string): string {
    const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }
}
