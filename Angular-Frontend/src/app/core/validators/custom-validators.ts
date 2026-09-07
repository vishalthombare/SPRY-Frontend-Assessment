import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Require an ISO local date on or after the supplied minimum date. */
export function minimumDate(minimum: string): ValidatorFn {
  // YYYY-MM-DD values compare chronologically without timezone conversion.
  return (control: AbstractControl<string>): ValidationErrors | null =>
    !control.value || control.value >= minimum ? null : { minimumDate: true };
}
