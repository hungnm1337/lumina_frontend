import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService, EventDTO, PaginatedResultDTO } from '../../../Services/Event/event.service';

@Component({
  selector: 'app-event-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-preview.component.html',
  styleUrl: './event-preview.component.scss'
})
export class EventPreviewComponent implements OnInit {
  isLoading = false;
  errorMessage: string | null = null;
  events: EventDTO[] = [];

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    this.fetchEvents();
  }

  fetchEvents(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.eventService.GetAllEventsPaginated(1, 10).subscribe({
      next: (result) => {
        const now = new Date();
        
        // Filter: chỉ lấy sự kiện đang diễn ra hoặc sắp diễn ra
        const activeAndUpcoming = result.items.filter(event => {
          const end = new Date(event.endDate);
          return end >= now; // Chưa kết thúc
        });
        
        // Sort: Ưu tiên đang diễn ra, sau đó sắp diễn ra
        this.events = activeAndUpcoming.sort((a, b) => {
          const aStart = new Date(a.startDate);
          const aEnd = new Date(a.endDate);
          const bStart = new Date(b.startDate);
          const bEnd = new Date(b.endDate);
          
          const aIsActive = aStart <= now && aEnd >= now;
          const bIsActive = bStart <= now && bEnd >= now;
          
          // Đang diễn ra lên trước
          if (aIsActive && !bIsActive) return -1;
          if (!aIsActive && bIsActive) return 1;
          
          // Cùng loại thì sort theo startDate gần nhất
          return aStart.getTime() - bStart.getTime();
        }).slice(0, 3); // Chỉ lấy 3 events
        
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
    return 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80';
  }
}
