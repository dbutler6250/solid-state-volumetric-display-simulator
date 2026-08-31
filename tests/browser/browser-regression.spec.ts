import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { attachConsoleErrorGuard } from './helpers';

async function openSpectrum(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Fixed-Grating Display' }).click();
  await expect(page.getByRole('tab', { name: 'Fixed-Grating Display' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Fixed-Grating Display Workspace' })).toBeVisible();
}

async function waitForChartText(page: Page, text: string) {
  await expect.poll(async () => page.locator('.main-svg text').evaluateAll((nodes) =>
    nodes.map((node) => node.textContent ?? '').join('\n'),
  )).toContain(text);
}

test.describe('browser regression harness', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorGuard(page);
  });

  test('app loads spectrum chart and metrics', async ({ page }) => {
    await openSpectrum(page);
    await waitForChartText(page, 'Wavelength (nm)');
    await expect(page.getByLabel('Fixed grating operating point').getByText('Detuning')).toBeVisible();
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
    await page.getByRole('tab', { name: 'Robustness' }).click();

    const acousticFrequencyRow = page.locator('.parameter-sweep-row').filter({
      has: page.getByRole('heading', { name: 'Acoustic frequency' }),
    });
    await acousticFrequencyRow.getByRole('button', { name: 'Run Sweep' }).click();

    await waitForChartText(page, 'Acoustic frequency (Hz)');
    await expect(page.getByText('Design wavelength (nm)', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Sweep complete:')).toBeVisible();
  });

  test('hybrid controls expose prescribed piezo actuator fields', async ({ page }) => {
    await openSpectrum(page);

    await page.getByRole('combobox', { name: 'Input mode' }).selectOption('hybrid');
    const advancedControls = page.getByText('Advanced Solver / Strain Model');
    await advancedControls.click();
    const perturbationType = page.getByRole('combobox', { name: 'Strain profile' });
    await perturbationType.selectOption('piezo-window');
    await expect(perturbationType).toHaveValue('piezo-window');
    await expect(page.getByRole('textbox', { name: 'background strain' })).toBeVisible();

    await perturbationType.selectOption('piezo-trough');
    await expect(perturbationType).toHaveValue('piezo-trough');
    await expect(page.getByRole('textbox', { name: 'trough center (mm)' })).toBeVisible();

    await perturbationType.selectOption('piezo-array');
    await expect(perturbationType).toHaveValue('piezo-array');
    await expect(page.getByRole('textbox', { name: 'active actuator' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'adjacent command' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Array polarity' }).selectOption('trough');
    await expect(page.getByRole('combobox', { name: 'Array polarity' })).toHaveValue('trough');

    await page.getByRole('tab', { name: 'Spatial Addressing' }).click();
    await expect(page.getByRole('heading', { name: 'Spatial Response' })).toBeVisible();
    await expect(page.getByLabel('Tracking metrics').getByText('Optical center')).toBeVisible();
    await expect(page.getByText('Dominant region count')).toBeVisible();
    await waitForChartText(page, 'Actuator state index');
  });

  test('architecture navigation exposes current workflow and supporting tools', async ({ page }) => {
    await page.goto('/');

    for (const tabName of [
      'Overview',
      'Fixed-Grating Display',
      'Spatial Addressing',
      'Robustness',
      'Mechanical Feasibility',
      'Optical Stack',
      'Geometry / 3D',
      'Slicer / STL',
    ]) {
      await expect(page.getByRole('tab', { name: tabName })).toBeVisible();
    }

    await expect(page.getByText('Acoustic / Acousto-Optic Research')).toBeVisible();
  });

  test('core controls and advanced disclosure are separated', async ({ page }) => {
    await openSpectrum(page);

    await expect(page.getByLabel('Core experiment controls')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'laser detuning (nm)' })).toBeVisible();
    await expect(page.getByText('Advanced Solver / Strain Model')).toBeVisible();
    await page.getByText('Advanced Solver / Strain Model').click();
    await expect(page.getByRole('textbox', { name: 'segments' })).toBeVisible();
  });

  test('detuning and trough edits update derived readouts and spatial view', async ({ page }) => {
    await openSpectrum(page);

    const detuning = page.getByRole('textbox', { name: 'laser detuning (nm)' });
    await detuning.fill('0.2');
    await detuning.press('Tab');
    await expect(page.getByLabel('Fixed grating operating point').getByText('+0.200 nm')).toBeVisible();

    const troughCenter = page.getByRole('textbox', { name: 'trough center (mm)' });
    await troughCenter.fill('4.8');
    await troughCenter.press('Tab');
    await page.getByRole('tab', { name: 'Spatial Addressing' }).click();
    await expect(page.getByText('Commanded trough center')).toBeVisible();
    await waitForChartText(page, 'CMT normalized backward optical intensity');
    await waitForChartText(page, 'Local detuning lambda_B - lambda_laser');
  });

  test('3D view opens and supports volume and plane modes', async ({ page }) => {
    await openSpectrum(page);
    await page.getByRole('tab', { name: 'Geometry / 3D' }).click();

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
    await page.getByRole('tab', { name: 'Slicer / STL' }).click();

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
