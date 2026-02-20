from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:3000/Rota-de-Vendas/")

        print("Waiting for content...")
        # Wait for login screen or loading
        try:
            page.wait_for_selector("text=Login", timeout=10000)
            print("Login screen detected.")
        except:
            print("Login screen not detected, maybe loading or already logged in (unlikely).")
            # Maybe it's loading?
            if page.locator("text=Carregando").count() > 0:
                 print("Still loading...")

        # Take screenshot
        screenshot_path = "verification_screenshot.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    run()
