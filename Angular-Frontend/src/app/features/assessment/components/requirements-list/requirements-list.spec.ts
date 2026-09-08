import { TestBed } from '@angular/core/testing';
import { RequirementsListComponent } from './requirements-list';

describe('RequirementsListComponent', () => {
  it('summarizes all fifteen implemented capabilities in grouped cards', async () => {
    await TestBed.configureTestingModule({
      imports: [RequirementsListComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(RequirementsListComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent.replace(/\s+/g, ' ');

    expect(text).toContain('15 requirements');
    expect(text).toContain('Search titles and descriptions');
    expect(text).toContain('server-side pages');
    expect(text).toContain('summary counts');
    expect(text).toContain('loading, empty, error and confirmation');
    expect(text).toContain('per-user tasks');
  });
});
