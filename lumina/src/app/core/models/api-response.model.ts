/**
 * Chuẩn hóa dữ liệu phản hồi từ Backend Lumina.
 * Khớp 100% với cấu trúc ApiResponse<T> của C# .NET N-Tier.
 */
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errors?: any;
  timestamp: string;
}

/**
 * Cấu trúc phân trang danh sách chuẩn hóa.
 */
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/**
 * Bộ lọc truy vấn cơ bản (paging, sort, keyword).
 */
export interface BaseQueryFilter {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  sortBy?: string;
  isAscending?: boolean;
}
