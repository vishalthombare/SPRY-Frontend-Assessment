import { TestBed } from '@angular/core/testing';
import { TaskFormDialogComponent } from './task-form-dialog';

describe('TaskFormDialogComponent', () => {
  it('requires a visible title and due date', () => {
    const fixture = TestBed.createComponent(TaskFormDialogComponent);
    const component = fixture.componentInstance;
    component.form.setValue({ title: '   ', description: '', dueDate: '', status: 'pending' });
    expect(component.form.controls.title.invalid).toBe(true);
    expect(component.form.controls.dueDate.invalid).toBe(true);
  });
  it('emits a valid add form value', () => {
    const fixture = TestBed.createComponent(TaskFormDialogComponent);
    const component = fixture.componentInstance;
    const save = vi.fn();
    component.save.subscribe(save);
    component.form.setValue({
      title: 'Valid task',
      description: '',
      dueDate: '2026-09-03',
      status: 'pending',
    });
    component.submit();
    expect(save).toHaveBeenCalledWith(component.form.getRawValue());
  });
});
