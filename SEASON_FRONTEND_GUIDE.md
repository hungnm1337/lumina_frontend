# 🎮 Frontend Season Management - Hướng Dẫn Sử Dụng

## 📁 Cấu Trúc Files

```
lumina_frontend/lumina/src/app/
├── Services/Leaderboard/
│   └── leaderboard.service.ts         # Service gọi API
└── Views/Staff/Season/
    ├── season-management.component.ts    # Component logic
    ├── season-management.component.html  # Template HTML
    └── season-management.component.css   # Styles
```

## 🚀 Setup & Installation

### 1. Import Module

Thêm vào routing của Staff (nếu chưa có):

```typescript
// staff-routing.module.ts hoặc app.routes.ts
import { SeasonManagementComponent } from './Views/Staff/Season/season-management.component';

const routes: Routes = [
  {
    path: 'staff',
    children: [
      {
        path: 'seasons',
        component: SeasonManagementComponent,
        // canActivate: [AuthGuard], // Nếu có guard
        data: { roles: ['Admin', 'Staff'] }
      }
    ]
  }
];
```

### 2. Environment Configuration

Đảm bảo `environment.ts` có API URL:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000' // hoặc https://your-api.com
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.lumina-toeic.com'
};
```

### 3. Import HttpClientModule

Trong `app.config.ts` hoặc `app.module.ts`:

```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    // ... other providers
  ]
};
```

## 🎨 Tính Năng Chính

### 1. **Danh Sách Mùa Giải**
- ✅ Hiển thị tất cả mùa giải với phân trang
- ✅ Filter theo trạng thái (All, Active, Upcoming, Ended)
- ✅ Search theo tên hoặc số mùa
- ✅ Hiển thị thông tin: tên, thời gian, số người tham gia, trạng thái

### 2. **CRUD Operations**

#### Tạo Mùa Giải Mới
```typescript
// Click "Tạo Mùa Giải Mới"
// Fill form:
createForm = {
  seasonName: "Spring Challenge 2025",
  seasonNumber: 4,
  startDate: "2025-04-01T00:00:00",
  endDate: "2025-06-30T23:59:59",
  isActive: false
}
```

#### Chỉnh Sửa Mùa Giải
```typescript
// Click icon ✏️ trên dòng
// Update thông tin trong modal
```

#### Xóa Mùa Giải
```typescript
// Click icon 🗑️
// Confirm trong modal
```

### 3. **Quản Lý Mùa Giải**

#### Đặt Làm Mùa Hiện Tại
```typescript
// Click icon ⭐
// Mùa được chọn sẽ trở thành "Mùa Hiện Tại"
```

#### Tính Lại Điểm
```typescript
// Click icon 🔄
// Tính lại điểm cho tất cả users trong mùa
```

#### Reset Điểm
```typescript
// Click icon ⚠️
// XÓA tất cả điểm (cẩn thận!)
```

#### Tự Động Quản Lý
```typescript
// Click "Tự Động Quản Lý"
// Auto activate/end seasons dựa trên ngày tháng
```

### 4. **Xem Bảng Xếp Hạng**

```typescript
// Click icon 📊
// Hiển thị Top 100 với:
// - Rank (1, 2, 3 có badge đặc biệt)
// - Tên và avatar
// - Điểm số
// - TOEIC ước tính
// - Trình độ (Beginner → Proficient)
```

## 🎯 Use Cases

### Use Case 1: Tạo Mùa Mới Cho Quý 2
```typescript
1. Click "Tạo Mùa Giải Mới"
2. Nhập:
   - Tên: "Summer Sprint 2025"
   - Số mùa: 2
   - Bắt đầu: 01/04/2025 00:00
   - Kết thúc: 30/06/2025 23:59
   - Kích hoạt ngay: ✓
3. Click "Tạo Mùa Giải"
```

### Use Case 2: Kết Thúc Mùa Cũ và Bắt Đầu Mùa Mới
```typescript
1. Tìm mùa cũ (VD: Season 1)
2. Click icon ⚠️ để Reset điểm
3. Click icon ✏️ và uncheck "Kích hoạt"
4. Tạo mùa mới (Season 2)
5. Click icon ⭐ để đặt làm mùa hiện tại
```

### Use Case 3: Xem Thống Kê Mùa Hiện Tại
```typescript
1. Card "Mùa Giải Hiện Tại" hiển thị:
   - Tên mùa
   - Thời gian
   - Số người tham gia
   - Số ngày còn lại
2. Click icon 📊 để xem chi tiết ranking
```

## 🎨 UI Components

### Status Badges
```typescript
- Active: Màu xanh lá
- Upcoming: Màu xanh dương
- Ended: Màu xám
```

### TOEIC Level Colors
```typescript
- Beginner: Slate (#94a3b8) 🌱
- Elementary: Blue (#60a5fa) 📚
- Intermediate: Green (#34d399) 📖
- Upper-Intermediate: Yellow (#fbbf24) 🎯
- Advanced: Orange (#f97316) 🏆
- Proficient: Red (#dc2626) 👑
```

### Ranking Badges
```typescript
- #1: Vàng (Gold)
- #2: Bạc (Silver)
- #3: Đồng (Bronze)
- #4-100: Default
```

## 🔧 API Integration

Service đã tích hợp sẵn tất cả endpoints:

```typescript
// Service methods
leaderboardService.getAllPaginated(keyword, page, pageSize)
leaderboardService.getCurrentSeason()
leaderboardService.create(dto)
leaderboardService.update(id, dto)
leaderboardService.delete(id)
leaderboardService.setAsCurrent(id)
leaderboardService.getRanking(id, top)
leaderboardService.recalculate(id)
leaderboardService.reset(id, archiveScores)
leaderboardService.autoManage()
```

## 🛡️ Authorization

Component yêu cầu role **Admin** hoặc **Staff**.

Trong interceptor:

```typescript
// auth.interceptor.ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  
  return next(req);
};
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Load trang hiển thị đúng danh sách seasons
- [ ] Pagination hoạt động (next/prev)
- [ ] Search tìm kiếm chính xác
- [ ] Filter tabs (All, Active, Upcoming, Ended)
- [ ] Tạo mùa mới thành công
- [ ] Edit mùa giải cập nhật đúng
- [ ] Delete xóa mùa thành công
- [ ] Set current season hoạt động
- [ ] View ranking hiển thị đúng
- [ ] Recalculate tính điểm đúng
- [ ] Reset xóa điểm thành công
- [ ] Auto manage kích hoạt/kết thúc đúng

## 📱 Responsive Design

Component hỗ trợ responsive:
- Desktop: Full layout
- Tablet: Adjusted grid
- Mobile: Stacked layout, scrollable table

## 🎭 Error Handling

```typescript
// Tất cả API calls đều có error handling
this.leaderboardService.create(dto).subscribe({
  next: (result) => {
    // Success
  },
  error: (err) => {
    // Show error message
    this.error = err.error?.message || 'Đã xảy ra lỗi';
  }
});
```

## 🚀 Performance Tips

1. **Pagination**: Giới hạn 10 items/page
2. **Lazy Loading**: Load ranking chỉ khi cần
3. **Caching**: Consider caching current season
4. **Debounce**: Search có thể thêm debounce

## 📚 Next Steps

### Phase 2 Features
- [ ] Export ranking to Excel/PDF
- [ ] Email notifications to top users
- [ ] Season templates (quick create)
- [ ] Bulk operations
- [ ] Advanced analytics dashboard
- [ ] Season comparison charts

### Improvements
- [ ] Add loading skeleton
- [ ] Add toast notifications
- [ ] Add confirmation tooltips
- [ ] Add keyboard shortcuts
- [ ] Add drag-and-drop for dates

## 🐛 Common Issues

### Issue 1: API không kết nối
**Solution**: Check `environment.apiUrl` và CORS settings

### Issue 2: Token expired
**Solution**: Implement token refresh logic

### Issue 3: Date format không đúng
**Solution**: Ensure datetime-local format: `YYYY-MM-DDTHH:mm`

## 📞 Support

- Backend API Docs: `SEASON_FEATURE_GUIDE.md`
- API Reference: `/swagger` endpoint
- Team Support: Slack #lumina-dev

---

**Version**: 1.0  
**Last Updated**: October 30, 2025  
**Author**: Lumina Frontend Team
