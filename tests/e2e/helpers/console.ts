import type { Page } from '@playwright/test';

/** Uncaught JS exceptions only (ignores console noise from network/401 in dev). */
export function attachStrictErrorCollector(page: Page) {
  const errors: string[] = [];
  const onPageError = (err: Error) => {
    errors.push(err.message);
  };
  page.on('pageerror', onPageError);
  return () => {
    page.off('pageerror', onPageError);
    return errors.filter(Boolean);
  };
}
