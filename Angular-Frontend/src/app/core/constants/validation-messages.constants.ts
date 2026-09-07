import { VALIDATION_LIMITS } from './validation-patterns.constants';

/** User-facing validation copy shared by reactive forms and their templates. */
export const VALIDATION_MESSAGES = {
  auth: {
    email: 'Please enter a valid email address.',
    password: `Password must be at least ${VALIDATION_LIMITS.passwordMinLength} characters.`,
  },
  task: {
    title: 'Enter a title containing at least one visible character.',
    dueDateRequired: 'A due date is required.',
    dueDateMinimum: 'Due date cannot be before today.',
  },
} as const;
