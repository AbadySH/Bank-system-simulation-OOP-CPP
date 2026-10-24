"""UI smoke test against a running server with fresh sample data:
     ./backend/bank-server --data /tmp/ui-data --reset --port 8181
     APP_URL=http://127.0.0.1:8181/ python3 frontend/tests/ui_smoke.py
(needs playwright + chromium; it creates and deletes its own records)"""
import os, sys, re
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = os.environ.get("APP_URL", "http://127.0.0.1:8181/")
SHOTS = os.environ.get("SHOTS", "/tmp/claude-0/shots")
errors, results = [], []

def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    if not cond: print("FAIL:", name, extra)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium", args=["--no-sandbox"]) if os.path.exists("/opt/pw-browsers/chromium") else p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    ctx.route(re.compile(r"https://fonts\.(googleapis|gstatic)\.com/.*"), lambda r: r.abort())
    page = ctx.new_page()
    page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") and "fonts" not in m.text.lower() and "ERR_FAILED" not in m.text and "Failed to load resource" not in m.text else None)
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    shot = lambda n: page.screenshot(path=f"{SHOTS}/{n}.png")

    def login(user, pw):
        page.fill("input[name=username]", user); page.fill("input[name=password]", pw)
        page.click("button[type=submit]"); page.wait_for_timeout(600)

    page.goto(URL); page.wait_for_timeout(2800)
    check("login screen shown", page.locator(".login__h").inner_text() == "Sign in")
    shot("01-login")

    # --- lockout after 3 failures
    for i in range(3): login("Ghost", "wrong"); page.wait_for_timeout(500)
    check("lockout message", "Too many wrong attempts" in page.locator(".lock-note").inner_text())
    check("submit disabled while locked", page.locator("button[type=submit]").is_disabled())
    shot("02-locked")
    page.reload(); page.wait_for_timeout(600)

    # --- empty + wrong first
    page.click("button[type=submit]")
    check("empty username error", "Enter your user name" in page.locator(".field__msg--error").first.inner_text())
    login("User2", "nope")
    check("attempts left shown", "2 attempts left" in page.locator(".field__msg--error").inner_text())

    # --- demo account helper + success
    page.click("summary:has-text('demo account')"); page.locator(".demo__user", has_text="User2").get_by_role("button").click()
    check("demo fills form", page.input_value("input[name=username]") == "User2" and page.input_value("input[name=password]") == "3456")
    page.click("button[type=submit]"); page.wait_for_selector(".sidebar")
    page_ready = None
    check("overview after login", "Good" in page.locator("#page-title").inner_text() or "Working" in page.locator("#page-title").inner_text())
    check("stats show total", "$" in page.locator(".stat--lead .stat__value").inner_text())
    shot("03-overview")

    # --- client list + search
    page.click("a.nav__item[data-path=clients]"); page.wait_for_selector(".table")
    check("11 clients", page.locator("tbody tr").count() == 11)
    page.fill("input[name=q]", "khal"); page.wait_for_timeout(500)
    check("search filters", page.locator("tbody tr").count() == 1)
    page.fill("input[name=q]", "zzzz"); page.wait_for_timeout(500)
    check("empty search state", "No client matches" in page.locator(".empty__title").inner_text())
    page.fill("input[name=q]", ""); page.wait_for_timeout(500)
    shot("04-clients")

    # --- add client: invalid then valid
    page.goto(URL + "#/clients/add"); page.wait_for_selector("form")
    page.click("button:has-text('Save client')")
    check("add shows several errors", page.locator(".field--invalid").count() >= 5, page.locator(".field--invalid").count())
    shot("05-add-errors")
    page.fill("input[name=account]", "A101"); page.wait_for_timeout(600)
    check("duplicate account flagged live", "already used" in page.locator(".field--invalid .field__msg").first.inner_text())
    page.fill("input[name=account]", "N500"); page.wait_for_timeout(600)
    check("available flagged", page.locator(".field--valid").count() == 1)
    page.fill("input[name=pin]", "9876"); page.fill("input[name=first]", "Nora"); page.fill("input[name=last]", "<b>Hassan</b>")
    page.fill("input[name=email]", "nora@example.com"); page.fill("input[name=phone]", "+20 100 555 1234"); page.fill("input[name=balance]", "250")
    page.click("button:has-text('Save client')"); page.wait_for_selector("text=Client added")
    check("client added card", "N500" in page.locator(".pcard").inner_text())
    check("html not injected", page.locator(".pcard b").count() == 1 and "<b>Hassan</b>" in page.locator(".pcard__name").inner_text())

    # --- deposit with receipt
    page.goto(URL + "#/transactions/deposit?acc=N500"); page.wait_for_selector(".pcard")
    check("deposit prefilled", "Nora" in page.locator(".pcard").inner_text())
    page.fill("input[name=amount]", "abc"); page.click("button:has-text('Deposit')")
    check("bad amount message", "numbers only" in page.locator(".field__msg--error").inner_text())
    page.fill("input[name=amount]", "100.50"); page.wait_for_timeout(100)
    check("live preview", "$350.50" in page.locator(".preview").inner_text())
    page.click("button:has-text('Deposit')"); page.wait_for_selector("dialog[open]")
    shot("06-confirm")
    page.click("dialog button:has-text('Deposit $100.50')"); page.wait_for_selector(".receipt")
    check("receipt shows new balance", "$350.50" in page.locator(".receipt").inner_text())
    shot("07-receipt")

    # --- withdraw: too much + quick amount
    page.goto(URL + "#/transactions/withdraw?acc=N500"); page.wait_for_selector(".chips")
    check("quick chips above balance disabled", page.locator(".chip[disabled]").count() == 2, page.locator(".chip[disabled]").count())
    page.fill("input[name=amount]", "9999"); page.wait_for_timeout(100)
    check("too-much inline error", "more than" in page.locator(".field__msg--error").inner_text())
    page.click(".chip:not([disabled]) >> nth=2"); page.wait_for_timeout(100)
    check("chip fills amount", page.input_value("input[name=amount]") == "100.00")
    page.click("button:has-text('Withdraw') >> nth=-1"); page.wait_for_selector("dialog[open]")
    page.click("dialog button:has-text('Withdraw $100')"); page.wait_for_selector(".receipt")
    check("withdraw receipt", "$250.50" in page.locator(".receipt").inner_text())

    # --- transfer
    page.goto(URL + "#/transactions/transfer"); page.wait_for_selector("form")
    page.fill("input[name=lookup] >> nth=0", "A101"); page.wait_for_timeout(600)
    page.fill("input[name=lookup] >> nth=1", "A101"); page.wait_for_timeout(600)
    check("same-account blocked", "different account" in page.locator(".field__msg--error").first.inner_text())
    page.fill("input[name=lookup] >> nth=1", "A102"); page.wait_for_timeout(600)
    page.fill("input[name=amount]", "250"); page.wait_for_timeout(100)
    shot("08-transfer")
    page.click("button:has-text('Transfer') >> nth=-1"); page.wait_for_selector("dialog[open]")
    page.click("dialog button:has-text('Transfer $250')"); page.wait_for_selector(".receipt")
    check("transfer receipt both balances", "$20,750.00" in page.locator(".receipt").inner_text() and "$3,497.00" in page.locator(".receipt").inner_text(), page.locator(".receipt").inner_text())

    page.goto(URL + "#/transactions/log"); page.wait_for_selector(".table")
    check("log has 5 rows newest first", page.locator("tbody tr").count() == 5 and "A101" in page.locator("tbody tr").first.inner_text())
    shot("09-log")
    page.goto(URL + "#/transactions/balances"); page.wait_for_selector(".table")
    check("balances total in words", "Dollar" in page.locator(".stat__note").inner_text() or "dollar" in page.locator(".stat__note").inner_text())
    shot("10-balances")

    # --- delete client w/ confirm
    page.goto(URL + "#/clients/delete?acc=N500"); page.wait_for_selector(".pcard")
    page.click("button:has-text('Delete client')"); page.wait_for_selector("dialog[open]")
    check("delete warns about balance", "$250.50" in page.locator("dialog").inner_text())
    page.click("dialog button:has-text('Delete client')"); page.wait_for_timeout(600)
    page.goto(URL + "#/clients"); page.wait_for_selector(".table")
    check("deleted", page.locator("tbody tr").count() == 11)

    # --- update client: legacy data tolerated
    page.goto(URL + "#/clients/update?acc=A07"); page.wait_for_selector("form")
    page.fill("input[name=first]", "Lina2"); page.click("button:has-text('Save changes')"); page.wait_for_selector("dialog[open]")
    page.click("dialog button:has-text('Save changes')"); page.wait_for_timeout(600)
    check("legacy client saved (short pin/phone untouched)", "Lina2" in page.locator(".pcard__name").inner_text())

    # --- currency
    page.goto(URL + "#/currency/calculator"); page.wait_for_selector(".result")
    check("calc result shown", "EUR" in page.locator(".result__big").inner_text())
    page.fill("input[name=amount]", "abc"); page.wait_for_timeout(100)
    check("calc bad input message", "Enter a number" in page.locator(".field__msg--error").inner_text())
    page.fill("input[name=amount]", "250"); page.select_option("select[name=from]", "EGP"); page.wait_for_timeout(100)
    shot("11-calculator")
    page.goto(URL + "#/currency"); page.wait_for_selector(".table"); shot("12-rates")
    page.goto(URL + "#/currency/update"); page.fill("input[name=code]", "eur"); page.wait_for_selector("input[name=rate]")
    check("shared-rate hint", "countries use EUR" in page.locator(".field__hint").nth(1).inner_text())
    page.fill("input[name=rate]", "0.9"); page.click("button:has-text('Update rate')"); page.wait_for_selector("dialog[open]")
    page.click("dialog button:has-text('Update rate')"); page.wait_for_timeout(600)
    check("rate updated text", "0.9" in page.locator(".card__sub").inner_text())
    page.goto(URL + "#/currency/find"); page.fill("input[name=q]", "ZZZ"); page.wait_for_timeout(600)
    check("currency not found message", "No currency has the code" in page.locator(".field__msg--error").inner_text())

    # --- users
    page.goto(URL + "#/users"); page.wait_for_selector(".table"); shot("13-users")
    check("6 users, self marked", page.locator("tbody tr").count() == 6 and "(you)" in page.locator("tbody").inner_text())
    check("no delete button for self", page.locator("button[aria-label='Delete User2']").count() == 0)
    page.goto(URL + "#/users/add"); page.wait_for_selector("form")
    page.click("button:has-text('Save user')")
    check("user form errors + perms msg", page.locator(".field--invalid").count() >= 4)
    page.fill("input[name=username]", "teller1"); page.fill("input[name=password]", "abcd"); page.fill("input[name=first]", "Tina"); page.fill("input[name=last]", "Teller")
    page.fill("input[name=email]", "tina@bank.io"); page.fill("input[name=phone]", "555123")
    page.click("button:has-text('Save user')")
    check("needs a permission", "at least one" in page.locator("[role=alert]").inner_text())
    page.locator(".check", has_text="Transactions").click(); page.locator(".check", has_text="View client list").click()
    shot("14-add-user")
    page.click("button:has-text('Save user')"); page.wait_for_selector("text=User added")
    check("user saved with perms", "Transactions" in page.locator(".pcard").inner_text())
    page.goto(URL + "#/users/delete?user=User2"); page.wait_for_selector(".field--invalid")
    check("cannot delete self", "signed in with" in page.locator(".field__msg--error").inner_text())
    page.goto(URL + "#/login-register"); page.wait_for_selector(".table")
    check("login register newest first shows User2", "User2" in page.locator("tbody tr").first.inner_text())
    page.goto(URL + "#/data"); page.wait_for_selector(".table"); shot("15-data")
    check("data lists 5 files", page.locator("tbody tr").count() == 5)

    # --- sign out, limited user
    page.click("button:has-text('Sign out')"); page.wait_for_selector(".login")
    login("User1", "3456"); page.wait_for_selector(".sidebar")
    check("limited user: locked nav items", page.locator("a.nav__item[data-locked=true]").count() >= 10)
    check("data files hidden for non-admin", page.locator("a.nav__item[data-path=data]").count() == 0)
    page.click("a.nav__item[data-path=clients]"); page.wait_for_selector(".denied")
    check("access denied page", "Access denied" in page.locator(".denied").inner_text())
    shot("16-denied"); page.goto(URL + "#/data"); page.wait_for_selector(".denied")
    check("data route denied for non-admin", True)
    page.goto(URL + "#/home"); page.wait_for_selector(".stats")
    check("overview hides locked stats", page.locator(".stat--locked").count() == 3)
    shot("17-overview-limited")
    page.goto(URL + "#/nonsense"); page.wait_for_selector(".denied")
    check("404 page", "not found" in page.locator(".denied").inner_text().lower())

    # --- mobile
    page.click("button:has-text('Sign out')"); page.wait_for_selector(".login")
    m = ctx.new_page(); m.set_viewport_size({"width": 390, "height": 844})
    m.on("pageerror", lambda e: errors.append(f"mobile pageerror: {e}"))
    m.goto(URL); m.wait_for_timeout(2800); m.screenshot(path=f"{SHOTS}/20-m-login.png")
    m.fill("input[name=username]", "User2"); m.fill("input[name=password]", "3456"); m.click("button[type=submit]"); m.wait_for_selector(".topbar")
    check("no horizontal scroll (overview)", m.evaluate("document.documentElement.scrollWidth <= window.innerWidth"))
    m.screenshot(path=f"{SHOTS}/21-m-overview.png")
    m.click(".topbar__menu"); m.wait_for_timeout(600); m.screenshot(path=f"{SHOTS}/22-m-drawer.png")
    m.click("a.nav__item[data-path=clients]"); m.wait_for_selector(".table"); m.wait_for_timeout(200)
    check("drawer closes on nav", m.locator(".app").get_attribute("data-nav-open") == "false")
    check("no horizontal scroll (clients)", m.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), m.evaluate("document.documentElement.scrollWidth"))
    m.screenshot(path=f"{SHOTS}/23-m-clients.png")
    for route in ["transactions/transfer", "users/add", "currency/calculator", "transactions/log"]:
        m.goto(URL + "#/" + route); m.wait_for_timeout(500)
        check(f"no horizontal scroll ({route})", m.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), m.evaluate("document.documentElement.scrollWidth"))
    m.goto(URL + "#/transactions/transfer"); m.wait_for_timeout(500); m.screenshot(path=f"{SHOTS}/24-m-transfer.png")
    b.close()

bad = [n for n, ok in results if not ok]
print(f"{len(results) - len(bad)}/{len(results)} UI checks passed")
if errors:
    print("Console/page errors:"); [print("  ", e) for e in dict.fromkeys(errors)]
sys.exit(1 if bad or errors else 0)
