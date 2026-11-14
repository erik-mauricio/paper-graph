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

const relatedPaper = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
  id,
  title,
  year: 2019,
  authors: ['A. Author', 'B. Author', 'C. Author'],
  moreAuthors: true,
  venue: 'Sleep Medicine Reviews',
  citationCount: 1200,
  kinds: [],
  abstract: 'An abstract.',
  url: `https://doi.org/10.1/${id}`,
  ...extra,
})

test('Overview loads related work from Semantic Scholar when opened', async ({ page }) => {
  const requests: unknown[] = []
  await page.route('**/api/related', async (route) => {
    requests.push(route.request().postDataJSON())
    await route.fulfill({
      json: {
        match: { id: 'me', title: 'Sleep Duration and Memory', url: 'https://arxiv.org/abs/1', how: 'title' },
        reviews: [relatedPaper('r1', 'Sleep and memory: a meta-analysis', { kinds: ['meta-analysis'] })],
        buildsOn: [relatedPaper('b1', 'The memory function of sleep')],
        similar: [],
      },
    })
  })

  // Nothing is fetched until the Overview opens.
  expect(requests).toHaveLength(0)
  await page.getByRole('tab', { name: 'Overview' }).click()

  const related = page.locator('section[aria-labelledby="related-work"]')
  await expect(related.getByRole('link', { name: 'Sleep and memory: a meta-analysis' })).toHaveAttribute(
    'href',
    'https://doi.org/10.1/r1',
  )
  await expect(related.locator('.badge', { hasText: 'Meta-analysis' })).toBeVisible()
  await expect(related.getByText('1,200 citations').first()).toBeVisible()
  await expect(related.getByRole('link', { name: 'The memory function of sleep' })).toBeVisible()
  await expect(related.getByText('No similar papers found yet.')).toBeVisible()
  expect(requests[0]).toMatchObject({ title: expect.stringContaining('Sleep'), topic: 'sleep duration memory consolidation students' })

  // Switching tabs and back doesn't fetch again.
  await page.getByRole('tab', { name: 'Graph' }).click()
  await page.getByRole('tab', { name: 'Overview' }).click()
  await expect(related.getByRole('link', { name: 'The memory function of sleep' })).toBeVisible()
  expect(requests).toHaveLength(1)
})

test('related work shows an error with a retry', async ({ page }) => {
  let calls = 0
  await page.route('**/api/related', (route) => {
    calls++
    return calls === 1
      ? route.fulfill({ status: 503, json: { error: 'Semantic Scholar is busy right now. Try again in a minute.' } })
      : route.fulfill({ json: { match: null, reviews: [], buildsOn: [], similar: [] } })
  })
  await page.getByRole('tab', { name: 'Overview' }).click()
  await expect(page.getByRole('alert')).toContainText('Semantic Scholar is busy')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByText("Couldn't find this paper on Semantic Scholar")).toBeVisible()
})
