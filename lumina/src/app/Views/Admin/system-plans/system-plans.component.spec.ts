import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemPlansComponent } from './system-plans.component';

describe('SystemPlansComponent', () => {
  let component: SystemPlansComponent;
  let fixture: ComponentFixture<SystemPlansComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemPlansComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SystemPlansComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
