import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { EventService } from '../../../../Services/Event/event.service';
import { SlideService } from '../../../../Services/Slide/slide.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let eventServiceSpy: jasmine.SpyObj<EventService>;
  let slideServiceSpy: jasmine.SpyObj<SlideService>;

  beforeEach(async () => {
    eventServiceSpy = jasmine.createSpyObj('EventService', ['GetAllEvents']);
    slideServiceSpy = jasmine.createSpyObj('SlideService', ['getAllSlides']);

    eventServiceSpy.GetAllEvents.and.returnValue(of([]));
    slideServiceSpy.getAllSlides.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: EventService, useValue: eventServiceSpy },
        { provide: SlideService, useValue: slideServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize metrics to zero with empty services', () => {
    expect(component.totalEvents).toBe(0);
    expect(component.totalSlides).toBe(0);
    expect(component.activeEvents).toBe(0);
    expect(component.activeSlides).toBe(0);
  });

  it('should return correct activity icon', () => {
    expect(component.getActivityIcon('event')).toBe('fas fa-calendar-alt');
    expect(component.getActivityIcon('slide')).toBe('fas fa-images');
  });

  it('should return correct activity color', () => {
    expect(component.getActivityColor('event')).toBe('green');
    expect(component.getActivityColor('slide')).toBe('purple');
  });

  it('should return correct status badge', () => {
    expect(component.getStatusBadge('published')).toBe('badge-success');
    expect(component.getStatusBadge('created')).toBe('badge-info');
    expect(component.getStatusBadge('updated')).toBe('badge-warning');
  });
});
