import { Component } from '@angular/core';
import { FooterComponent } from "../footer/footer.component";
import { EventPreviewComponent } from '../../User/event-preview/event-preview.component';
import { Router } from '@angular/router';
import { UserSlideDashboardComponent } from '../../User/slide-dashboard/dashboardslide.component';
import { LeaderboardPreviewComponent } from '../../User/leaderboard-preview/leaderboard-preview.component';

@Component({
  selector: 'app-content-homepage',
  standalone: true,
  imports: [FooterComponent, EventPreviewComponent, UserSlideDashboardComponent, LeaderboardPreviewComponent],
  templateUrl: './content-homepage.component.html',
  styleUrl: './content-homepage.component.scss'
})
export class ContentHomepageComponent {

  constructor(private router: Router) {}
}
