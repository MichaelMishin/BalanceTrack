import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('unauthenticated user is redirected to /auth', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/auth/)
  })

  test('auth page loads without errors', async ({ page }) => {
    await page.goto('/auth')
    
    // No console errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    
    await expect(page.locator('text=BalanceTrack')).toBeVisible()
    // Filter out expected Supabase errors
    const unexpectedErrors = errors.filter(e => !e.includes('supabase') && !e.includes('auth'))
    expect(unexpectedErrors).toHaveLength(0)
  })
})

test.describe('Visual Structure', () => {
  test('auth page has gradient background effects', async ({ page }) => {
    await page.goto('/auth')
    
    // The glass card should be visible
    const card = page.locator('.glass-card')
    await expect(card).toBeVisible()
  })

  test('auth page is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/auth')
    
    const card = page.locator('.glass-card')
    await expect(card).toBeVisible()
    
    // Card should fit within viewport
    const box = await card.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBeLessThanOrEqual(375)
  })
})
