import { TestBed } from '@angular/core/testing';
import { EXTERNAL_LINKS } from '../../../../core/constants/external-links.constants';
import { SubmissionResourcesComponent } from './submission-resources';

describe('SubmissionResourcesComponent', () => {
  it('renders three secure, accessible reviewer links', async () => {
    await TestBed.configureTestingModule({
      imports: [SubmissionResourcesComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(SubmissionResourcesComponent);
    fixture.detectChanges();
    const links = [
      ...fixture.nativeElement.querySelectorAll('.resource-action'),
    ] as HTMLAnchorElement[];

    expect(links).toHaveLength(3);
    expect(links.map((link) => link.href)).toEqual([
      EXTERNAL_LINKS.repository,
      EXTERNAL_LINKS.frontendReadme,
      EXTERNAL_LINKS.apiDocumentation,
    ]);
    for (const link of links) {
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener noreferrer');
      expect(link.getAttribute('aria-label')).toContain('opens in a new tab');
    }
    expect(fixture.nativeElement.textContent).not.toContain('Live application');
  });
});
