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
    this.clearMessages();
  }

  // ===== CRUD OPERATIONS =====
  saveSlide(): void {
    if (!this.formData.slideName || !this.formData.slideUrl) {
      this.errorMessage = 'Vui lòng điền đầy đủ thông tin';
      return;
    }

    this.isLoading = true;
    this.clearMessages();

    if (this.selectedSlide && this.selectedSlide.slideId) {
      // Update existing slide
      this.slideService.updateSlide(this.selectedSlide.slideId, this.formData).subscribe({
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
      // Create new slide - SỬA: Cast đúng type
      const createData = {
        slideName: this.formData.slideName,
        slideUrl: this.formData.slideUrl,
        isActive: this.formData.isActive
      } as any; // Cast to bypass type checking

      this.slideService.createSlide(createData).subscribe({
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
