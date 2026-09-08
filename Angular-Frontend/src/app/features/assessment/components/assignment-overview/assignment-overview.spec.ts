import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AssignmentOverviewComponent } from './assignment-overview';

describe('AssignmentOverviewComponent', () => {
  it('uses Angular Router navigation for the Task Management action', async () => {
    await TestBed.configureTestingModule({
      imports: [AssignmentOverviewComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(AssignmentOverviewComponent);
    fixture.detectChanges();
    const taskLink: HTMLAnchorElement = fixture.nativeElement.querySelector('a');

    expect(taskLink.getAttribute('href')).toBe('/tasks');
  });
});
