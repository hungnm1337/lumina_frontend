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

  loadSlides(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.slideService.getAllSlides().subscribe({
      next: (slides) => {
        this.slides = slides;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Lỗi khi tải danh sách slide: ' + error.message;
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredSlides = this.slides.filter(slide => {
      const matchesKeyword = !this.searchKeyword || 
        slide.slideName.toLowerCase().includes(this.searchKeyword.toLowerCase()) ||
        slide.slideUrl.toLowerCase().includes(this.searchKeyword.toLowerCase());
      
      const matchesActive = this.filterActive === null || slide.isActive === this.filterActive;
      
      return matchesKeyword && matchesActive;
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

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedSlide = null;
    this.formData = {
      slideUrl: '',
      slideName: '',
      isActive: true,
      createBy: 0,
      createAt: new Date()
    };
    this.isModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openEditModal(slide: SlideDTO): void {
    this.isEditMode = true;
    this.selectedSlide = slide;
    this.formData = { ...slide };
    this.isModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openViewModal(slide: SlideDTO): void {
    this.selectedSlide = slide;
    this.isModalOpen = true;
    this.isEditMode = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedSlide = null;
    this.isEditMode = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  saveSlide(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    if (this.isEditMode && this.selectedSlide?.slideId) {
      // Update existing slide
      this.slideService.updateSlide(this.selectedSlide.slideId, this.formData).subscribe({
        next: () => {
          this.successMessage = 'Cập nhật slide thành công!';
          this.loadSlides();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: (error) => {
          this.errorMessage = 'Lỗi khi cập nhật slide: ' + error.message;
          this.isLoading = false;
        }
      });
    } else {
      // Create new slide
      const createData: CreateSlideDTO = {
        slideUrl: this.formData.slideUrl,
        slideName: this.formData.slideName,
        isActive: this.formData.isActive
      };

      this.slideService.createSlide(this.formData).subscribe({
        next: () => {
          this.successMessage = 'Tạo slide thành công!';
          this.loadSlides();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: (error) => {
          this.errorMessage = 'Lỗi khi tạo slide: ' + error.message;
          this.isLoading = false;
        }
      });
    }
  }

  deleteSlide(slide: SlideDTO): void {
    if (!slide.slideId) return;

    if (confirm(`Bạn có chắc chắn muốn xóa slide "${slide.slideName}"?`)) {
      this.isLoading = true;
      this.errorMessage = '';

      this.slideService.deleteSlide(slide.slideId).subscribe({
        next: () => {
          this.successMessage = 'Xóa slide thành công!';
          this.loadSlides();
        },
        error: (error) => {
          this.errorMessage = 'Lỗi khi xóa slide: ' + error.message;
          this.isLoading = false;
        }
      });
    }
  }

  private validateForm(): boolean {
    if (!this.formData.slideName.trim()) {
      this.errorMessage = 'Tên slide không được để trống';
      return false;
    }
    if (!this.formData.slideUrl.trim()) {
      this.errorMessage = 'URL slide không được để trống';
      return false;
    }
    return true;
  }

  getStatusBadgeClass(isActive: boolean | undefined): string {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  }

  getStatusText(isActive: boolean | undefined): string {
    return isActive ? 'Hoạt động' : 'Không hoạt động';
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('vi-VN');
  }
}
