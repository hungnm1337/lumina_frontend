// Article interfaces để match với backend DTOs

export interface ArticleSectionCreate {
  sectionTitle: string;
  sectionContent: string;
  orderIndex: number;
}

export interface ArticleCreate {
  title: string;
  summary: string;
  categoryId: number;
  publishNow: boolean;
  sections: ArticleSectionCreate[];
}

export interface ArticleSectionResponse {
  sectionId: number;
  sectionTitle: string;
  sectionContent: string;
  orderIndex: number;
}

export interface ArticleResponse {
  articleId: number;
  title: string;
  summary: string;
  isPublished: boolean | null;
  status: string | null;
  createdAt: string;
  authorName: string;
  categoryName: string;
  rejectionReason?: string | null;
  sections: ArticleSectionResponse[];
}

export interface ArticleCategory {
  id: number;
  name: string;
}

// Interface cho component (để tương thích với UI hiện tại)
export interface Article {
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
  rejectionReason?: string;
}

export interface ArticleSection {
  type: 'đoạn văn' | 'hình ảnh' | 'video' | 'danh sách';
  content: string;
  sectionTitle?: string; // Thêm sectionTitle để tương thích với backend
}


