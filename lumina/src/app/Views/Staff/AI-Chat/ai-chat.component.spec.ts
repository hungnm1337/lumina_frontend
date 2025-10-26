import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiChatComponent } from './ai-chat.component'; 

describe('AIChatComponent', () => {
  let component: AiChatComponent;
  let fixture: ComponentFixture<AiChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiChatComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
