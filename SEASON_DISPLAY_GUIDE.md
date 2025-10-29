# 🎯 Hướng Dẫn Hiển Thị Season Management trên Staff

## ✅ Đã Hoàn Thành

### 1. **Route đã được thêm vào Staff Routing**
File: `src/app/Views/Staff/staff-routing.module.ts`

```typescript
{
  path: 'seasons',
  component: SeasonManagementComponent,
  data: { title: 'Quản lý Mùa giải' }
}
```

### 2. **Menu đã có trong Sidebar**
File: `src/app/Views/Staff/Common/sidebar/sidebar.component.ts`

Menu "Mùa thi đấu" (icon: 🏆) đã được thêm vào nhóm "Quản lý Tài nguyên"

### 3. **Component đã sẵn sàng**
- ✅ `season-management.component.ts` - Logic xử lý
- ✅ `season-management.component.html` - Giao diện
- ✅ `season-management.component.css` - Styling
- ✅ `leaderboard.service.ts` - API Service

---

## 🚀 Cách Truy Cập

### Bước 1: Đảm bảo Backend đang chạy
```bash
cd lumina_backend/lumina
dotnet run
```
Backend sẽ chạy tại: `https://localhost:7162`

### Bước 2: Chạy Frontend
```bash
cd lumina_frontend/lumina
npm start
# hoặc
ng serve
```
Frontend sẽ chạy tại: `http://localhost:4200`

### Bước 3: Đăng nhập với tài khoản Staff
- Email: `staff@example.com` (hoặc tài khoản staff của bạn)
- Password: `********`

### Bước 4: Truy cập Season Management
URL: `http://localhost:4200/staff/seasons`

Hoặc click vào menu **"Mùa thi đấu"** trong sidebar (icon 🏆)

---

## 📋 Các Tính Năng Có Sẵn

### 1. **Xem Danh Sách Mùa Giải**
- Hiển thị tất cả mùa giải với phân trang
- Lọc theo trạng thái: Tất cả / Đang diễn ra / Sắp diễn ra / Đã kết thúc
- Tìm kiếm theo tên mùa giải

### 2. **Mùa Giải Hiện Tại**
- Hiển thị card gradient ở đầu trang
- Thông tin: Tên, số thứ tự, thời gian, số người tham gia
- Số ngày còn lại

### 3. **CRUD Operations**
- ➕ **Tạo mới**: Nhập tên, số thứ tự, ngày bắt đầu/kết thúc
- ✏️ **Chỉnh sửa**: Cập nhật thông tin mùa giải
- 🗑️ **Xóa**: Xóa mùa giải (có xác nhận)

### 4. **Quản Lý Mùa Giải**
- 🎯 **Đặt làm hiện tại**: Kích hoạt mùa giải
- 🔄 **Tính lại điểm**: Recalculate TOEIC scores
- ♻️ **Reset điểm**: Xóa tất cả điểm (có cảnh báo)
- 👥 **Xem bảng xếp hạng**: Top 100 người chơi

### 5. **Tự Động Quản Lý**
- Auto activate mùa giải theo ngày bắt đầu
- Auto end mùa giải theo ngày kết thúc

---

## 🎨 Giao Diện

### Header Section
```
📊 Quản Lý Mùa Giải Leaderboard
[🔄 Tự động quản lý]
```

### Current Season Card (Gradient)
```
┌─────────────────────────────────────┐
│ 🏆 MÙA GIẢI HIỆN TẠI               │
│                                     │
│ TOEIC Spring Challenge 2024         │
│ Mùa #1 | 150 người tham gia        │
│                                     │
│ ⏰ 01/01/2024 - 31/03/2024         │
│ 📅 Còn 45 ngày                      │
└─────────────────────────────────────┘
```

### Alerts (Success/Error)
```
✅ Tạo mùa giải thành công!
❌ Không thể tạo mùa giải
```

### Search Bar
```
🔍 [Tìm kiếm theo tên mùa giải...]  [+ Tạo Mùa Mới]
```

### Tabs
```
[Tất cả] [Đang diễn ra] [Sắp diễn ra] [Đã kết thúc]
```

### Table
```
┌──────────────┬────────┬──────────┬──────────┬─────────┬─────────┬─────────────┐
│ Tên Mùa      │ Số TT  │ Bắt đầu  │ Kết thúc │ Người   │ Trạng   │ Hành động   │
│              │        │          │          │ tham    │ thái    │             │
│              │        │          │          │ gia     │         │             │
├──────────────┼────────┼──────────┼──────────┼─────────┼─────────┼─────────────┤
│ Spring 2024  │   1    │ 01/01/24 │ 31/03/24 │   150   │ 🟢 Đang │ [👁️][✏️] │
│              │        │          │          │         │ diễn    │ [🎯][🔄] │
│              │        │          │          │         │         │ [♻️][🗑️] │
└──────────────┴────────┴──────────┴──────────┴─────────┴─────────┴─────────────┘
```

### Pagination
```
← Trước  [1] [2] [3] ... [10]  Tiếp →
Hiển thị 10 trên tổng 95 mùa giải
```

---

## 🎭 Modals

### 1. Create Modal
```
┌─────────────────────────────────┐
│ Tạo Mùa Giải Mới               │
│                                 │
│ Tên Mùa: [___________________] │
│ Số Thứ Tự: [___]              │
│ Ngày Bắt Đầu: [___________]   │
│ Ngày Kết Thúc: [__________]   │
│ ☐ Kích hoạt ngay              │
│                                 │
│ [Hủy]  [Tạo Mùa Giải]         │
└─────────────────────────────────┘
```

### 2. Edit Modal
```
┌─────────────────────────────────┐
│ Chỉnh Sửa Mùa Giải            │
│                                 │
│ Tên Mùa: [Spring Challenge]   │
│ Số Thứ Tự: [1]                │
│ Ngày Bắt Đầu: [01/01/2024]    │
│ Ngày Kết Thúc: [31/03/2024]   │
│ ☑ Đang hoạt động              │
│                                 │
│ [Hủy]  [Cập Nhật]             │
└─────────────────────────────────┘
```

### 3. Delete Confirmation
```
┌─────────────────────────────────┐
│ Xác Nhận Xóa                   │
│                                 │
│ Bạn có chắc muốn xóa mùa giải: │
│ "Spring Challenge 2024"?       │
│                                 │
│ Hành động này không thể hoàn   │
│ tác!                           │
│                                 │
│ [Hủy]  [Xóa]                   │
└─────────────────────────────────┘
```

### 4. Ranking Modal
```
┌─────────────────────────────────────────────────┐
│ Bảng Xếp Hạng - Spring Challenge 2024          │
│                                                  │
│ ┌──────────────────────────────────────────┐   │
│ │ #1 🥇 Nguyễn Văn A     850 điểm  🏆780   │   │
│ │ #2 🥈 Trần Thị B       820 điểm  🏆750   │   │
│ │ #3 🥉 Lê Văn C         800 điểm  🏆720   │   │
│ │ #4    Phạm Thị D       750 điểm  🎯650   │   │
│ │ #5    Hoàng Văn E      720 điểm  🎯600   │   │
│ │ ...                                       │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│                               [Đóng]            │
└─────────────────────────────────────────────────┘
```

---

## 🎨 Màu Sắc và Badges

### Status Badges
- 🟢 **Đang diễn ra** (Active): Green gradient
- 🔵 **Sắp diễn ra** (Upcoming): Blue gradient  
- ⚪ **Đã kết thúc** (Ended): Gray

### TOEIC Level Badges
- 🌱 **Beginner** (0-200): Slate gray
- 📚 **Elementary** (201-400): Blue
- 📖 **Intermediate** (401-600): Green
- 🎯 **Upper-Intermediate** (601-700): Yellow
- 🏆 **Advanced** (701-850): Orange
- 👑 **Proficient** (851-990): Red

### Ranking Badges
- 🥇 **#1**: Gold gradient
- 🥈 **#2**: Silver gradient
- 🥉 **#3**: Bronze gradient
- 🏅 **Top 10**: Green

---

## 🔧 Troubleshooting

### Lỗi: "Không thể tải danh sách mùa giải"
**Nguyên nhân**: Backend không chạy hoặc API URL sai

**Giải pháp**:
1. Kiểm tra backend đang chạy tại `https://localhost:7162`
2. Kiểm tra `environment.ts`:
   ```typescript
   apiUrl: 'https://localhost:7162/api'
   ```
3. Kiểm tra Console (F12) để xem lỗi chi tiết

### Lỗi: "401 Unauthorized"
**Nguyên nhân**: Chưa đăng nhập hoặc token hết hạn

**Giải pháp**:
1. Đăng xuất và đăng nhập lại
2. Kiểm tra role của user (phải là Staff hoặc Admin)

### Lỗi: "404 Not Found"
**Nguyên nhân**: Backend chưa có API endpoint

**Giải pháp**:
1. Chạy migration: `SeasonLeaderboardMigration.sql`
2. Kiểm tra `LeaderboardController.cs` có đầy đủ endpoints

### Component không hiển thị
**Nguyên nhân**: Route hoặc import chưa đúng

**Giải pháp**:
1. Kiểm tra `staff-routing.module.ts` có import `SeasonManagementComponent`
2. Xóa cache browser (Ctrl + Shift + Delete)
3. Restart Angular dev server (Ctrl + C, rồi `ng serve`)

---

## 📝 Testing Checklist

### Manual Testing
- [ ] Truy cập `/staff/seasons` thành công
- [ ] Hiển thị danh sách mùa giải
- [ ] Hiển thị mùa giải hiện tại
- [ ] Tạo mùa giải mới
- [ ] Chỉnh sửa mùa giải
- [ ] Xóa mùa giải
- [ ] Đặt làm mùa hiện tại
- [ ] Tính lại điểm
- [ ] Reset điểm
- [ ] Xem bảng xếp hạng
- [ ] Tự động quản lý
- [ ] Tìm kiếm hoạt động
- [ ] Phân trang hoạt động
- [ ] Tabs filter hoạt động
- [ ] Responsive trên mobile

### API Testing
```bash
# Get all seasons
GET https://localhost:7162/api/leaderboard?page=1&pageSize=10

# Get current season
GET https://localhost:7162/api/leaderboard/current

# Create season
POST https://localhost:7162/api/leaderboard
{
  "seasonName": "Test Season",
  "seasonNumber": 1,
  "startDate": "2024-01-01",
  "endDate": "2024-03-31",
  "isActive": false
}

# Get ranking
GET https://localhost:7162/api/leaderboard/1/ranking?top=100
```

---

## 🚀 Next Steps

### 1. Thêm Animation
- Thêm transition cho modals
- Fade in/out cho alerts
- Loading spinner đẹp hơn

### 2. Thêm Validation
- Validate ngày kết thúc > ngày bắt đầu
- Validate tên mùa giải không trùng
- Validate số thứ tự > 0

### 3. Thêm Tính Năng
- Export ranking to Excel/CSV
- Send notification khi mùa giải bắt đầu/kết thúc
- Chart hiển thị thống kê điểm

### 4. Optimize Performance
- Lazy load ranking table
- Cache current season
- Debounce search input

---

## 📞 Support

Nếu có vấn đề, kiểm tra:
1. Console log (F12 → Console)
2. Network tab (F12 → Network)
3. Backend logs
4. Database connection

**Documentation Files**:
- `SEASON_FEATURE_GUIDE.md` - Backend guide
- `SEASON_FRONTEND_GUIDE.md` - Frontend setup
- `SEASON_IMPLEMENTATION_SUMMARY.md` - Complete summary

**Created**: October 30, 2025
**Version**: 1.0.0
