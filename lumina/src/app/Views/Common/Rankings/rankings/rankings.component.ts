import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StreakService } from '../../../../Services/streak/streak.service';
import { HeaderComponent } from '../../header/header.component';

interface User {
  id: number;
  name: string;
  avatar: string;
  streak: number;
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
  users = signal<User[]>([]);
  loading = signal<boolean>(true);

  constructor(private streakService: StreakService) {}

  ngOnInit() {
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
          this.users.set(mapped);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  sortedUsers = computed(() => [...this.users()].sort((a, b) => b.streak - a.streak));
  
  top3 = computed(() => this.sortedUsers().slice(0, 3));
  restOfList = computed(() => this.sortedUsers().slice(3));
}