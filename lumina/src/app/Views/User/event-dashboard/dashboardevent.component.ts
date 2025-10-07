import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService, EventDTO } from '../../../Services/Event/event.service';

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

  private fetchEvents(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.eventService.GetAllEvents().subscribe({
      next: (events) => {
        this.events = events;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Không thể tải danh sách sự kiện.';
        this.isLoading = false;
      },
    });
  }
}



