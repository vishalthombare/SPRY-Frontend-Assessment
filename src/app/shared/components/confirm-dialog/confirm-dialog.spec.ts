import { TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog';

describe('ConfirmDialogComponent', () => {
  it('requires explicit confirmation before the parent deletes', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    const component = fixture.componentInstance;
    const confirm = vi.fn();
    component.confirm.subscribe(confirm);
    component.cancel.emit();
    expect(confirm).not.toHaveBeenCalled();
    component.confirm.emit();
    expect(confirm).toHaveBeenCalledOnce();
  });
});
