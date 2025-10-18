import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService, EventDTO, PaginatedResultDTO } from '../../../Services/Event/event.service';

@Component({
  selector: 'app-user-events-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboardevent.component.html',
  styleUrl: './dashboardevent.component.scss'
})
export class UserEventsDashboardComponent implements OnInit {
  isLoading = false;
  errorMessage: string | null = null;
  events: EventDTO[] = [];

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    this.fetchEvents();
  }

  // SỬA: Đổi từ private thành public để template có thể gọi
  fetchEvents(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.eventService.GetAllEventsPaginated(1, 1000).subscribe({
      next: (result) => {
        // Show all events and sort by start date (newest first)
        this.events = result.items
          .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Không thể tải danh sách sự kiện.';
        this.isLoading = false;
      },
    });
  }

  // Check if event is currently active
  isEventActive(event: EventDTO): boolean {
    const now = new Date();
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    return start <= now && end >= now;
  }

  // Check if event is upcoming
  isEventUpcoming(event: EventDTO): boolean {
    const now = new Date();
    const start = new Date(event.startDate);
    return start > now;
  }

  // Get event status text
  getEventStatus(event: EventDTO): string {
    if (this.isEventActive(event)) {
      return 'Đang diễn ra';
    } else if (this.isEventUpcoming(event)) {
      return 'Sắp diễn ra';
    } else {
      return 'Đã kết thúc';
    }
  }

  // Calculate event duration
  getDuration(event: EventDTO): string {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 ngày';
    if (diffDays < 7) return `${diffDays} ngày`;
    
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} tuần`;
  }

  // Get event image (placeholder if not available)
  getEventImage(event: EventDTO): string {
    // SỬA: EventDTO không có imageUrl, dùng placeholder
    return 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80';
  }
}
