import { expect, test, type Page } from '@playwright/test'
import { drag, node, openSample } from './helpers'

test.beforeEach(async ({ page }) => openSample(page))

const lockedCard = (page: Page) => page.getByRole('group', { name: /^Locked:/ })

// A point on empty canvas, for panning.
async function emptySpot(page: Page) {
  const spot = await page.evaluate(() => {
    for (let y = 300; y < 800; y += 40)
      for (let x = 1100; x > 400; x -= 40)
        if (document.elementFromPoint(x, y)?.classList.contains('react-flow__pane')) return { x, y }
    return null
  })
  if (!spot) throw new Error('no empty canvas found')
  return spot
}

test('L locks the selected node to the screen; panning leaves it in place', async ({ page }) => {
  await node(page, 'c3').click()
  await page.keyboard.press('l')

  const card = lockedCard(page)
  await expect(card).toHaveAccessibleName('Locked: Claim 2')
  await expect(node(page, 'c3').getByText('Locked on screen')).toBeAttached()

  const before = await card.boundingBox()
  const nodeBefore = await node(page, 'c3').boundingBox()
  const from = await emptySpot(page)
  await drag(page, from, { x: from.x - 150, y: from.y - 100 })

  // The graph moved; the locked card didn't.
  const nodeAfter = await node(page, 'c3').boundingBox()
  expect(Math.round(nodeAfter!.x - nodeBefore!.x)).toBe(-150)
  expect(await card.boundingBox()).toEqual(before)
})

test('a locked card can be dragged, minimized, followed back to its node, and unlocked', async ({ page }) => {
  await node(page, 'c3').click()
  await page.getByRole('toolbar', { name: 'Node actions' }).getByRole('button', { name: 'Lock' }).click()
  const card = lockedCard(page)
  await expect(card).toBeVisible()

  // Drag it by its badge.
  const start = (await card.boundingBox())!
  await drag(page, { x: start.x + 30, y: start.y + 20 }, { x: start.x + 130, y: start.y + 220 })
  const moved = (await card.boundingBox())!
  expect(Math.round(moved.x - start.x)).toBe(100)
  expect(Math.round(moved.y - start.y)).toBe(200)

  // Minimize to one line, then expand again.
  const tall = moved.height
  await card.getByRole('button', { name: 'Minimize' }).click()
  expect((await card.boundingBox())!.height).toBeLessThan(tall)
  await card.getByRole('button', { name: 'Expand' }).click()

  // With the details closed, clicking the text selects the node again.
  const details = page.getByRole('complementary', { name: 'Claim 2 details' })
  await details.getByRole('button', { name: 'Close details' }).click()
  await expect(details).toHaveCount(0)
  await card.getByTitle('Show in graph').click()
  await expect(page.getByRole('complementary', { name: 'Claim 2 details' })).toBeVisible()

  await card.getByRole('button', { name: 'Unlock' }).click()
  await expect(card).toHaveCount(0)
  await expect(node(page, 'c3').getByText('Locked on screen')).toHaveCount(0)
})

test('L does nothing while typing', async ({ page }) => {
  await node(page, 'c3').click()
  await page.getByRole('toolbar', { name: 'Node actions' }).getByRole('button', { name: 'Edit' }).click()
  await page.locator('dialog[open] textarea').press('l')
  await page.keyboard.press('Escape')
  await expect(lockedCard(page)).toHaveCount(0)
})
