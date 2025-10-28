import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamAttemptDetailComponent } from './exam-attempt-detail.component';

describe('ExamAttemptDetailComponent', () => {
  let component: ExamAttemptDetailComponent;
  let fixture: ComponentFixture<ExamAttemptDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamAttemptDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamAttemptDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
