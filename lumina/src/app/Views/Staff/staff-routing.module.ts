import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StaffLayoutComponent } from './layout/staff-layout/staff-layout.component'; 
import { DashboardComponent } from './Dashboard/dashboard/dashboard.component'; 
import { ArticlesComponent } from './Articles/articles/articles.component';
import { VocabularyComponent } from './Vocabulary/vocabulary/vocabulary.component';
import { QuestionsComponent } from './Questions/questions/questions.component'; 
import { SeasonsComponent } from './Leaderboard/seasons/seasons.component';
import { StaffLeaderboardComponent } from './Leaderboard/leaderboard/leaderboard.component';



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
        path: 'questions',
        component: QuestionsComponent, 
        data: { title: 'Câu Hỏi' } 
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
        path: 'leaderboard',
        component: StaffLeaderboardComponent,
        data: { title: 'Bảng xếp hạng' }
      },
      {
        path: 'seasons',
        component: SeasonsComponent,
        data: { title: 'Mùa thi đấu' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StaffRoutingModule { }