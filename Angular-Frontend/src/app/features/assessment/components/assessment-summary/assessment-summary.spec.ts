import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { TaskApiService } from '../../../tasks/data-access/task-api.service';
import { TaskCounts } from '../../../tasks/models/task.model';
import { AssessmentSummaryComponent } from './assessment-summary';

class FakeTaskApiService {
  response: Observable<TaskCounts> = of({
    total: 8,
    pending: 2,
    inProgress: 1,
    completed: 5,
  });

  getSummary(): Observable<TaskCounts> {
    return this.response;
  }
}

describe('AssessmentSummaryComponent', () => {
  async function create(
    response: Observable<TaskCounts>,
  ): Promise<ComponentFixture<AssessmentSummaryComponent>> {
    const fakeApi = new FakeTaskApiService();
    fakeApi.response = response;
    await TestBed.configureTestingModule({ imports: [AssessmentSummaryComponent] })
      .overrideComponent(AssessmentSummaryComponent, {
        set: { providers: [{ provide: TaskApiService, useValue: fakeApi }] },
      })
      .compileComponents();
    const fixture = TestBed.createComponent(AssessmentSummaryComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the complete assessment state, readiness, Angular version and dynamic progress', async () => {
    const fixture = await create(of({ total: 8, pending: 2, inProgress: 1, completed: 5 }));
    const text = fixture.nativeElement.textContent.replace(/\s+/g, ' ');

    expect(text).toContain('Submission prepared');
    expect(text).toContain('Complete');
    expect(text).toContain('Ready for review');
    expect(text).toContain('100%');
    expect(text).toContain('Angular 21 · TypeScript');
    expect(text).toContain('5 of 8 completed');
    expect(text).toContain('2 pending · 1 in progress');
  });

  it('shows the zero-task state', async () => {
    const fixture = await create(of({ total: 0, pending: 0, inProgress: 0, completed: 0 }));

    expect(fixture.nativeElement.textContent).toContain('No tasks available');
  });

  it('shows a loading state until the task summary responds', async () => {
    const fixture = await create(new Subject<TaskCounts>());

    expect(fixture.nativeElement.textContent).toContain('Loading task progress…');
  });

  it('handles a task-summary failure without breaking the overview', async () => {
    const fixture = await create(throwError(() => new Error('API unavailable')));

    expect(fixture.nativeElement.textContent).toContain('Task progress unavailable');
  });
});
