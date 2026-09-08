import { TestBed } from '@angular/core/testing';
import { EvaluationChecklistComponent } from './evaluation-checklist';

describe('EvaluationChecklistComponent', () => {
  it('describes API-backed state and the optional production integration accurately', async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluationChecklistComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(EvaluationChecklistComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent.replace(/\s+/g, ' ');

    expect(text).toContain('Production Integration');
    expect(text).toContain('optional extension');
    expect(text).toContain('FastAPI-backed task persistence');
    expect(text).toContain('Authentication guard and HTTP interceptor');
    expect(text).toContain('server-side pagination');
    expect(text).toContain(
      'Frontend: Cloudflare Workers · API: Render · Database: Neon PostgreSQL',
    );
    expect(text).not.toContain('Local-storage persistence');
    expect(text).not.toContain('RxJS BehaviorSubject');
  });
});
