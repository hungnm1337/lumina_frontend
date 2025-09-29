import { Routes } from '@angular/router';
import { ErrorComponent } from './Views/Common/error/error.component';
import { HomepageComponent } from './Views/Common/homepage/homepage.component';
import { UserDashboardComponent } from './Views/User/Dashboard/dashboard/dashboard.component';
import { MenuComponent } from './Views/Manage/Menu/menu/menu.component';
import { ContentHomepageComponent } from './Views/Common/content-homepage/content-homepage.component';
import { ExamsComponent } from './Views/User/exams/exams.component';
import { ExamPartComponent } from './Views/User/exam-part/exam-part.component';
import { PartQuestionComponent } from './Views/User/part-question/part-question.component';

export const routes: Routes = [
  {path: 'homepage', component: HomepageComponent,
    children: [
      {path: '', component: ContentHomepageComponent},
      {path: 'user-dashboard', component: UserDashboardComponent,
        children: [
          {path: 'exams', component: ExamsComponent},
          {path: 'exam/:id', component: ExamPartComponent},
          {path: 'part/:id', component: PartQuestionComponent},
          {path: '', redirectTo: 'exams', pathMatch: 'full'}
          // {path: 'vocabulary', component: VocabularyComponent},
          // {path: 'notes', component: NotesComponent},
          // {path: 'study', component: StudyComponent},
          // {path: 'notifications', component: NotificationsComponent}
        ]
      }
    ]
  },




  {path: '', redirectTo: '/homepage', pathMatch: 'full'},
  {path: '**', component: ErrorComponent},
];
