import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StreakService } from '../../../../Services/streak/streak.service';
import { HeaderComponent } from '../../header/header.component';

interface User {
  id: number;
  name: string;
  avatar: string;
  streak?: number; // Cho phép undefined vì list Points ko có streak
  points?: number; // Cho phép undefined vì list Streak ko có points
  isPro: boolean;
}

@Component({
  selector: 'app-rankings',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './rankings.component.html',
  styleUrl: './rankings.component.scss'
})
export class RankingsComponent implements OnInit {
  // Dữ liệu từ API (Streak)
  streakUsers = signal<User[]>([]);
  
  // Dữ liệu Hardcode (Points)
  pointsUsers = signal<User[]>([
    { id: 101, name: "Lê Văn Luyện", avatar: "https://i.pravatar.cc/150?u=10", points: 9850, isPro: true },
    { id: 102, name: "Trần Dần", avatar: "https://i.pravatar.cc/150?u=20", points: 8720, isPro: false },
    { id: 103, name: "Ngô Bá Khá", avatar: "https://i.pravatar.cc/150?u=30", points: 7690, isPro: true },
    { id: 104, name: "Huấn Rose", avatar: "https://i.pravatar.cc/150?u=40", points: 6400, isPro: false },
    { id: 105, name: "User 05", avatar: "https://i.pravatar.cc/150?u=50", points: 5100, isPro: false },
    { id: 106, name: "User 06", avatar: "https://i.pravatar.cc/150?u=60", points: 4950, isPro: true },
    { id: 107, name: "User 07", avatar: "https://i.pravatar.cc/150?u=70", points: 3200, isPro: false },
  ]);

  loading = signal<boolean>(true);
  activeTab = signal<'streak' | 'points'>('streak'); // Mặc định là streak hoặc points tuỳ bạn

  constructor(private streakService: StreakService) {}

  ngOnInit() {
    // Giữ nguyên logic gọi API của bạn
    this.streakService.getTopStreakUsers().subscribe({
      next: res => {
        if (Array.isArray(res)) {
          const mapped = res.map((u: any) => ({
            id: u.userId,
            name: u.fullName,
            avatar: u.avatarUrl,
            streak: u.currentStreak ?? 0,
            isPro: !!u.isPro
          }));
          this.streakUsers.set(mapped);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // Computed value tự động thay đổi dựa trên activeTab
  sortedUsers = computed(() => {
    if (this.activeTab() === 'streak') {
      return [...this.streakUsers()].sort((a, b) => (b.streak || 0) - (a.streak || 0));
    } else {
      return [...this.pointsUsers()].sort((a, b) => (b.points || 0) - (a.points || 0));
    }
  });

  top3 = computed(() => this.sortedUsers().slice(0, 3));
  restOfList = computed(() => this.sortedUsers().slice(3));

  setTab(tab: 'streak' | 'points') {
    this.activeTab.set(tab);
  }
}