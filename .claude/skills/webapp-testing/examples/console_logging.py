from playwright.sync_api import sync_playwright
from wait_until import wait_until

# Example: Capturing console logs during browser automation

url = 'http://localhost:5173'  # Replace with your URL

console_logs = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})

    # Set up console log capture
    def handle_console_message(msg):
        console_logs.append(f"[{msg.type}] {msg.text}")
        print(f"Console: [{msg.type}] {msg.text}")

    page.on("console", handle_console_message)

    # Navigate to page
    page.goto(url)
    page.wait_for_load_state('networkidle')

    # Interact with the page (triggers console logs) through observe → act → observe.
    dashboard = page.get_by_text('Dashboard')
    error_alert = page.get_by_role('alert')
    wait_until(
        lambda: dashboard.is_visible() and dashboard.is_enabled(),
        wait=page.wait_for_timeout,
        description='Dashboard control is visible and enabled',
    )
    wait_until(
        lambda: not error_alert.is_visible(),
        wait=page.wait_for_timeout,
        description='no blocking error alert before Dashboard action',
    )
    dashboard.click()
    wait_until(
        lambda: not error_alert.is_visible(),
        wait=page.wait_for_timeout,
        description='no blocking error alert after Dashboard action',
    )
    page.wait_for_timeout(500)

    browser.close()

# Save console logs to file
with open('/mnt/user-data/outputs/console.log', 'w') as f:
    f.write('\n'.join(console_logs))

print(f"\nCaptured {len(console_logs)} console messages")
print(f"Logs saved to: /mnt/user-data/outputs/console.log")
