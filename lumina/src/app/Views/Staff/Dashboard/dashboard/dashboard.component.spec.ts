import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load staff stats correctly', () => {
    expect(component.staffStats).toBeDefined();
    expect(component.staffStats.totalArticles).toBeGreaterThan(0);
    expect(component.staffStats.totalQuestions).toBeGreaterThan(0);
  });

 

  it('should navigate when quick action is clicked', () => {
    const route = '/staff/articles';
    component.navigateTo(route);
    
    expect(mockRouter.navigate).toHaveBeenCalledWith([route]);
  });

  it('should return correct activity icon', () => {
    expect(component.getActivityIcon('article')).toBe('fas fa-edit');
    expect(component.getActivityIcon('question')).toBe('fas fa-question-circle');
    expect(component.getActivityIcon('test')).toBe('fas fa-clipboard-list');
  });

  it('should return correct activity color', () => {
    expect(component.getActivityColor('article')).toBe('purple');
    expect(component.getActivityColor('question')).toBe('blue');
    expect(component.getActivityColor('test')).toBe('green');
  });

  it('should return correct status badge', () => {
    expect(component.getStatusBadge('published')).toBe('badge-success');
    expect(component.getStatusBadge('created')).toBe('badge-info');
    expect(component.getStatusBadge('updated')).toBe('badge-warning');
  });
});
