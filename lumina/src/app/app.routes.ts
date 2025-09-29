import { Routes } from '@angular/router';

export const routes: Routes = [
    // ... các route khác của bạn
    {
        path: 'admin',
        loadChildren: () => import('./Views/Admin/admin.module').then(m => m.AdminModule)
    },
    // ... các route khác nếu có
];
