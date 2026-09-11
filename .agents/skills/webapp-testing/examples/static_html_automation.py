from playwright.sync_api import sync_playwright
import os
from wait_until import wait_until

# Example: Automating interaction with static HTML files using file:// URLs

html_file_path = os.path.abspath('path/to/your/file.html')
file_url = f'file://{html_file_path}'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})

    # Navigate to local HTML file
    page.goto(file_url)

    error_alert = page.get_by_role('alert')

    def run_ui_action(control, action, description):
        wait_until(
            lambda: control.is_visible() and control.is_enabled(),
            wait=page.wait_for_timeout,
            description=f'{description} is visible and enabled',
        )
        wait_until(
            lambda: not error_alert.is_visible(),
            wait=page.wait_for_timeout,
            description=f'no blocking error alert before {description}',
        )
        action()
        wait_until(
            lambda: not error_alert.is_visible(),
            wait=page.wait_for_timeout,
            description=f'no blocking error alert after {description}',
        )
        page.wait_for_timeout(500)

    # Take screenshot
    page.screenshot(path='/mnt/user-data/outputs/static_page.png', full_page=True)

    # Interact with elements
    run_ui_action(
        page.get_by_text('Click Me'),
        lambda: page.get_by_text('Click Me').click(),
        'Click Me control',
    )
    run_ui_action(
        page.locator('#name'),
        lambda: page.locator('#name').fill('John Doe'),
        'name field',
    )
    run_ui_action(
        page.locator('#email'),
        lambda: page.locator('#email').fill('john@example.com'),
        'email field',
    )

    # Submit form
    run_ui_action(
        page.locator('button[type="submit"]'),
        lambda: page.locator('button[type="submit"]').click(),
        'submit control',
    )

    # Take final screenshot
    page.screenshot(path='/mnt/user-data/outputs/after_submit.png', full_page=True)

    browser.close()

print("Static HTML automation completed!")
