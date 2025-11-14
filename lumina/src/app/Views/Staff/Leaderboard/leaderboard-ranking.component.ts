import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaderboardService, LeaderboardDTO, LeaderboardRankDTO } from '../../../Services/Leaderboard/leaderboard.service';

@Component({
  selector: 'app-leaderboard-ranking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leaderboard-ranking.component.html',
  styleUrls: ['./leaderboard-ranking.component.css']
})
export class LeaderboardRankingComponent implements OnInit {
  // Data
  seasons: LeaderboardDTO[] = [];
  currentSeason: LeaderboardDTO | null = null;
  selectedSeason: LeaderboardDTO | null = null;
  ranking: LeaderboardRankDTO[] = [];

  // Loading & Error
  loading = false;
  error = '';
  success = '';

  constructor(public leaderboardService: LeaderboardService) { }

  ngOnInit(): void {
    this.loadSeasons();
    this.loadCurrentSeason();
  }

  loadSeasons(): void {
    this.loading = true;
    this.error = '';

    this.leaderboardService.getAllSimple().subscribe({
      next: (seasons) => {
        this.seasons = seasons;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Không thể tải danh sách mùa giải';
        console.error(err);
        this.loading = false;
      }
    });
  }

  loadCurrentSeason(): void {
    this.leaderboardService.getCurrentSeason().subscribe({
      next: (season) => {
        this.currentSeason = season;
        if (season) {
          this.selectedSeason = season;
          this.loadRanking(season.leaderboardId);
        }
      },
      error: (err) => {
        console.log('Không có mùa giải hiện tại', err);
      }
    });
  }

  loadRanking(leaderboardId: number): void {
    this.loading = true;
    this.error = '';

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

  onSeasonChange(event: any): void {
    const leaderboardId = parseInt(event.target.value);
    const season = this.seasons.find(s => s.leaderboardId === leaderboardId);
    if (season) {
      this.selectedSeason = season;
      this.loadRanking(leaderboardId);
    }
  }

  refreshRanking(): void {
    if (this.selectedSeason) {
      this.loadRanking(this.selectedSeason.leaderboardId);
    }
  }

  exportRanking(): void {
    if (!this.ranking || this.ranking.length === 0) {
      alert('Không có dữ liệu để xuất');
      return;
    }

    // Create CSV content
    const headers = ['Hạng', 'Tên', 'Điểm'];
    const rows = this.ranking.map(r => [
      r.rank,
      r.fullName,
      r.score
    ]);

    let csvContent = headers.join(',') + '\n';
    csvContent += rows.map(row => row.join(',')).join('\n');

    // Download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leaderboard_${this.selectedSeason?.seasonName || 'ranking'}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
