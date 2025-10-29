import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LeaderboardService, LeaderboardDTO, LeaderboardRankDTO } from '../../../Services/Leaderboard/leaderboard.service';

@Component({
  selector: 'app-leaderboard-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard-preview.component.html',
  styleUrls: ['./leaderboard-preview.component.css']
})
export class LeaderboardPreviewComponent implements OnInit {
  currentSeason: LeaderboardDTO | null = null;
  top3: LeaderboardRankDTO[] = [];
  loading = false;

  constructor(
    public leaderboardService: LeaderboardService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadTop3();
  }

  loadTop3(): void {
    this.loading = true;

    this.leaderboardService.getCurrentSeason().subscribe({
      next: (season) => {
        this.currentSeason = season;
        if (season) {
          this.leaderboardService.getRanking(season.leaderboardId, 3).subscribe({
            next: (ranking) => {
              this.top3 = ranking;
              this.loading = false;
            },
            error: () => {
              this.loading = false;
            }
          });
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  viewAll(): void {
    this.router.navigate(['/homepage/leaderboard']);
  }
}
