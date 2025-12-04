import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private sidebarVisible = new BehaviorSubject<boolean>(true);

  sidebarVisible$: Observable<boolean> = this.sidebarVisible.asObservable();

  hideSidebar(): void {
    this.sidebarVisible.next(false);
  }

  showSidebar(): void {
    this.sidebarVisible.next(true);
  }

  toggleSidebar(): void {
    this.sidebarVisible.next(!this.sidebarVisible.value);
  }
}
