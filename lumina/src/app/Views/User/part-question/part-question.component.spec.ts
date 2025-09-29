import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartQuestionComponent } from './part-question.component';

describe('PartQuestionComponent', () => {
  let component: PartQuestionComponent;
  let fixture: ComponentFixture<PartQuestionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartQuestionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartQuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
