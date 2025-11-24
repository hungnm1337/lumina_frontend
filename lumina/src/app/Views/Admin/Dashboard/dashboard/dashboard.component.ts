import { NgClass,NgIf,CommonModule  } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { StatisticService } from '../../../../Services/Statistic/statistic.service';
import { RouterLink } from '@angular/router'; 



@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgClass,NgIf,CommonModule,RouterLink],
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
    this.statisticService.getDashboardStatsBasic().subscribe({
      next: (data) => {
        this.stats = data;
      },
      error: (err) => {
        console.error('Error loading dashboard stats', err);
      }
    });
  }
}
