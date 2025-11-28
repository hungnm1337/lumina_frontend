import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SlideService, CreateSlideDTO } from '../../../Services/Slide/slide.service';
import { SlideDTO } from '../../../Interfaces/slide.interface';
import { UserService } from '../../../Services/User/user.service';

@Component({
  selector: 'app-dashboard-slide',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboardslide.component.html',
  styleUrls: ['./dashboardslide.component.scss']
})
export class DashboardSlideComponent implements OnInit {
  slides: SlideDTO[] = [];
  filteredSlides: SlideDTO[] = [];
  pagedSlides: SlideDTO[] = []; // Slides cho trang hiện tại
  selectedSlide: SlideDTO | null = null;
  isModalOpen = false;
  isEditMode = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Search and filter
  searchKeyword = '';
  filterActive: boolean | null = null;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 5; // Mỗi trang 5 slide
  totalPages: number = 1;

  // Form data
  formData: SlideDTO = {
    slideUrl: '',
    slideName: '',
    isActive: true,
    createBy: 0,
    createAt: new Date()
  };

  // File upload
  selectedFile: File | null = null;

  // User name cache
  private userNameCache: Map<number, string> = new Map();

  constructor(
    private slideService: SlideService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadSlides();
  }

  // ===== GETTER METHODS =====
  get activeSlidesCount(): number {
    return this.slides.filter(s => s.isActive === true).length;
  }

  get inactiveSlidesCount(): number {
    return this.slides.filter(s => s.isActive === false).length;
  }

  // ===== DATA LOADING =====
  loadSlides(): void {
    this.isLoading = true;
    this.slideService.getAllSlides().subscribe({
      next: async (data) => {
        this.slides = data;
        // Load user names for all unique createBy IDs and wait for completion
        await this.loadUserNames(data);
        this.applyFilters(); // applyFilters sẽ gọi updatePagination
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Không thể tải danh sách slides';
        console.error(error);
        this.isLoading = false;
      }
    });
  }

  // Load user names for all unique createBy IDs
  private async loadUserNames(slides: SlideDTO[]): Promise<void> {
    const uniqueUserIds = new Set<number>();
    slides.forEach(slide => {
      if (slide.createBy && slide.createBy > 0 && !this.userNameCache.has(slide.createBy)) {
        uniqueUserIds.add(slide.createBy);
      }
    });

    if (uniqueUserIds.size === 0) {
      return;
    }

    // Load all user names in parallel
    const loadPromises = Array.from(uniqueUserIds).map(userId => {
      return new Promise<void>((resolve) => {
        console.log(`📢 [Slide] Loading user name for userId: ${userId}`);
        this.userService.getUserById(userId).subscribe({
          next: (user) => {
            console.log(`📢 [Slide] User ${userId} response:`, user);
            // Backend returns FullName (capital F, capital N) - check both cases
            const fullName = user?.FullName || user?.fullName || user?.name || null;
            console.log(`📢 [Slide] Extracted fullName for ${userId}:`, fullName);
            
            if (fullName && typeof fullName === 'string' && fullName.trim()) {
              this.userNameCache.set(userId, fullName.trim());
              console.log(`✅ [Slide] Loaded user name: ${userId} -> "${fullName.trim()}"`);
            } else {
              this.userNameCache.set(userId, `User ${userId}`);
              console.warn(`⚠️ [Slide] User ${userId} has no fullName. Response keys:`, Object.keys(user || {}));
            }
            resolve();
          },
          error: (error) => {
            console.error(`❌ [Slide] Error loading user ${userId}:`, error);
            console.error(`   Status:`, error?.status);
            console.error(`   Message:`, error?.message);
            console.error(`   Full error:`, JSON.stringify(error, null, 2));
            this.userNameCache.set(userId, `User ${userId}`);
            resolve();
          }
        });
      });
    });

    // Wait for all user names to load before continuing
    await Promise.all(loadPromises);
    console.log(`✅ All ${uniqueUserIds.size} user names loaded successfully`);
  }

  // ===== FILTER & SEARCH =====
  applyFilters(): void {
    this.filteredSlides = this.slides.filter(slide => {
      const matchesSearch = !this.searchKeyword ||
        slide.slideName.toLowerCase().includes(this.searchKeyword.toLowerCase());
      
      const matchesStatus = this.filterActive === null || slide.isActive === this.filterActive;
      
      return matchesSearch && matchesStatus;
    });

    // Tính toán pagination sau khi filter
    this.updatePagination();
  }

  // ===== PAGINATION =====
  updatePagination(): void {
    // Đảm bảo totalPages ít nhất là 1 nếu có dữ liệu
    this.totalPages = Math.max(1, Math.ceil(this.filteredSlides.length / this.pageSize));
    
    // Điều chỉnh currentPage nếu vượt quá totalPages
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    // Tính toán pagedSlides
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.pagedSlides = this.filteredSlides.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
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

  getStartIndex(): number {
    if (this.filteredSlides.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    if (this.filteredSlides.length === 0) {
      return 0;
    }
    return Math.min(this.currentPage * this.pageSize, this.filteredSlides.length);
  }

  onSearchChange(): void {
    this.currentPage = 1; // Reset về trang 1 khi search
    this.applyFilters();
  }

  onFilterChange(): void {
    this.currentPage = 1; // Reset về trang 1 khi filter
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchKeyword = '';
    this.filterActive = null;
    this.currentPage = 1; // Reset về trang 1 khi clear
    this.applyFilters();
  }

  // ===== MODAL MANAGEMENT =====
  openCreateModal(): void {
    this.isEditMode = true;
    this.selectedSlide = null;
    this.selectedFile = null;
    this.formData = {
      slideUrl: '',
      slideName: '',
      isActive: true,
      createBy: 0,
      createAt: new Date()
    };
    this.isModalOpen = true;
    this.clearMessages();
  }

  openEditModal(slide: SlideDTO): void {
    this.isEditMode = true;
    this.selectedSlide = slide;
    this.selectedFile = null;
    this.formData = { ...slide };
    this.isModalOpen = true;
    this.clearMessages();
  }

  openViewModal(slide: SlideDTO): void {
    this.isEditMode = false;
    this.selectedSlide = slide;
    this.isModalOpen = true;
    this.clearMessages();
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.selectedSlide = null;
    this.selectedFile = null;
    this.clearMessages();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      
      // Validate file type
      if (!this.selectedFile.type.startsWith('image/')) {
        this.errorMessage = 'Vui lòng chọn file ảnh hợp lệ';
        this.selectedFile = null;
        input.value = '';
        return;
      }
      
      // Validate file size (max 10MB)
      if (this.selectedFile.size > 10 * 1024 * 1024) {
        this.errorMessage = 'Kích thước file không được vượt quá 10MB';
        this.selectedFile = null;
        input.value = '';
        return;
      }
      
      this.clearMessages();
    }
  }

  // ===== CRUD OPERATIONS =====
  saveSlide(): void {
    if (!this.formData.slideName) {
      this.errorMessage = 'Vui lòng điền tên slide';
      return;
    }

    // Khi tạo mới, bắt buộc phải có file
    if (!this.selectedSlide && !this.selectedFile) {
      this.errorMessage = 'Vui lòng chọn ảnh để upload';
      return;
    }

    // Khi chỉnh sửa, nếu không chọn file mới thì vẫn cho phép (giữ nguyên ảnh cũ)
    if (this.selectedSlide && !this.selectedFile && !this.selectedSlide.slideUrl) {
      this.errorMessage = 'Vui lòng chọn ảnh để upload';
      return;
    }

    this.isLoading = true;
    this.clearMessages();

    if (this.selectedSlide && this.selectedSlide.slideId) {
      // Update existing slide
      this.slideService.updateSlideWithFile(
        this.selectedSlide.slideId,
        this.formData.slideName,
        this.formData.isActive ?? true,
        this.selectedFile
      ).subscribe({
        next: () => {
          this.successMessage = 'Cập nhật slide thành công!';
          this.loadSlides();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: (error) => {
          this.errorMessage = 'Không thể cập nhật slide';
          console.error(error);
          this.isLoading = false;
        }
      });
    } else {
      // Create new slide
      if (!this.selectedFile) {
        this.errorMessage = 'Vui lòng chọn ảnh để upload';
        this.isLoading = false;
        return;
      }

      this.slideService.createSlideWithFile(
        this.formData.slideName,
        this.formData.isActive ?? true,
        this.selectedFile
      ).subscribe({
        next: () => {
          this.successMessage = 'Tạo slide thành công!';
          this.loadSlides();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: (error) => {
          this.errorMessage = 'Không thể tạo slide';
          console.error(error);
          this.isLoading = false;
        }
      });
    }
  }

  deleteSlide(slide: SlideDTO): void {
    if (!slide.slideId) return;
    
    if (confirm(`Bạn có chắc chắn muốn xóa slide "${slide.slideName}"?`)) {
      this.slideService.deleteSlide(slide.slideId).subscribe({
        next: () => {
          this.successMessage = 'Xóa slide thành công!';
          this.loadSlides();
          setTimeout(() => this.clearMessages(), 3000);
        },
        error: (error) => {
          this.errorMessage = 'Không thể xóa slide';
          console.error(error);
        }
      });
    }
  }

  // ===== HELPER METHODS =====
  // SỬA: Thêm null check cho isActive
  getStatusText(isActive: boolean | undefined): string {
    return isActive === true ? 'Hoạt động' : 'Không hoạt động';
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Copy Cloudinary URL to clipboard
  copyCloudinaryUrl(url: string): void {
    navigator.clipboard.writeText(url).then(() => {
      this.successMessage = 'Đã copy link ảnh vào clipboard!';
      setTimeout(() => this.clearMessages(), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      this.errorMessage = 'Không thể copy link. Vui lòng copy thủ công.';
      setTimeout(() => this.clearMessages(), 3000);
    });
  }

  // Get user name from cache or return default
  getUserName(userId: number | undefined): string {
    if (!userId || userId <= 0) return 'N/A';
    
    // Check cache first - this should be populated after loadSlides completes
    if (this.userNameCache.has(userId)) {
      const cachedName = this.userNameCache.get(userId)!;
      console.log(`📢 [Slide] getUserName(${userId}) from cache: "${cachedName}"`);
      return cachedName;
    }
    
    // If not in cache, try to load it (for edge cases like new slides)
    // But return a temporary value immediately
    console.log(`📢 [Slide] getUserName(${userId}) not in cache, loading...`);
    this.userService.getUserById(userId).subscribe({
      next: (user) => {
        console.log(`📢 [Slide] getUserName(${userId}) response:`, user);
        // Backend returns FullName (capital F, capital N) - check multiple variations
        const fullName = user?.FullName || user?.fullName || user?.name || null;
        console.log(`📢 [Slide] getUserName(${userId}) extracted:`, fullName);
        
        if (fullName && typeof fullName === 'string' && fullName.trim()) {
          this.userNameCache.set(userId, fullName.trim());
          console.log(`✅ [Slide] getUserName(${userId}) cached: "${fullName.trim()}"`);
        } else {
          this.userNameCache.set(userId, `User ${userId}`);
          console.warn(`⚠️ [Slide] getUserName(${userId}) no name found. Response:`, user);
        }
      },
      error: (error) => {
        console.error(`❌ [Slide] getUserName(${userId}) error:`, error);
        this.userNameCache.set(userId, `User ${userId}`);
      }
    });
    
    // Return temporary value while loading
    return `User ${userId}`;
  }
}
