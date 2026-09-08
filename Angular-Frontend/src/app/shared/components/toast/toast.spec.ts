import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { APP_CONSTANTS } from '../../../core/constants/app.constants';
import { ToastComponent } from './toast';

describe('ToastComponent', () => {
  let fixture: ComponentFixture<ToastComponent>;
  let component: ToastComponent;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({ imports: [ToastComponent] }).compileComponents();
    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => vi.useRealTimers());

  it('dismisses an open notification after the shared duration', () => {
    const dismiss = vi.spyOn(component.dismiss, 'emit');
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    vi.advanceTimersByTime(APP_CONSTANTS.toastDurationMs);
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it('cancels auto-dismiss when the close button is used', () => {
    const dismiss = vi.spyOn(component.dismiss, 'emit');
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button').click();
    vi.advanceTimersByTime(APP_CONSTANTS.toastDurationMs);

    expect(dismiss).toHaveBeenCalledOnce();
  });
});
