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

  // Mock data for demo (will be replaced with real data)
  mockArticle: BlogArticle = {
    id: 1,
    title: '10 Mẹo Vàng Để Đạt 900+ Điểm TOEIC Trong 3 Tháng',
    category: 'MẸO HỌC TẬP',
    categoryColor: 'bg-green-500',
    publishDate: '15 tháng 12, 2024',
    readTime: '8 phút đọc',
    author: {
      name: 'Thầy Anh TOEIC',
      title: 'Chuyên gia TOEIC 15 năm kinh nghiệm',
      avatar: 'TA',
      avatarColor: 'bg-blue-500',
      bio: 'Chuyên gia TOEIC với 15 năm kinh nghiệm giảng dạy. Đã giúp hơn 10,000 học viên đạt điểm cao TOEIC. Tác giả của nhiều cuốn sách luyện thi TOEIC bestseller.',
      articlesCount: 127,
      followers: '25K',
      likes: '15K'
    },
    likes: 247,
    shareText: 'Chia sẻ bài viết',
    introduction: 'Đạt 900+ điểm TOEIC trong 3 tháng không phải là điều không thể nếu bạn có chiến lược học tập đúng đắn và sự kiên trì. Trong bài viết này, tôi sẽ chia sẻ 10 mẹo vàng đã được kiểm chứng từ những thí sinh đạt điểm cao TOEIC.',
    content: {
      sections: [
        {
          title: '1. Xây dựng nền tảng từ vựng vững chắc',
          content: 'Từ vựng là nền tảng quan trọng nhất của TOEIC. Bạn cần học ít nhất 50-100 từ mới mỗi ngày và ôn tập thường xuyên.',
          tips: {
            title: 'Mẹo học từ vựng hiệu quả',
            items: [
              'Sử dụng flashcards để ghi nhớ từ vựng',
              'Học từ vựng theo chủ đề (business, travel, office)',
              'Tạo câu ví dụ với từ vựng mới',
              'Ôn tập theo phương pháp spaced repetition'
            ]
          }
        },
        {
          title: '2. Luyện nghe mỗi ngày ít nhất 2 tiếng',
          content: 'Kỹ năng nghe cần được luyện tập thường xuyên. Hãy nghe các tài liệu TOEIC thật và các nguồn tiếng Anh khác.',
          resources: {
            title: 'Các nguồn tài liệu luyện nghe tốt',
            items: [
              'Đề thi TOEIC thật các năm trước',
              'Podcast tiếng Anh thương mại',
              'TED Talks về các chủ đề kinh doanh',
              'Tin tức BBC, CNN'
            ]
          }
        },
        {
          title: '3. Nắm vững ngữ pháp cơ bản',
          content: 'Ngữ pháp là xương sống của ngôn ngữ. Hãy tập trung vào các điểm ngữ pháp thường xuất hiện trong TOEIC.',
          quote: {
            text: 'Ngữ pháp là xương sống của ngôn ngữ. Không có ngữ pháp vững chắc, bạn sẽ khó đạt điểm cao TOEIC.',
            author: 'Thầy Anh TOEIC'
          }
        },
        {
          title: '4. Luyện đọc hiểu với tốc độ cao',
          content: 'Phần Reading của TOEIC có 100 câu trong 75 phút. Bạn cần luyện đọc nhanh và chính xác.'
        },
        {
          title: '5. Làm đề thi thử thường xuyên',
          content: 'Làm đề thi thử giúp bạn làm quen với format và thời gian thi thật.'
        },
        {
          title: '6. Phân tích lỗi sai chi tiết',
          content: 'Sau mỗi lần làm đề, hãy phân tích kỹ những câu sai để hiểu rõ nguyên nhân.'
        },
        {
          title: '7. Tạo môi trường học tập tích cực',
          content: 'Học trong môi trường yên tĩnh, có đủ ánh sáng và không bị phân tâm.'
        },
        {
          title: '8. Quản lý thời gian hiệu quả',
          content: 'Lập kế hoạch học tập cụ thể và tuân thủ nghiêm ngặt.'
        },
        {
          title: '9. Chăm sóc sức khỏe tinh thần',
          content: 'Nghỉ ngơi đầy đủ, tập thể dục thường xuyên để giữ tinh thần minh mẫn.'
        },
        {
          title: '10. Giữ động lực và kiên trì',
          content: 'Đặt mục tiêu rõ ràng và theo dõi tiến độ học tập hàng ngày.'
        }
      ]
    },
    finalAdvice: {
      title: 'Lời khuyên cuối cùng',
      content: 'Việc đạt 900+ điểm TOEIC trong 3 tháng hoàn toàn có thể nếu bạn áp dụng đúng phương pháp và kiên trì. Hãy bắt đầu ngay hôm nay và đừng bỏ cuộc!'
    },
    tags: ['TOEIC', 'Mẹo học tập', '900 điểm', 'Luyện thi', 'Kinh nghiệm'],
    commentsCount: 23
  };

  comments: BlogComment[] = [
    {
      id: 1,
      author: {
        name: 'Nguyễn Anh',
        avatar: 'NA',
        avatarColor: 'bg-blue-500'
      },
      content: 'Bài viết rất hữu ích! Mình đã áp dụng mẹo số 1 và thấy hiệu quả rõ rệt. Cảm ơn thầy!',
      timestamp: '2 giờ trước',
      likes: 12,
      replies: 3,
      isLiked: false
    },
    {
      id: 2,
      author: {
        name: 'Trần Bình',
        avatar: 'TB',
        avatarColor: 'bg-pink-500'
      },
      content: 'Mình đang học theo lộ trình 3 tháng của thầy. Hy vọng sẽ đạt được mục tiêu 900+ điểm.',
      timestamp: '4 giờ trước',
      likes: 8,
      replies: 1,
      isLiked: true
    },
    {
      id: 3,
      author: {
        name: 'Lê Cường',
        avatar: 'LC',
        avatarColor: 'bg-green-500'
      },
      content: 'Phần luyện nghe mình thấy khó nhất. Thầy có thể chia sẻ thêm tài liệu luyện nghe không?',
      timestamp: '6 giờ trước',
      likes: 15,
      replies: 2,
      isLiked: false
    }
  ];

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
        this.articleLikes = 0; // Initialize with default values
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
    // Implement share functionality
    console.log('Sharing article...');
  }

  onFollowAuthor(): void {
    this.isFollowing = !this.isFollowing;
  }

  onSubmitComment(): void {
    if (this.newComment.trim()) {
      const newComment: BlogComment = {
        id: this.comments.length + 1,
        author: {
          name: 'Bạn',
          avatar: 'U',
          avatarColor: 'bg-gray-500'
        },
        content: this.newComment,
        timestamp: 'Vừa xong',
        likes: 0,
        replies: 0,
        isLiked: false
      };

      this.comments.unshift(newComment);
      this.articleCommentsCount++;
      this.newComment = '';
    }
  }

  onLikeComment(commentId: number): void {
    const comment = this.comments.find(c => c.id === commentId);
    if (comment) {
      comment.isLiked = !comment.isLiked;
      comment.likes += comment.isLiked ? 1 : -1;
    }
  }

  onReplyComment(commentId: number): void {
    // Implement reply functionality
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
