import { NgClass,NgIf,CommonModule  } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { StatisticService } from '../../../../Services/Statistic/statistic.service'; 



@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgClass,NgIf,CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats: any = null;

  constructor(private statisticService: StatisticService) {}

  ngOnInit() {
    this.loadStats();
  }

  loadStats(): void {
    this.statisticService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats = data;
      },
      error: (err) => {
        console.error('Error loading dashboard stats', err);
      }
    });
  }
}
