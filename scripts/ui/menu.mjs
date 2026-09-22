/** Open the existing disclosure with the keyboard without changing its route. */
export async function openMenu(page, key) {
  const trigger = page.locator(`.nav__link[data-target="${key}"]`);
  if (await trigger.getAttribute('aria-expanded') !== 'true') {
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
  }
}
