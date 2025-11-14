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
}
