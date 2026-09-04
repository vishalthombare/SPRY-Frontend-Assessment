import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';

interface CalendarDay {
  readonly value: string;
  readonly number: number;
  readonly currentMonth: boolean;
  readonly disabled: boolean;
  readonly selected: boolean;
  readonly today: boolean;
  readonly active: boolean;
}

@Component({
  selector: 'app-date-picker',
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.scss',
})
export class DatePickerComponent {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly selectedValue = signal('');
  private readonly activeValue = signal(this.formatDate(new Date()));

  @Input() min = '';
  @Input() ariaLabel = 'Choose date';
  @Input() set value(value: string) {
    this.selectedValue.set(value ?? '');
    if (value) this.visibleMonth.set(this.parseDate(value));
  }
  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly blurred = new EventEmitter<void>();

  readonly open = signal(false);
  readonly visibleMonth = signal(this.startOfMonth(new Date()));
  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  get displayValue(): string {
    const value = this.selectedValue();
    if (!value) return 'Select a date';
    return new Intl.DateTimeFormat('en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(this.parseDate(value));
  }

  get hasValue(): boolean {
    return Boolean(this.selectedValue());
  }

  get monthLabel(): string {
    return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(
      this.visibleMonth(),
    );
  }

  get canGoPrevious(): boolean {
    if (!this.min) return true;
    const month = this.visibleMonth();
    const minimumMonth = this.startOfMonth(this.parseDate(this.min));
    return month.getTime() > minimumMonth.getTime();
  }

  toggle(): void {
    if (!this.open()) {
      const initial = this.selectedValue() ? this.parseDate(this.selectedValue()) : new Date();
      this.visibleMonth.set(this.startOfMonth(initial));
      this.activeValue.set(this.formatDate(initial));
      requestAnimationFrame(() => this.focusActiveDate());
    }
    this.open.update((value) => !value);
  }

  changeMonth(offset: number): void {
    if (offset < 0 && !this.canGoPrevious) return;
    const current = this.visibleMonth();
    this.visibleMonth.set(new Date(current.getFullYear(), current.getMonth() + offset, 1));
    const next = this.visibleMonth();
    const value = this.formatDate(next);
    this.activeValue.set(this.min && value < this.min ? this.min : value);
    requestAnimationFrame(() => this.focusActiveDate());
  }

  handleKeydown(event: KeyboardEvent): void {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const day = this.days().find((item) => item.value === this.activeValue());
      if (day) this.select(day);
      return;
    }
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      this.changeMonth(event.key === 'PageUp' ? -1 : 1);
      return;
    }

    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    const date = this.parseDate(this.activeValue());
    date.setDate(date.getDate() + offset);
    const value = this.formatDate(date);
    if (this.min && value < this.min) return;
    this.activeValue.set(value);
    this.visibleMonth.set(this.startOfMonth(date));
    requestAnimationFrame(() => this.focusActiveDate());
  }

  select(day: CalendarDay): void {
    if (day.disabled) return;
    this.selectedValue.set(day.value);
    this.valueChange.emit(day.value);
    this.blurred.emit();
    this.open.set(false);
  }

  selectToday(): void {
    const today = this.formatDate(new Date());
    this.select(this.createDay(this.parseDate(today), this.visibleMonth().getMonth()));
  }

  days(): CalendarDay[] {
    const month = this.visibleMonth();
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - firstDay.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return this.createDay(date, month.getMonth());
    });
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    if (this.open() && !this.element.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
      this.blurred.emit();
    }
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (this.open()) {
      this.open.set(false);
      this.blurred.emit();
    }
  }

  private createDay(date: Date, visibleMonth: number): CalendarDay {
    const value = this.formatDate(date);
    return {
      value,
      number: date.getDate(),
      currentMonth: date.getMonth() === visibleMonth,
      disabled: Boolean(this.min && value < this.min),
      selected: value === this.selectedValue(),
      today: value === this.formatDate(new Date()),
      active: value === this.activeValue(),
    };
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private parseDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private focusActiveDate(): void {
    this.element.nativeElement.querySelector<HTMLElement>('[data-active="true"]')?.focus();
  }
}
