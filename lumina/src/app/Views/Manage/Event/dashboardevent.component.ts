import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService, EventDTO } from '../../../Services/Event/event.service';

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

  // search and filter
  searchTerm: string = '';
  filterStatus: string = 'all';
  sortBy: string = 'startDate';
  sortOrder: string = 'asc';

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
    this.eventService.GetAllEvents().subscribe({
      next: (events) => {
        this.events = events;
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
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterStatus = 'all';
    this.sortBy = 'startDate';
    this.sortOrder = 'asc';
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
  }

  // ===== CRUD OPERATIONS =====
  submit(): void {
    this.errorMessage = null;

    // Validation
    if (!this.form.eventName?.trim()) {
      this.errorMessage = 'Tên sự kiện là bắt buộc';
      return;
    }

    if (!this.form.startDate) {
      this.errorMessage = 'Ngày bắt đầu là bắt buộc';
      return;
    }

    if (!this.form.endDate) {
      this.errorMessage = 'Ngày kết thúc là bắt buộc';
      return;
    }

    const startDate = new Date(this.form.startDate);
    const endDate = new Date(this.form.endDate);
    if (endDate <= startDate) {
      this.errorMessage = 'Ngày kết thúc phải sau ngày bắt đầu';
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
          this.errorMessage = error.error?.message || 'Tạo sự kiện thất bại';
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
