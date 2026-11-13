import { expect, type Locator, type Page } from '@playwright/test'

type Point = { x: number; y: number }

// Opens the sample graph with no saved edits and the first-time tip dismissed.
export async function openSample(page: Page) {
  await page.goto('/?sample')
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('tip:graph-editing', 'dismissed')
  })
  await page.reload()
  await expect(page.locator('.react-flow__node-argument').first()).toBeVisible()
}

export const node = (page: Page, id: string) => page.locator(`.react-flow__node[data-id="${id}"]`)

export async function center(locator: Locator): Promise<Point> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('element is not visible')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

// The "+" on a node only shows on hover.
export async function plusOf(page: Page, id: string): Promise<Locator> {
  await node(page, id).hover()
  return node(page, id).locator('.graph-plus')
}

// A slow mouse drag, so React Flow sees a real drag rather than a click.
export async function drag(page: Page, from: Point, to: Point) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  for (let i = 1; i <= 15; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / 15, from.y + ((to.y - from.y) * i) / 15)
  }
  await page.mouse.up()
}

// The saved editor state for the sample graph (null until something is edited).
export function saved(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('graph:sample')
    return raw ? JSON.parse(raw) : null
  })
}

export const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose how these are related' })
export const argumentNodes = (page: Page) => page.locator('.react-flow__node-argument')
export const edges = (page: Page) => page.locator('.react-flow__edge')
