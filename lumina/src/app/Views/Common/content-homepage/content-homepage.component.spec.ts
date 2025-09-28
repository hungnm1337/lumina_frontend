import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentHomepageComponent } from './content-homepage.component';

describe('ContentHomepageComponent', () => {
  let component: ContentHomepageComponent;
  let fixture: ComponentFixture<ContentHomepageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentHomepageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContentHomepageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
