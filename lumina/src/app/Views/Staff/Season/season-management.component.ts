import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaderboardService, LeaderboardDTO, CreateLeaderboardDTO, UpdateLeaderboardDTO } from '../../../Services/Leaderboard/leaderboard.service';

@Component({
  selector: 'app-season-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './season-management.component.html',
  styleUrls: ['./season-management.component.css']
})
export class SeasonManagementComponent implements OnInit {
  // Data
  seasons: LeaderboardDTO[] = [];
  currentSeason: LeaderboardDTO | null = null;
  selectedSeason: LeaderboardDTO | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  totalItems = 0;
  keyword = '';

  // Modal states
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;

  // Form data
  createForm: CreateLeaderboardDTO = {
    seasonName: null,
    seasonNumber: 1,
    startDate: null,
    endDate: null,
    isActive: false
  };

  editForm: UpdateLeaderboardDTO = {
    seasonName: null,
    seasonNumber: 1,
    startDate: null,
    endDate: null,
    isActive: false
  };

  // Loading & Error
  loading = false;
  error = '';
  success = '';

  // Tab
  activeTab: 'all' | 'active' | 'upcoming' | 'ended' = 'all';

  constructor(public leaderboardService: LeaderboardService) { }

  ngOnInit(): void {
    this.loadSeasons();
    this.loadCurrentSeason();
  }

  // ==================== LOAD DATA ====================

  loadSeasons(): void {
    this.loading = true;
    this.error = '';

    this.leaderboardService.getAllPaginated(this.keyword, this.currentPage, this.pageSize).subscribe({
      next: (result) => {
        this.seasons = result.items;
        this.totalPages = result.totalPages;
        this.totalItems = result.total;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Không thể tải danh sách mùa giải';
        console.error(err);
        this.loading = false;
      }
    });
  }

  loadCurrentSeason(): void {
    this.leaderboardService.getCurrentSeason().subscribe({
      next: (season) => {
        this.currentSeason = season;
      },
      error: (err) => {
        console.log('Không có mùa giải hiện tại', err);
      }
    });
  }

  // ==================== PAGINATION ====================

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadSeasons();
    }
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadSeasons();
  }

  // ==================== CRUD OPERATIONS ====================

  openCreateModal(): void {
    this.createForm = {
      seasonName: null,
      seasonNumber: this.getNextSeasonNumber(),
      startDate: null,
      endDate: null,
      isActive: false
    };
    this.showCreateModal = true;
    this.error = '';
    this.success = '';
  }

  onCreate(): void {
    // Validate form - Kiểm tra đầy đủ thông tin
    if (!this.createForm.startDate || !this.createForm.endDate) {
      this.error = 'Vui lòng nhập đầy đủ ngày bắt đầu và ngày kết thúc';
      return;
    }

    // Validate dates - Kiểm tra logic ngày tháng
    const startDate = new Date(this.createForm.startDate);
    const endDate = new Date(this.createForm.endDate);

    if (endDate <= startDate) {
      this.error = 'Ngày kết thúc phải sau ngày bắt đầu';
      return;
    }

    // Calculate duration
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (durationDays < 7) {
      this.error = 'Mùa giải phải kéo dài ít nhất 7 ngày';
      return;
    }

    if (durationDays > 365) {
      this.error = 'Mùa giải không được vượt quá 365 ngày';
      return;
    }

    // Check overlap with existing seasons
    const overlapInfo = this.getOverlappingSeasonInfo(startDate, endDate);

    if (overlapInfo) {
      this.error = `Khoảng thời gian bị trùng!\n${overlapInfo}\n\nVui lòng chọn thời gian khác`;
      return;
    }

    // Check if start date is in the past
    const now = new Date();
    if (startDate < now && !this.createForm.isActive) {
      this.error = 'Ngày bắt đầu đã qua. Bạn có muốn kích hoạt mùa giải ngay không?';
      return;
    }

    this.loading = true;
    this.error = '';

    // Format dates to ISO 8601
    const formData = {
      ...this.createForm,
      startDate: this.createForm.startDate ? new Date(this.createForm.startDate).toISOString() : null,
      endDate: this.createForm.endDate ? new Date(this.createForm.endDate).toISOString() : null
    };

    console.log('Creating season with data:', formData);

    this.leaderboardService.create(formData).subscribe({
      next: (id) => {
        this.success = 'Tạo mùa giải thành công!';
        this.showCreateModal = false;
        this.loadSeasons();
        this.loadCurrentSeason();
        this.loading = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err) => {
        console.error('Create error:', err);
        if (err.status === 401) {
          this.error = 'Bạn không có quyền tạo mùa giải. Vui lòng đăng nhập lại';
        } else if (err.status === 403) {
          this.error = 'Bạn không có quyền thực hiện thao tác này';
        } else if (err.error?.message) {
          this.error = err.error.message;
        } else {
          this.error = 'Không thể tạo mùa giải. Vui lòng thử lại sau';
        }
        this.loading = false;
      }
    });
  }

  openEditModal(season: LeaderboardDTO): void {
    this.selectedSeason = season;

    // Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatForInput = (dateStr: string | null): string | null => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    this.editForm = {
      seasonName: season.seasonName,
      seasonNumber: season.seasonNumber,
      startDate: formatForInput(season.startDate),
      endDate: formatForInput(season.endDate),
      isActive: season.isActive
    };
    this.showEditModal = true;
    this.error = '';
    this.success = '';
  }

  onUpdate(): void {
    if (!this.selectedSeason) return;

    // Validate form - Kiểm tra đầy đủ thông tin
    if (!this.editForm.startDate || !this.editForm.endDate) {
      this.error = 'Vui lòng nhập đầy đủ ngày bắt đầu và ngày kết thúc';
      return;
    }

    // Validate dates - Kiểm tra logic ngày tháng
    const startDate = new Date(this.editForm.startDate);
    const endDate = new Date(this.editForm.endDate);

    if (endDate <= startDate) {
      this.error = 'Ngày kết thúc phải sau ngày bắt đầu';
      return;
    }

    // Calculate duration
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (durationDays < 7) {
      this.error = 'Mùa giải phải kéo dài ít nhất 7 ngày';
      return;
    }

    if (durationDays > 365) {
      this.error = 'Mùa giải không được vượt quá 365 ngày';
      return;
    }

    // Check overlap with OTHER existing seasons (not including current season being edited)
    const overlapInfo = this.getOverlappingSeasonInfo(startDate, endDate, this.selectedSeason.leaderboardId);

    if (overlapInfo) {
      this.error = `Khoảng thời gian bị trùng!\n${overlapInfo}\n\nVui lòng chọn thời gian khác`;
      return;
    }

    this.loading = true;
    this.error = '';

    // Format dates to ISO 8601
    const formData = {
      ...this.editForm,
      startDate: this.editForm.startDate ? new Date(this.editForm.startDate).toISOString() : null,
      endDate: this.editForm.endDate ? new Date(this.editForm.endDate).toISOString() : null
    };

    console.log('Updating season with data:', formData);

    this.leaderboardService.update(this.selectedSeason.leaderboardId, formData).subscribe({
      next: () => {
        this.success = 'Cập nhật mùa giải thành công!';
        this.showEditModal = false;
        this.loadSeasons();
        this.loadCurrentSeason();
        this.loading = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err) => {
        console.error('Update error:', err);
        if (err.status === 401) {
          this.error = 'Bạn không có quyền cập nhật mùa giải. Vui lòng đăng nhập lại';
        } else if (err.status === 403) {
          this.error = 'Bạn không có quyền thực hiện thao tác này';
        } else if (err.status === 404) {
          this.error = 'Không tìm thấy mùa giải này';
        } else if (err.error?.message) {
          this.error = err.error.message;
        } else {
          this.error = 'Không thể cập nhật mùa giải. Vui lòng thử lại sau';
        }
        this.loading = false;
      }
    });
  }

  openDeleteModal(season: LeaderboardDTO): void {
    this.selectedSeason = season;
    this.showDeleteModal = true;
    this.error = '';
  }

  onDelete(): void {
    if (!this.selectedSeason) return;

    this.loading = true;
    this.error = '';

    this.leaderboardService.delete(this.selectedSeason.leaderboardId).subscribe({
      next: () => {
        this.success = 'Xóa mùa giải thành công!';
        this.showDeleteModal = false;
        this.loadSeasons();
        this.loading = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err) => {
        if (err.status === 401) {
          this.error = 'Bạn không có quyền xóa mùa giải. Vui lòng đăng nhập lại';
        } else if (err.status === 403) {
          this.error = 'Bạn không có quyền thực hiện thao tác này';
        } else if (err.status === 404) {
          this.error = 'Không tìm thấy mùa giải này';
        } else if (err.error?.message) {
          this.error = err.error.message;
        } else {
          this.error = 'Không thể xóa mùa giải. Có thể mùa giải đang được sử dụng';
        }
        this.loading = false;
      }
    });
  }

  // ==================== ACTIONS ====================

  setAsCurrent(season: LeaderboardDTO): void {
    if (confirm(`Đặt "${season.seasonName}" làm mùa giải hiện tại?`)) {
      this.loading = true;

      this.leaderboardService.setAsCurrent(season.leaderboardId).subscribe({
        next: () => {
          this.success = 'Đã đặt mùa giải hiện tại thành công!';
          this.loadSeasons();
          this.loadCurrentSeason();
          this.loading = false;
          setTimeout(() => this.success = '', 3000);
        },
        error: (err) => {
          if (err.status === 401) {
            this.error = 'Bạn không có quyền thay đổi mùa giải hiện tại. Vui lòng đăng nhập lại';
          } else if (err.status === 403) {
            this.error = 'Bạn không có quyền thực hiện thao tác này';
          } else if (err.error?.message) {
            this.error = err.error.message;
          } else {
            this.error = 'Không thể đặt mùa giải hiện tại';
          }
          this.loading = false;
        }
      });
    }
  }

  recalculate(season: LeaderboardDTO): void {
    if (confirm(`Tính lại điểm cho "${season.seasonName}"?\n\nThao tác này có thể mất vài phút.`)) {
      this.loading = true;

      this.leaderboardService.recalculate(season.leaderboardId).subscribe({
        next: (result) => {
          this.success = result.message;
          this.loadSeasons();
          this.loading = false;
          setTimeout(() => this.success = '', 5000);
        },
        error: (err) => {
          if (err.status === 401) {
            this.error = 'Bạn không có quyền tính lại điểm. Vui lòng đăng nhập lại';
          } else if (err.status === 403) {
            this.error = 'Bạn không có quyền thực hiện thao tác này';
          } else if (err.error?.message) {
            this.error = err.error.message;
          } else {
            this.error = 'Không thể tính lại điểm';
          }
          this.loading = false;
        }
      });
    }
  }

  resetSeason(season: LeaderboardDTO): void {
    if (confirm(`CẢNH BÁO: Reset điểm cho "${season.seasonName}"?\n\nTất cả điểm của người chơi sẽ bị xóa!\n\nHành động này KHÔNG THỂ HOÀN TÁC!`)) {
      this.loading = true;

      this.leaderboardService.reset(season.leaderboardId, true).subscribe({
        next: (result) => {
          this.success = result.message;
          this.loadSeasons();
          this.loading = false;
          setTimeout(() => this.success = '', 5000);
        },
        error: (err) => {
          if (err.status === 401) {
            this.error = 'Bạn không có quyền reset mùa giải. Vui lòng đăng nhập lại';
          } else if (err.status === 403) {
            this.error = 'Bạn không có quyền thực hiện thao tác này';
          } else if (err.error?.message) {
            this.error = err.error.message;
          } else {
            this.error = 'Không thể reset mùa giải';
          }
          this.loading = false;
        }
      });
    }
  }

  autoManage(): void {
    if (confirm('Tự động kích hoạt và kết thúc các mùa giải dựa trên thời gian?')) {
      this.loading = true;

      this.leaderboardService.autoManage().subscribe({
        next: (result) => {
          this.success = result.message;
          this.loadSeasons();
          this.loadCurrentSeason();
          this.loading = false;
          setTimeout(() => this.success = '', 3000);
        },
        error: (err) => {
          if (err.status === 401) {
            this.error = 'Bạn không có quyền tự động quản lý. Vui lòng đăng nhập lại';
          } else if (err.status === 403) {
            this.error = 'Bạn không có quyền thực hiện thao tác này';
          } else if (err.error?.message) {
            this.error = err.error.message;
          } else {
            this.error = 'Không thể tự động quản lý';
          }
          this.loading = false;
        }
      });
    }
  }

  // ==================== HELPERS ====================

  getNextSeasonNumber(): number {
    if (this.seasons.length === 0) return 1;
    return Math.max(...this.seasons.map(s => s.seasonNumber)) + 1;
  }

  // Helper to check and display overlapping season details
  private getOverlappingSeasonInfo(startDate: Date, endDate: Date, excludeSeasonId?: number): string | null {
    const overlappingSeason = this.seasons
      .filter(season => excludeSeasonId ? season.leaderboardId !== excludeSeasonId : true)
      .find(season => {
        const seasonStart = new Date(season.startDate || '');
        const seasonEnd = new Date(season.endDate || '');
        return (startDate <= seasonEnd && endDate >= seasonStart);
      });

    if (overlappingSeason) {
      const formatDate = (date: string | null) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('vi-VN');
      };

      return `Trùng với "${overlappingSeason.seasonName || 'Season ' + overlappingSeason.seasonNumber}" (${formatDate(overlappingSeason.startDate)} - ${formatDate(overlappingSeason.endDate)})`;
    }

    return null;
  }

  filterByTab(): LeaderboardDTO[] {
    switch (this.activeTab) {
      case 'active':
        return this.seasons.filter(s => s.status === 'Active');
      case 'upcoming':
        return this.seasons.filter(s => s.status === 'Upcoming');
      case 'ended':
        return this.seasons.filter(s => s.status === 'Ended');
      default:
        return this.seasons;
    }
  }

  closeAllModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.error = '';
  }
}
