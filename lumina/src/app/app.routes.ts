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
import { BlogArticlesComponent } from './Views/Common/Articles/Articles.component';
import { BlogDetailComponent } from './Views/Common/Articles-detail/Articles-detail.component';
import { UserVocabularyComponent } from './Views/User/vocabulary/vocabulary.component';
import { DeckListComponent } from './pages/deck-list/deck-list.component';
import { DeckDetailComponent } from './pages/deck-detail/deck-detail.component';
import { SpacedRepetitionDashboardComponent } from './pages/spaced-repetition-dashboard/spaced-repetition-dashboard.component';
import { ExamAttemptListComponent } from './Views/User/ExamAttempt/exam-attempt-list/exam-attempt-list.component';
import { ExamAttemptDetailComponent } from './Views/User/ExamAttempt/exam-attempt-detail/exam-attempt-detail.component';
import { UserLeaderboardComponent } from './Views/User/Leaderboard/user-leaderboard.component';
import { UserNoteListComponent } from './Views/User/UserNote/user-note-list/user-note-list.component';
import { UserNoteDetailComponent } from './Views/User/UserNote/user-note-detail/user-note-detail.component';

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
          { path: 'notes', component: UserNoteListComponent },
          { path: 'note/:id', component: UserNoteDetailComponent },
          { path: 'articles', component: BlogArticlesComponent },
          { path: 'article/:id', component: BlogDetailComponent },
          { path: 'vocabulary', component: UserVocabularyComponent },
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

  {
    path: 'tu-vung/list/:id',
    loadComponent: () =>
      import('./Views/User/vocabulary-list-detail/vocabulary-list-detail.component').then(
        (m) => m.VocabularyListDetailComponent
      )
  },

  // Quiz routes
  {
    path: 'quiz/config',
    loadComponent: () =>
      import('./Views/User/quiz-config/quiz-config.component').then(
        (m) => m.QuizConfigComponent
      )
  },
  {
    path: 'quiz/config-detail',
    loadComponent: () =>
      import('./Views/User/quiz-config-detail/quiz-config-detail.component').then(
        (m) => m.QuizConfigDetailComponent
      )
  },
  {
    path: 'quiz/do',
    loadComponent: () =>
      import('./Views/User/quiz-do/quiz-do.component').then(
        (m) => m.QuizDoComponent
      )
  },
  {
    path: 'quiz/results',
    loadComponent: () =>
      import('./Views/User/quiz-results/quiz-results.component').then(
        (m) => m.QuizResultsComponent
      )
  },

  // <-- DI CHUYỂN 2 ROUTE FLASHCARDS RA ĐÂY, ĐẶT Ở CẤP CAO NHẤT
  { path: 'flashcards', component: DeckListComponent },
  { path: 'flashcards/:id', component: DeckDetailComponent },

  // Spaced Repetition Dashboard
  { path: 'spaced-repetition/dashboard', component: SpacedRepetitionDashboardComponent },

  { path: '', redirectTo: '/homepage', pathMatch: 'full' },
  { path: '**', component: ErrorComponent },
];
