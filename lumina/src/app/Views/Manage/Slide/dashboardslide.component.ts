import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SlideService, CreateSlideDTO } from '../../../Services/Slide/slide.service';
import { SlideDTO } from '../../../Interfaces/slide.interface';

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
  selectedSlide: SlideDTO | null = null;
  isModalOpen = false;
  isEditMode = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Search and filter
  searchKeyword = '';
  filterActive: boolean | null = null;

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

  constructor(private slideService: SlideService) {}

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
      next: (data) => {
        this.slides = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Không thể tải danh sách slides';
        console.error(error);
        this.isLoading = false;
      }
    });
  }

  // ===== FILTER & SEARCH =====
  applyFilters(): void {
    this.filteredSlides = this.slides.filter(slide => {
      const matchesSearch = !this.searchKeyword ||
        slide.slideName.toLowerCase().includes(this.searchKeyword.toLowerCase()) ||
        slide.slideUrl.toLowerCase().includes(this.searchKeyword.toLowerCase());
      
      const matchesStatus = this.filterActive === null || slide.isActive === this.filterActive;
      
      return matchesSearch && matchesStatus;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchKeyword = '';
    this.filterActive = null;
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
}
