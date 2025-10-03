import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { DashboardSlideComponent } from './dashboardslide.component';
import { SlideService } from '../../../Services/Slide/slide.service';
import { SlideDTO } from '../../../Interfaces/slide.interface';

describe('DashboardSlideComponent', () => {
  let component: DashboardSlideComponent;
  let fixture: ComponentFixture<DashboardSlideComponent>;
  let slideService: jasmine.SpyObj<SlideService>;

  const mockSlides: SlideDTO[] = [
    {
      slideId: 1,
      slideName: 'Test Slide 1',
      slideUrl: 'https://example.com/slide1',
      createBy: 1,
      createAt: new Date('2024-01-01'),
      isActive: true
    },
    {
      slideId: 2,
      slideName: 'Test Slide 2',
      slideUrl: 'https://example.com/slide2',
      createBy: 1,
      createAt: new Date('2024-01-02'),
      isActive: false
    }
  ];

  beforeEach(async () => {
    const slideServiceSpy = jasmine.createSpyObj('SlideService', [
      'getAllSlides',
      'getSlideById',
      'createSlide',
      'updateSlide',
      'deleteSlide'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        DashboardSlideComponent,
        HttpClientTestingModule,
        FormsModule
      ],
      providers: [
        { provide: SlideService, useValue: slideServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardSlideComponent);
    component = fixture.componentInstance;
    slideService = TestBed.inject(SlideService) as jasmine.SpyObj<SlideService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load slides on init', () => {
    slideService.getAllSlides.and.returnValue(of(mockSlides));
    
    component.ngOnInit();
    
    expect(slideService.getAllSlides).toHaveBeenCalled();
    expect(component.slides).toEqual(mockSlides);
    expect(component.filteredSlides).toEqual(mockSlides);
  });

  it('should handle error when loading slides', () => {
    const errorMessage = 'Error loading slides';
    slideService.getAllSlides.and.returnValue(throwError(() => new Error(errorMessage)));
    
    component.ngOnInit();
    
    expect(component.errorMessage).toContain('Lỗi khi tải danh sách slide');
    expect(component.isLoading).toBeFalse();
  });

  it('should filter slides by keyword', () => {
    component.slides = mockSlides;
    component.searchKeyword = 'Test Slide 1';
    
    component.applyFilters();
    
    expect(component.filteredSlides).toEqual([mockSlides[0]]);
  });

  it('should filter slides by active status', () => {
    component.slides = mockSlides;
    component.filterActive = true;
    
    component.applyFilters();
    
    expect(component.filteredSlides).toEqual([mockSlides[0]]);
  });

  it('should clear filters', () => {
    component.searchKeyword = 'test';
    component.filterActive = true;
    component.slides = mockSlides;
    
    component.clearFilters();
    
    expect(component.searchKeyword).toBe('');
    expect(component.filterActive).toBeNull();
    expect(component.filteredSlides).toEqual(mockSlides);
  });

  it('should open create modal', () => {
    component.openCreateModal();
    
    expect(component.isModalOpen).toBeTrue();
    expect(component.isEditMode).toBeFalse();
    expect(component.selectedSlide).toBeNull();
    expect(component.formData.slideName).toBe('');
    expect(component.formData.slideUrl).toBe('');
  });

  it('should open edit modal', () => {
    const slide = mockSlides[0];
    component.openEditModal(slide);
    
    expect(component.isModalOpen).toBeTrue();
    expect(component.isEditMode).toBeTrue();
    expect(component.selectedSlide).toBe(slide);
    expect(component.formData).toEqual(slide);
  });

  it('should open view modal', () => {
    const slide = mockSlides[0];
    component.openViewModal(slide);
    
    expect(component.isModalOpen).toBeTrue();
    expect(component.isEditMode).toBeFalse();
    expect(component.selectedSlide).toBe(slide);
  });

  it('should close modal', () => {
    component.isModalOpen = true;
    component.selectedSlide = mockSlides[0];
    component.isEditMode = true;
    
    component.closeModal();
    
    expect(component.isModalOpen).toBeFalse();
    expect(component.selectedSlide).toBeNull();
    expect(component.isEditMode).toBeFalse();
  });

  it('should create slide successfully', () => {
    slideService.createSlide.and.returnValue(of(3));
    component.isEditMode = false;
    component.formData = {
      slideName: 'New Slide',
      slideUrl: 'https://example.com/new',
      isActive: true,
      createBy: 1,
      createAt: new Date()
    };
    
    component.saveSlide();
    
    expect(slideService.createSlide).toHaveBeenCalledWith(component.formData);
  });

  it('should update slide successfully', () => {
    slideService.updateSlide.and.returnValue(of(void 0));
    component.isEditMode = true;
    component.selectedSlide = mockSlides[0];
    component.formData = { ...mockSlides[0], slideName: 'Updated Slide' };
    
    component.saveSlide();
    
    expect(slideService.updateSlide).toHaveBeenCalledWith(mockSlides[0].slideId, component.formData);
  });

  it('should delete slide successfully', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    slideService.deleteSlide.and.returnValue(of(void 0));
    const slide = mockSlides[0];
    
    component.deleteSlide(slide);
    
    expect(slideService.deleteSlide).toHaveBeenCalledWith(slide.slideId);
  });

  it('should not delete slide if user cancels', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const slide = mockSlides[0];
    
    component.deleteSlide(slide);
    
    expect(slideService.deleteSlide).not.toHaveBeenCalled();
  });

  it('should validate form correctly', () => {
    // Test empty slide name
    component.formData.slideName = '';
    component.formData.slideUrl = 'https://example.com';
    
    const result1 = component['validateForm']();
    expect(result1).toBeFalse();
    expect(component.errorMessage).toBe('Tên slide không được để trống');
    
    // Test empty slide URL
    component.formData.slideName = 'Test Slide';
    component.formData.slideUrl = '';
    
    const result2 = component['validateForm']();
    expect(result2).toBeFalse();
    expect(component.errorMessage).toBe('URL slide không được để trống');
    
    // Test valid form
    component.formData.slideName = 'Test Slide';
    component.formData.slideUrl = 'https://example.com';
    
    const result3 = component['validateForm']();
    expect(result3).toBeTrue();
  });

  it('should return correct status badge class', () => {
    expect(component.getStatusBadgeClass(true)).toBe('bg-green-100 text-green-800 border-green-200');
    expect(component.getStatusBadgeClass(false)).toBe('bg-red-100 text-red-800 border-red-200');
  });

  it('should return correct status text', () => {
    expect(component.getStatusText(true)).toBe('Hoạt động');
    expect(component.getStatusText(false)).toBe('Không hoạt động');
  });

  it('should format date correctly', () => {
    const date = new Date('2024-01-01');
    const formattedDate = component.formatDate(date);
    expect(formattedDate).toBe('1/1/2024');
  });

  it('should handle undefined date in formatDate', () => {
    const formattedDate = component.formatDate(undefined);
    expect(formattedDate).toBe('N/A');
  });
});
