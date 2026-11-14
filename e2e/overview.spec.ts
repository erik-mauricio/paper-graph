import { expect, test } from '@playwright/test'
import { node, openSample } from './helpers'

test.beforeEach(async ({ page }) => openSample(page))

test('methods sit in their own section in the graph', async ({ page }) => {
  const methods = page.locator('.react-flow__node-section', { hasText: 'Methods & study design' })
  await expect(methods).toBeVisible()
  const m1 = (await node(page, 'm1').boundingBox())!
  const box = (await methods.boundingBox())!
  expect(m1.x).toBeGreaterThan(box.x)
  expect(m1.x + m1.width).toBeLessThan(box.x + box.width)
})

test('Overview tab shows the summary, background, and study design', async ({ page }) => {
  await page.getByRole('tab', { name: 'Overview' }).click()
  await expect(page.getByRole('heading', { name: 'Summary' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Background' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Study design' })).toBeVisible()
  await expect(page.getByText('Observational study')).toBeVisible()

  // Each group is labeled with its role.
  for (const role of ['Control', 'Treatment', 'Comparison']) {
    await expect(page.locator('.badge', { hasText: new RegExp(`^${role}$`) })).toHaveCount(1)
  }

  // Methods list what they led to.
  await expect(page.getByRole('heading', { name: /Methods in the graph \(3\)/ })).toBeVisible()
  await expect(page.getByText('Led to').first()).toBeVisible()
})
