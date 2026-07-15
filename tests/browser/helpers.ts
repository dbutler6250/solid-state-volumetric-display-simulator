import type { Page } from '@playwright/test';

const BENIGN_CONSOLE_PATTERNS = [/Download the React DevTools/i];

/** Fails a test on unexpected browser console errors while allowing known noise. */
export function attachConsoleErrorGuard(page: Page): void {
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (BENIGN_CONSOLE_PATTERNS.some((pattern) => pattern.test(text))) return;
    throw new Error(`Unexpected console error: ${text}`);
  });
}

