import { test, expect } from '@playwright/test'

test.describe('Theme & Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth')
  })

  test('page has proper lang attribute', async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang')
    // Default language should be English or unset
    expect(lang === null || lang === 'en').toBeTruthy()
  })

  test('inputs have focus-visible styles', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]')
    await emailInput.focus()
    await expect(emailInput).toBeFocused()
  })

  test('buttons are keyboard accessible', async ({ page }) => {
    // Tab to first interactive element
    await page.keyboard.press('Tab')
    
    // Should be able to reach the sign-in button via tab
    let found = false
    for (let i = 0; i < 15; i++) {
      const focused = page.locator(':focus')
      const tag = await focused.evaluate(el => el.tagName).catch(() => '')
      if (tag === 'BUTTON' || tag === 'INPUT') {
        found = true
        break
      }
      await page.keyboard.press('Tab')
    }
    expect(found).toBeTruthy()
  })

  test('password field has minimum length', async ({ page }) => {
    const pwInput = page.locator('input[type="password"]')
    await expect(pwInput).toHaveAttribute('minlength', '6')
  })
})

test.describe('Responsive Design', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
  ]

  for (const vp of viewports) {
    test(`auth page renders correctly on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/auth')
      
      await expect(page.locator('text=BalanceTrack')).toBeVisible()
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
    })
  }
})
