import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { attachConsoleErrorGuard } from './helpers';

async function openSpectrum(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('tab', { name: 'Spectrum' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Spectrum' })).toBeVisible();
}

async function waitForChartText(page: Page, text: string) {
  await expect(page.getByText(text, { exact: true })).toBeVisible();
}

test.describe('browser regression harness', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorGuard(page);
  });

  test('app loads spectrum chart and metrics', async ({ page }) => {
    await openSpectrum(page);
    await waitForChartText(page, 'Wavelength (nm)');
    const metrics = page.getByLabel('Simulation metrics');
    await expect(metrics.getByText('Peak reflectance', { exact: true })).toBeVisible();
    await expect(metrics.getByText('Center wavelength', { exact: true })).toBeVisible();
  });

  test('workload validation recovers after a direct over-limit edit', async ({ page }) => {
    await openSpectrum(page);

    const sweepStart = page.getByRole('textbox', { name: 'start wavelength' });
    const sweepEnd = page.getByRole('textbox', { name: 'end wavelength' });
    await sweepStart.fill('700');
    await sweepStart.press('Tab');
    await sweepEnd.fill('650');
    await sweepEnd.press('Tab');

    await expect(page.getByText('Sweep end must be greater than sweep start.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export Spectrum CSV' })).toBeDisabled();

    await sweepEnd.fill('750');
    await sweepEnd.press('Tab');
    await expect(page.getByText('Sweep end must be greater than sweep start.', { exact: true })).toHaveCount(0);
    await waitForChartText(page, 'Wavelength (nm)');
    await expect(page.getByLabel('Simulation metrics').getByText('Peak reflectance', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Simulation metrics').getByText('Center wavelength', { exact: true })).toBeVisible();
  });

  test('acoustic sweep uses acoustic x-axis labels', async ({ page }) => {
    await openSpectrum(page);

    await page.getByRole('combobox', { name: 'Input mode' }).selectOption('acoustic');
    await page.getByRole('tab', { name: 'Parameter Sweep' }).click();

    await page.getByRole('region', { name: 'Parameter sweep controls' }).getByRole('combobox').selectOption({ label: 'Acoustic frequency' });
    await page.getByRole('button', { name: 'Run Sweep' }).click();

    await waitForChartText(page, 'Acoustic frequency (Hz)');
    await expect(page.getByText('Design wavelength (nm)', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Sweep complete:')).toBeVisible();
  });

  test('3D view opens and supports volume and plane modes', async ({ page }) => {
    await openSpectrum(page);
    await page.getByRole('tab', { name: '3D View' }).click();

    const canvas = page.locator('[aria-label="3D reflectance canvas"] canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveCount(1);

    await page.getByRole('button', { name: 'Plane' }).click();
    await expect(page.getByRole('button', { name: 'Plane' })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Volume' }).click();
    await expect(page.getByRole('button', { name: 'Volume' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('STL slicer loads the sample mesh and reports bounded coverage', async ({ page }) => {
    await openSpectrum(page);
    await page.getByRole('tab', { name: 'STL Slicer' }).click();

    await page.getByRole('button', { name: 'Load sample hollow sphere' }).click();
    await expect(page.getByText(/Coverage averages .*peak slice coverage of/i)).toBeVisible();

    const coverageText = await page.getByText(/Coverage averages .*peak slice coverage of ([0-9.]+)%/i).textContent();
    const match = coverageText?.match(/peak slice coverage of ([0-9.]+)%/i);
    expect(match).not.toBeNull();
    if (!match) return;
    expect(Number(match[1])).toBeLessThanOrEqual(100);
  });

  test('mobile viewport has no page-level horizontal overflow', async ({ page }) => {
    await openSpectrum(page);
    await page.setViewportSize({ width: 390, height: 844 });

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      innerWidth: window.innerWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });
});
