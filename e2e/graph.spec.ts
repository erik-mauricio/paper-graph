import { expect, test } from '@playwright/test'
import { argumentNodes, center, drag, edges, node, openSample, picker, plusOf, saved } from './helpers'

test.beforeEach(async ({ page }) => openSample(page))

test('lays the graph out claim-first', async ({ page }) => {
  await expect(argumentNodes(page)).toHaveCount(12)
  await expect(edges(page)).toHaveCount(9)
  const c1 = await node(page, 'c1').boundingBox()
  const e1 = await node(page, 'e1').boundingBox()
  expect(c1!.x).toBeLessThan(e1!.x)
  await expect(page.getByText('challenged by', { exact: true }).first()).toBeVisible()
})

test('"+" menu adds evidence linked to the claim', async ({ page }) => {
  await (await plusOf(page, 'c1')).click()
  await page.getByRole('button', { name: /Add evidence for this/ }).click()
  const form = page.locator('dialog[open]')
  await expect(form.locator('legend', { hasText: 'Link' })).toBeVisible()
  await form.locator('textarea').fill('New evidence for c1')
  await form.getByRole('button', { name: 'Add to graph' }).click()

  await expect(argumentNodes(page)).toHaveCount(13)
  const state = await saved(page)
  const added = state.graph.nodes.at(-1)
  expect(state.graph.edges.at(-1)).toMatchObject({ from: added.id, to: 'c1', relation: 'supports' })
  expect(state.positions[added.id].x).toBeGreaterThan(state.positions.c1.x)
})

test('dragging "+" onto a card links them, and Swap flips the direction', async ({ page }) => {
  // Claim onto evidence: the claim is backed by the evidence.
  await drag(page, await center(await plusOf(page, 'c4')), await center(node(page, 'e8')))
  await expect(picker(page)).toBeVisible()
  await picker(page).getByRole('button', { name: 'Backed by' }).click()
  expect((await saved(page)).graph.edges.at(-1)).toMatchObject({ from: 'e8', to: 'c4', relation: 'supports' })

  // Evidence onto a claim defaults to the claim being backed; Swap reverses it.
  await drag(page, await center(await plusOf(page, 'e8')), await center(node(page, 'c3')))
  await expect(picker(page).locator('p').first()).toContainText('Short naps')
  await picker(page).getByRole('button', { name: 'Swap' }).click()
  await picker(page).getByRole('button', { name: 'Challenged by' }).click()
  expect((await saved(page)).graph.edges.at(-1)).toMatchObject({ from: 'c3', to: 'e8', relation: 'contradicts' })
})

test('dragging "+" onto empty space creates a linked node', async ({ page }) => {
  await drag(page, await center(await plusOf(page, 'c2')), { x: 1150, y: 200 })
  const form = page.locator('dialog[open]')
  await form.locator('textarea').fill('Dropped on empty space')
  await form.getByRole('button', { name: 'Add to graph' }).click()
  const state = await saved(page)
  expect(state.graph.edges.at(-1)).toMatchObject({ from: state.graph.nodes.at(-1).id, to: 'c2' })
})

test('link mode links two nodes by clicking, and Esc cancels it', async ({ page }) => {
  await (await plusOf(page, 'c2')).click()
  await page.getByRole('button', { name: /Link to an existing node/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Click the node' })).toBeVisible()
  await node(page, 'e1').click()
  await picker(page).getByRole('button', { name: 'Backed by' }).click()
  expect((await saved(page)).graph.edges.at(-1)).toMatchObject({ from: 'e1', to: 'c2' })

  await (await plusOf(page, 'c3')).click()
  await page.getByRole('button', { name: /Link to an existing node/ }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('status').filter({ hasText: 'Click the node' })).toHaveCount(0)
})

test('clicking a link shows its chip: switch relation, delete, undo', async ({ page }) => {
  const edge = page.locator('.react-flow__edge[data-id="l2"]')
  await page.mouse.click(...Object.values(await center(edge.locator('.react-flow__edge-interaction'))) as [number, number])
  const chip = page.getByRole('group', { name: 'Link options' })
  await chip.getByRole('button', { name: 'Challenged by' }).click()
  expect((await saved(page)).graph.edges.find((e: { id: string }) => e.id === 'l2').relation).toBe('contradicts')

  await chip.getByRole('button', { name: /Delete link/ }).click()
  await expect(edges(page)).toHaveCount(8)
  await page.locator('.toast').getByRole('button', { name: 'Undo' }).click()
  await expect(edges(page)).toHaveCount(9)
})

test('quick-actions bar edits and deletes with undo', async ({ page }) => {
  await node(page, 'c3').click()
  const bar = page.getByRole('toolbar', { name: 'Node actions' })
  await bar.getByRole('button', { name: 'Edit' }).click()
  await expect(page.locator('dialog[open] h3')).toHaveText('Edit node')
  await page.keyboard.press('Escape')

  await bar.getByRole('button', { name: 'Delete' }).click()
  await expect(argumentNodes(page)).toHaveCount(11)
  await page.locator('.toast').getByRole('button', { name: 'Undo' }).click()
  await expect(argumentNodes(page)).toHaveCount(12)
})

test('double-click adds a node on empty canvas and edits a node', async ({ page }) => {
  const empty = await page.evaluate(() => {
    for (let y = 150; y < 800; y += 40)
      for (let x = 1100; x > 200; x -= 40)
        if (document.elementFromPoint(x, y)?.classList.contains('react-flow__pane')) return { x, y }
    return null
  })
  await page.mouse.dblclick(empty!.x, empty!.y)
  await expect(page.locator('dialog[open] h3')).toHaveText('Add a node')
  await page.keyboard.press('Escape')

  await node(page, 'c4').dblclick()
  await expect(page.locator('dialog[open] h3')).toHaveText('Edit node')
})
