import { Routes } from '@angular/router';
import { ErrorComponent } from './Views/Common/error/error.component';
import { HomepageComponent } from './Views/Common/homepage/homepage.component';
import { UserDashboardComponent } from './Views/User/Dashboard/dashboard/dashboard.component';
import { ExamsComponent } from './Views/User/exams/exams.component';
import { ExamPartComponent } from './Views/User/exam-part/exam-part.component';
import { PartQuestionComponent } from './Views/User/part-question/part-question.component';
import { DashboardComponent } from './Views/Admin/Dashboard/dashboard/dashboard.component';
import { ContentHomepageComponent } from './Views/Common/content-homepage/content-homepage.component';
import { LoginComponent } from './Views/Auth/login/login.component';
import { RegisterComponent } from './Views/Auth/register/register.component';
import { ForgotPasswordComponent } from './Views/Auth/forgot-password/forgot-password.component';
import { AuthGuard } from './Services/Auth/auth.guard';
import { RoleGuard } from './Services/Auth/role.guard';
import { ManageEventsDashboardComponent } from './Views/Manage/Event/dashboardevent.component';
import { UserEventsDashboardComponent } from './Views/User/event-dashboard/dashboardevent.component';
import { DashboardSlideComponent } from './Views/Manage/Slide/dashboardslide.component';
import { BlogComponent } from './Views/Common/blog/blog.component';
import { BlogDetailComponent } from './Views/Common/blog-detail/blog-detail.component';
import { UserVocabularyComponent } from './Views/User/vocabulary/vocabulary.component';
import { DeckListComponent } from './pages/deck-list/deck-list.component';
import { DeckDetailComponent } from './pages/deck-detail/deck-detail.component';
import { ExamAttemptListComponent } from './Views/User/ExamAttempt/exam-attempt-list/exam-attempt-list.component';
import { ExamAttemptDetailComponent } from './Views/User/ExamAttempt/exam-attempt-detail/exam-attempt-detail.component';
import { UserLeaderboardComponent } from './Views/User/Leaderboard/user-leaderboard.component';

export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () =>
      import('./Views/Admin/admin.module').then((m) => m.AdminModule),
    canActivate: [RoleGuard],
    data: { roles: [1] },
  },
  {
    path: 'staff',
    loadChildren: () =>
      import('./Views/Staff/staff.module').then((m) => m.StaffModule),
    canActivate: [RoleGuard],
    data: { roles: [3] },
  },
  {
    path: 'manager',
    loadChildren: () =>
      import('./Views/Manage/manager.module').then((m) => m.ManagerModule),
    canActivate: [RoleGuard],
    data: { roles: [2] },
  },
  {
    path: 'homepage',
    component: HomepageComponent,
    children: [
      { path: '', component: ContentHomepageComponent },
      { path: 'events', component: UserEventsDashboardComponent },
      { path: 'slides', component: DashboardSlideComponent },
      { path: 'leaderboard', component: UserLeaderboardComponent },
      {
        path: 'user-dashboard',
        component: UserDashboardComponent,
        children: [
          { path: 'exams', component: ExamsComponent },
          { path: 'exam-attempts', component: ExamAttemptListComponent },
          { path: 'exam-attempts/:id', component: ExamAttemptDetailComponent },
          { path: 'exam/:id', component: ExamPartComponent },
          { path: 'part/:id', component: PartQuestionComponent },
          { path: '', redirectTo: 'exams', pathMatch: 'full' },
        ],
      },
    ],
  },

  {
    path: 'profile',
    loadComponent: () =>
      import('./Views/User/profile/profile.component').then(
        (m) => m.ProfileComponent
      ),
    canActivate: [AuthGuard], // Bảo vệ route profile
  },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'blog', component: BlogComponent },
  { path: 'blog/:id', component: BlogDetailComponent },
  { path: 'tu-vung', component: UserVocabularyComponent },

  // <-- DI CHUYỂN 2 ROUTE FLASHCARDS RA ĐÂY, ĐẶT Ở CẤP CAO NHẤT
  { path: 'flashcards', component: DeckListComponent },
  { path: 'flashcards/:id', component: DeckDetailComponent },

  { path: '', redirectTo: '/homepage', pathMatch: 'full' },
  { path: '**', component: ErrorComponent },
];
