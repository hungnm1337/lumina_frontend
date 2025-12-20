import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService, EventDTO, PaginatedResultDTO } from '../../../Services/Event/event.service';

@Component({
  selector: 'app-manage-events-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboardevent.component.html',
  styleUrls: ['./dashboardevent.component.scss']
})
export class ManageEventsDashboardComponent implements OnInit {
  isLoading = false;
  errorMessage: string | null = null;
  events: EventDTO[] = [];
  filteredEvents: EventDTO[] = [];
  pagedEvents: EventDTO[] = []; // Events cho trang hiện tại

  // search and filter
  searchTerm: string = '';
  filterStatus: string = 'all';
  sortBy: string = 'startDate';
  sortOrder: string = 'asc';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 5; // Mỗi trang 5 sự kiện
  totalPages: number = 1;

  // modal state
  showModal = false;
  isEditing = false;
  editingId: number | null = null;
  selectedEvent: EventDTO | null = null;

  // form state
  form: { eventName: string; content?: string; startDate?: string; endDate?: string } = {
    eventName: '',
    content: '',
    startDate: '',
    endDate: ''
  };

  // Validation errors
  validationErrors: {
    eventName?: string;
    content?: string;
    startDate?: string;
    endDate?: string;
  } = {};

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    this.fetchEvents();
  }

  // ===== GETTER METHODS =====
  get activeEventsCount(): number {
    return this.events.filter(e => this.getEventStatus(e) === 'active').length;
  }

  get upcomingEventsCount(): number {
    return this.events.filter(e => this.getEventStatus(e) === 'upcoming').length;
  }

  get pastEventsCount(): number {
    return this.events.filter(e => this.getEventStatus(e) === 'past').length;
  }

  // ===== DATA FETCHING =====
  private fetchEvents(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.eventService.GetAllEventsPaginated(1, 1000).subscribe({
      next: (result) => {
        this.events = result.items;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Không thể tải danh sách sự kiện.';
        this.isLoading = false;
      },
    });
  }

  // ===== SEARCH AND FILTER =====
  onSearchChange(): void {
    this.currentPage = 1; // Reset về trang 1 khi search
    this.applyFilters();
  }

  onFilterChange(): void {
    this.currentPage = 1; // Reset về trang 1 khi filter
    this.applyFilters();
  }

  onSortChange(): void {
    this.currentPage = 1; // Reset về trang 1 khi sort
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterStatus = 'all';
    this.sortBy = 'startDate';
    this.sortOrder = 'asc';
    this.currentPage = 1; // Reset về trang 1 khi clear
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.events];

    // Search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.eventName.toLowerCase().includes(term) ||
        (event.content && event.content.toLowerCase().includes(term))
      );
    }

    // Status filter
    const now = new Date();
    if (this.filterStatus === 'active') {
      filtered = filtered.filter(event => {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);
        return start <= now && end >= now;
      });
    } else if (this.filterStatus === 'upcoming') {
      filtered = filtered.filter(event => new Date(event.startDate) > now);
    } else if (this.filterStatus === 'past') {
      filtered = filtered.filter(event => new Date(event.endDate) < now);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      switch (this.sortBy) {
        case 'eventName':
          aValue = a.eventName.toLowerCase();
          bValue = b.eventName.toLowerCase();
          break;
        case 'startDate':
          aValue = new Date(a.startDate);
          bValue = new Date(b.startDate);
          break;
        case 'endDate':
          aValue = new Date(a.endDate);
          bValue = new Date(b.endDate);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredEvents = filtered;
    
    // Tính toán pagination sau khi filter
    this.updatePagination();
  }

  // ===== PAGINATION =====
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredEvents.length / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.pagedEvents = this.filteredEvents.slice(startIndex, endIndex);
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
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredEvents.length);
  }

  // ===== MODAL METHODS =====
  openCreateModal(): void {
    this.isEditing = true;
    this.editingId = null;
    this.selectedEvent = null;
    this.form = { eventName: '', content: '', startDate: '', endDate: '' };
    this.showModal = true;
    this.errorMessage = null;
  }

  openEditModal(event: EventDTO): void {
    this.isEditing = true;
    this.editingId = event.eventId;
    this.selectedEvent = event;
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    this.form = {
      eventName: event.eventName,
      content: event.content || '',
      startDate: this.formatDateForInput(startDate),
      endDate: this.formatDateForInput(endDate),
    };
    this.showModal = true;
    this.errorMessage = null;
  }

  openDetailModal(event: EventDTO): void {
    this.selectedEvent = event;
    this.isEditing = false;
    this.editingId = null;
    this.showModal = true;
    this.errorMessage = null;
  }

  closeModal(): void {
    this.showModal = false;
    this.isEditing = false;
    this.editingId = null;
    this.selectedEvent = null;
    this.form = { eventName: '', content: '', startDate: '', endDate: '' };
    this.errorMessage = null;
    this.validationErrors = {};
  }

  // ===== VALIDATION METHODS =====
  validateEventName(): boolean {
    const eventName = this.form.eventName?.trim();
    if (!eventName) {
      this.validationErrors.eventName = 'Tên sự kiện là bắt buộc';
      return false;
    }
    if (eventName.length < 5) {
      this.validationErrors.eventName = 'Tên sự kiện phải có ít nhất 5 ký tự';
      return false;
    }
    if (eventName.length > 200) {
      this.validationErrors.eventName = 'Tên sự kiện không được vượt quá 200 ký tự';
      return false;
    }
    this.validationErrors.eventName = undefined;
    return true;
  }

  validateContent(): boolean {
    const content = this.form.content?.trim();
    if (content && content.length > 0 && content.length < 10) {
      this.validationErrors.content = 'Mô tả phải có ít nhất 10 ký tự';
      return false;
    }
    if (content && content.length > 2000) {
      this.validationErrors.content = 'Mô tả không được vượt quá 2000 ký tự';
      return false;
    }
    this.validationErrors.content = undefined;
    return true;
  }

  validateDates(): boolean {
    let isValid = true;

    // Kiểm tra ngày bắt đầu
    if (!this.form.startDate) {
      this.validationErrors.startDate = 'Ngày bắt đầu là bắt buộc';
      isValid = false;
    } else {
      this.validationErrors.startDate = undefined;
    }

    // Kiểm tra ngày kết thúc
    if (!this.form.endDate) {
      this.validationErrors.endDate = 'Ngày kết thúc là bắt buộc';
      isValid = false;
    } else {
      this.validationErrors.endDate = undefined;
    }

    // Kiểm tra ngày kết thúc phải sau ngày bắt đầu
    if (this.form.startDate && this.form.endDate) {
      const startDate = new Date(this.form.startDate);
      const endDate = new Date(this.form.endDate);
      
      if (endDate <= startDate) {
        this.validationErrors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
        isValid = false;
      }

      // Kiểm tra khoảng cách thời gian hợp lý (ít nhất 1 giờ)
      const diffHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      if (diffHours < 1) {
        this.validationErrors.endDate = 'Sự kiện phải diễn ra ít nhất 1 giờ';
        isValid = false;
      }

      // Kiểm tra thời gian không quá dài (không quá 1 năm)
      const diffDays = diffHours / 24;
      if (diffDays > 365) {
        this.validationErrors.endDate = 'Sự kiện không thể kéo dài quá 1 năm';
        isValid = false;
      }
    }

    return isValid;
  }

  onEventNameInput(): void {
    // Xóa lỗi khi người dùng bắt đầu nhập
    if (this.validationErrors.eventName) {
      this.validationErrors.eventName = undefined;
    }
    // Xóa lỗi chung
    if (this.errorMessage) {
      this.errorMessage = null;
    }
  }

  onContentInput(): void {
    if (this.validationErrors.content) {
      this.validationErrors.content = undefined;
    }
    if (this.errorMessage) {
      this.errorMessage = null;
    }
  }

  validateAllFields(): boolean {
    const isEventNameValid = this.validateEventName();
    const isContentValid = this.validateContent();
    const areDatesValid = this.validateDates();

    return isEventNameValid && isContentValid && areDatesValid;
  }

  // ===== CRUD OPERATIONS =====
  submit(): void {
    this.errorMessage = null;

    // Chạy validation toàn bộ
    if (!this.validateAllFields()) {
      this.errorMessage = 'Vui lòng kiểm tra lại các trường nhập liệu';
      // Tự động ẩn thông báo lỗi sau 3 giây
      setTimeout(() => {
        this.errorMessage = null;
      }, 3000);
      return;
    }

    this.isLoading = true;

    if (this.editingId == null) {
      // Create
      const createPayload = {
        eventName: this.form.eventName.trim(),
        content: this.form.content?.trim() || undefined,
        startDate: this.form.startDate,
        endDate: this.form.endDate,
      } as unknown as EventDTO;

      this.eventService.CreateEvent(createPayload).subscribe({
        next: () => {
          this.isLoading = false;
          this.closeModal();
          this.fetchEvents();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Create event error:', error);
          this.errorMessage = error.error?.message || error.message || 'Tạo sự kiện thất bại';
        },
      });
    } else {
      // Update
      const updatePayload = {
        eventName: this.form.eventName.trim(),
        content: this.form.content?.trim() || undefined,
        startDate: this.form.startDate,
        endDate: this.form.endDate,
      } as unknown as EventDTO;

      this.eventService.UpdateEvent(this.editingId, updatePayload).subscribe({
        next: () => {
          this.isLoading = false;
          this.closeModal();
          this.fetchEvents();
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = `Cập nhật sự kiện thất bại: ${error.error?.message || error.message}`;
        },
      });
    }
  }

  delete(event: EventDTO): void {
    if (!confirm(`Xóa sự kiện "${event.eventName}"?`)) return;

    this.isLoading = true;
    this.eventService.DeleteEvent(event.eventId).subscribe({
      next: () => {
        this.isLoading = false;
        this.fetchEvents();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Xóa sự kiện thất bại';
      },
    });
  }

  // ===== HELPER METHODS =====
  getEventStatus(event: EventDTO): string {
    const now = new Date();
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    if (start > now) return 'upcoming';
    if (end < now) return 'past';
    return 'active';
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'Đang diễn ra';
      case 'upcoming': return 'Sắp diễn ra';
      case 'past': return 'Đã kết thúc';
      default: return 'Không rõ';
    }
  }

  getEventDuration(event: EventDTO): string {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    const diff = end.getTime() - start.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Trong ngày';
    if (days === 1) return '1 ngày';
    return `${days} ngày`;
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
