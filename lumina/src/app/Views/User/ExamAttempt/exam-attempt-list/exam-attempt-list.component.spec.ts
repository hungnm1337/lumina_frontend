import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamAttemptListComponent } from './exam-attempt-list.component';

describe('ExamAttemptListComponent', () => {
  let component: ExamAttemptListComponent;
  let fixture: ComponentFixture<ExamAttemptListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamAttemptListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamAttemptListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
