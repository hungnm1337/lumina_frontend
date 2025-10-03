import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { UserEventsDashboardComponent } from './dashboardevent.component';

describe('UserEventsDashboardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, UserEventsDashboardComponent],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(UserEventsDashboardComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
  });
});



