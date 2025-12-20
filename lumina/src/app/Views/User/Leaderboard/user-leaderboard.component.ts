import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeaderboardService, LeaderboardDTO, LeaderboardRankDTO } from '../../../Services/Leaderboard/leaderboard.service';

@Component({
  selector: 'app-user-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-leaderboard.component.html',
  styleUrls: ['./user-leaderboard.component.css']
})
export class UserLeaderboardComponent implements OnInit {
  currentSeason: LeaderboardDTO | null = null;
  ranking: LeaderboardRankDTO[] = [];
  loading = false;
  error = '';

  constructor(public leaderboardService: LeaderboardService) { }

  ngOnInit(): void {
    this.loadCurrentSeasonAndRanking();
  }

  loadCurrentSeasonAndRanking(): void {
    this.loading = true;
    this.error = '';

    this.leaderboardService.getCurrentSeason().subscribe({
      next: (season) => {
        this.currentSeason = season;
        if (season) {
          this.loadRanking(season.leaderboardId);
        } else {
          this.loading = false;
        }
      },
      error: (err) => {
        this.error = 'Không có mùa giải nào đang diễn ra';
        console.error(err);
        this.loading = false;
      }
    });
  }

  loadRanking(leaderboardId: number): void {
    this.leaderboardService.getRanking(leaderboardId, 100).subscribe({
      next: (ranking) => {
        this.ranking = ranking;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Không thể tải bảng xếp hạng';
        console.error(err);
        this.loading = false;
      }
    });
  }

  getAvatarUrl(rank: LeaderboardRankDTO): string {
    if (rank.avatarUrl) {
      return rank.avatarUrl;
    }
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Ccircle cx="100" cy="100" r="100" fill="%23ddd"/%3E%3Cpath d="M100 100c13.8 0 25-11.2 25-25s-11.2-25-25-25-25 11.2-25 25 11.2 25 25 25zm0 12.5c-16.7 0-50 8.4-50 25v12.5h100v-12.5c0-16.6-33.3-25-50-25z" fill="%23fff"/%3E%3C/svg%3E';
  }
}
