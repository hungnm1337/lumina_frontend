import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouterModule } from '@angular/router';
import { FloatingChatComponent } from './Views/Common/floating-chat/floating-chat.component';
import { GoogleAnalyticsService } from './Services/Analytics/google-analytics.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, FloatingChatComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Lumina TOEIC';

  constructor(
    private googleAnalyticsService: GoogleAnalyticsService
  ) {}

  ngOnInit(): void {
    this.googleAnalyticsService.initializePageTracking();
    console.log('✅ Google Analytics initialized');
  }
}
