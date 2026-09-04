import { TASK_ROUTES } from './tasks.routes';

describe('TASK_ROUTES', () => {
  it('uses one page component with route data for both task tabs', async () => {
    const children = TASK_ROUTES[0].children ?? [];
    expect(children.map((route) => route.path)).toEqual(['', 'completed']);
    expect(children.map((route) => route.data?.['completedOnly'])).toEqual([false, true]);
    expect(await children[0].loadComponent?.()).toBe(await children[1].loadComponent?.());
  });
});
