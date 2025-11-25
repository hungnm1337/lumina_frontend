import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StaffLayoutComponent } from './layout/staff-layout/staff-layout.component';
import { DashboardComponent } from './Dashboard/dashboard/dashboard.component';
import { ArticlesComponent } from './Articles/articles/articles.component';
import { VocabularyComponent } from './Vocabulary/vocabulary/vocabulary.component';
import { QuestionsComponent } from './Questions/questions/questions.component';
import { ExamsComponent } from './exams/exams.component';
import { AiChatComponent } from './AI-Chat/ai-chat.component';
import { SeasonManagementComponent } from './Season/season-management.component';
import { LeaderboardRankingComponent } from './Leaderboard/leaderboard-ranking.component';
import { ReportListComponent } from '../Common/report-list/report-list.component';

const routes: Routes = [
  {
    // The main layout for all staff-related pages
    path: '',
    component: StaffLayoutComponent,
    children: [
      // Default route redirects to the dashboard
      { path: '', redirectTo: 'questions', pathMatch: 'full' },

      // Define child routes for each feature
      {
        path: 'dashboard',
        component: DashboardComponent,
        data: { title: 'Bảng điều khiển' }
      },
      {
        path: 'exams',
        component: ExamsComponent,
        data: { title: 'Bài Thi' }
      },
      {
        path: 'questions',
        component: QuestionsComponent,
        data: { title: 'Câu Hỏi' }
      },
      {
        path: 'ai-chat',
        component: AiChatComponent
      },

      {
        path: 'articles',
        component: ArticlesComponent,
        data: { title: 'Bài viết kiến thức' }
      },
      {
        path: 'vocabulary',
        component: VocabularyComponent,
        data: { title: 'Từ Vựng' }
      },
      {
        path: 'seasons',
        component: SeasonManagementComponent,
        data: { title: 'Quản lý Mùa giải' }
      },
      {
        path: 'leaderboard',
        component: LeaderboardRankingComponent,
        data: { title: 'Bảng Xếp Hạng' }
      },
      {
        path: 'reports',
        component: ReportListComponent,
        data: { title: 'Báo cáo' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StaffRoutingModule { }
