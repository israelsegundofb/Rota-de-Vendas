from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating to login page...")
        page.goto("http://localhost:3000/Rota-de-Vendas/")

        # Wait for login form
        print("Waiting for login inputs...")
        page.get_by_placeholder("Digite seu usuário").fill("vendedor_a")
        page.get_by_placeholder("••••••").fill("123")

        print("Logging in...")
        page.get_by_role("button", name="Entrar").click()

        # Wait for map or dashboard to load.
        print("Waiting for dashboard/map...")
        page.wait_for_timeout(3000)

        # Navigate to Client List view
        print("Navigating to List View...")
        page.get_by_role("button", name="Listagem de Dados").click()

        # Wait for list to load
        page.wait_for_timeout(2000)

        # Click "Novo" button to add a client
        print("Clicking 'Novo'...")
        page.get_by_role("button", name="Novo").click()

        # Fill Add Client Modal
        print("Filling client details...")
        # Required fields
        page.get_by_placeholder("Nome do estabelecimento").fill("Cliente Teste 1")
        page.get_by_placeholder("(00) 00000-0000").fill("(11) 99999-9999")
        page.get_by_placeholder("Ex: Aldeota").fill("Bela Vista")
        page.get_by_placeholder("Ex: Fortaleza").fill("São Paulo")
        page.get_by_placeholder("Rua, Número, Bairro, CEP...").fill("Av. Paulista, 1000 - São Paulo, SP")

        # Click Salvar
        print("Saving client...")
        page.get_by_role("button", name="Salvar").click()

        # Wait for client to appear in list
        print("Waiting for client to appear...")
        # Expect "Cliente Teste 1" to be visible
        expect(page.get_by_text("Cliente Teste 1")).to_be_visible()

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/client_list_with_card.png")

        browser.close()
        print("Done.")

if __name__ == "__main__":
    run()
