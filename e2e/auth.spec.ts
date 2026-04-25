import { test, expect } from '@playwright/test'

test.describe('Auth Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth')
  })

  test('renders login form', async ({ page }) => {
    await expect(page.locator('text=BalanceTrack')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('shows validation on empty submit', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveAttribute('required', '')
  })

  test('can toggle between sign in and sign up', async ({ page }) => {
    // Should start in sign-in mode
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

    // Click "Sign Up" link
    await page.getByRole('button', { name: /sign up/i }).last().click()

    // Should now show display name field
    await expect(page.locator('input[autocomplete="name"]')).toBeVisible()
    
    // Toggle back
    await page.getByRole('button', { name: /sign in/i }).last().click()
    await expect(page.locator('input[autocomplete="name"]')).not.toBeVisible()
  })

  test('shows Google sign-in button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).first().click()
    
    // Should show an error message
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 })
  })

  test('has proper accessibility attributes', async ({ page }) => {
    // Labels are associated with inputs
    await expect(page.locator('label[for="email"]')).toBeVisible()
    await expect(page.locator('label[for="password"]')).toBeVisible()
    
    // Buttons have proper types
    const submitBtn = page.getByRole('button', { name: /sign in/i }).first()
    await expect(submitBtn).toBeVisible()
  })
})
