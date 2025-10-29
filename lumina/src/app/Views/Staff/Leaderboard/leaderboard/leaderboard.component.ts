import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaderboardService, LeaderboardDTO, LeaderboardRankDTO } from '../../../../Services/Leaderboard/leaderboard.service';

@Component({
  selector: 'app-staff-leaderboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.scss']
})
export class StaffLeaderboardComponent implements OnInit {
  seasons: LeaderboardDTO[] = [];
  selectedSeasonId: number | null = null;
  ranking: LeaderboardRankDTO[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private service: LeaderboardService) {}

  ngOnInit() {
    this.loadSeasons();
  }

  loadSeasons() {
    this.service.getAll().subscribe({
      next: (res) => {
        this.seasons = res;
        const current = res.find(s => s.isActive);
        if (current) {
          this.selectedSeasonId = current.leaderboardId;
          this.loadRanking();
        }
      },
      error: (err) => this.error = err?.error?.message || 'Không thể tải mùa'
    });
  }

  loadRanking() {
    if (!this.selectedSeasonId) return;
    this.isLoading = true;
    this.service.getRanking(this.selectedSeasonId, 100).subscribe({
      next: (res) => { this.ranking = res; this.isLoading = false; },
      error: (err) => { this.error = err?.error?.message || 'Không thể tải BXH'; this.isLoading = false; }
    });
  }

  recalc() {
    if (!this.selectedSeasonId) return;
    this.isLoading = true;
    this.service.recalculate(this.selectedSeasonId).subscribe({
      next: () => { this.loadRanking(); },
      error: (err) => { this.error = err?.error?.message || 'Không thể tính lại điểm'; this.isLoading = false; }
    });
  }
}
