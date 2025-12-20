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

  getAvatarUrl(rank: LeaderboardRankDTO): string {
    if (rank.avatarUrl) {
      return rank.avatarUrl;
    }
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Ccircle cx="100" cy="100" r="100" fill="%23ddd"/%3E%3Cpath d="M100 100c13.8 0 25-11.2 25-25s-11.2-25-25-25-25 11.2-25 25 11.2 25 25 25zm0 12.5c-16.7 0-50 8.4-50 25v12.5h100v-12.5c0-16.6-33.3-25-50-25z" fill="%23fff"/%3E%3C/svg%3E';
  }
}
