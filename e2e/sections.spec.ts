import { expect, test, type Locator, type Page } from '@playwright/test'
import { argumentNodes, center, drag, node, openSample, saved } from './helpers'

// A spot on a section's header row that a link line doesn't cover. Links are
// drawn above sections, and their invisible click area can sit on the header.
async function freeHeaderSpot(page: Page, section: Locator) {
  const box = (await section.boundingBox())!
  const spot = await page.evaluate(({ x, y, w }) => {
    for (let px = x + w - 40; px > x + 10; px -= 8) {
      const hit = document.elementFromPoint(px, y)
      if (hit?.closest('.react-flow__node-section') && !hit.closest('button, summary')) return { x: px, y }
    }
    return null
  }, { x: box.x, y: box.y + 14, w: box.width })
  if (!spot) throw new Error('section header is fully covered')
  return spot
}

test.beforeEach(async ({ page }) => openSample(page))

test('sections: create, rename, drag nodes in and out, move, resize', async ({ page }) => {
  await page.getByRole('button', { name: '+ Section' }).click()
  const section = page.locator('.react-flow__node-section').first()
  // Rename by double-clicking the name (dispatched: a link may cross the header).
  await section.locator('h3').dispatchEvent('dblclick')
  await section.locator('input').fill('Nap findings')
  await page.keyboard.press('Enter')
  await expect(section.locator('h3')).toHaveText('Nap findings')

  // Drag e4 into the section.
  const box = (await section.boundingBox())!
  const e4 = node(page, 'e4')
  const from = await center(e4)
  await drag(page, { x: from.x, y: from.y + 20 }, { x: box.x + box.width / 2, y: box.y + box.height / 2 + 10 })
  let state = await saved(page)
  expect(state.positions.e4.sectionId).toBe(state.sections[0].id)

  // Moving the section carries e4 along.
  const before = (await e4.boundingBox())!
  const grab = await freeHeaderSpot(page, section)
  await drag(page, grab, { x: grab.x + 150, y: grab.y + 60 })
  const after = (await e4.boundingBox())!
  expect(Math.round(after.x - before.x)).toBeGreaterThan(100)

  // Resize from the bottom-right corner (the section is still selected).
  const sizeBefore = (await section.boundingBox())!
  await drag(page, await center(page.locator('.react-flow__resize-control.bottom.right')), {
    x: sizeBefore.x + sizeBefore.width + 120,
    y: sizeBefore.y + sizeBefore.height + 80,
  })
  state = await saved(page)
  expect(state.sections[0].width).toBeGreaterThan(sizeBefore.width)

  // Drag e4 back out.
  const inside = await center(e4)
  await drag(page, { x: inside.x, y: inside.y + 20 }, { x: inside.x, y: inside.y - 400 })
  expect((await saved(page)).positions.e4.sectionId).toBeNull()
})

test('edits survive a reload, and Reset returns the AI graph', async ({ page }) => {
  await page.getByRole('button', { name: '+ Node' }).click()
  await page.locator('dialog[open] textarea').fill('A note')
  await page.locator('dialog[open]').getByRole('button', { name: 'Add to graph' }).click()
  await page.getByRole('button', { name: '+ Section' }).click()
  await expect(argumentNodes(page)).toHaveCount(13)

  await page.reload()
  await expect(argumentNodes(page)).toHaveCount(13)
  await expect(page.locator('.react-flow__node-section')).toHaveCount(1)

  await page.locator('summary[aria-label="More graph options"]').click()
  await page.getByRole('button', { name: 'Reset to AI graph' }).click()
  await page.locator('dialog[open]').getByRole('button', { name: 'Reset graph' }).click()
  await expect(argumentNodes(page)).toHaveCount(12)
  expect(await saved(page)).toBeNull()
})

test('a pre-claim-first save is mirrored on load', async ({ page }) => {
  await page.evaluate(() => {
    const graph = {
      title: 'Old save',
      nodes: [
        { id: 'c1', type: 'claim', text: 'Main claim', source: { page: 1, quote: 'q' } },
        { id: 'e1', type: 'evidence', text: 'Evidence one', source: { page: 2, quote: 'q' } },
      ],
      edges: [{ id: 'l1', from: 'e1', to: 'c1', relation: 'supports' }],
    }
    localStorage.setItem(
      'graph:sample',
      JSON.stringify({
        version: 1,
        graph,
        edited: true,
        positions: { e1: { x: 0, y: 0, sectionId: null }, c1: { x: 400, y: 0, sectionId: null } },
        sections: [],
      }),
    )
  })
  await page.reload()
  const c1 = (await node(page, 'c1').boundingBox())!
  const e1 = (await node(page, 'e1').boundingBox())!
  expect(c1.x).toBeLessThan(e1.x)
  expect((await saved(page)).version).toBe(2)
})
