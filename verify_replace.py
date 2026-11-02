"""Verifies the replaced App.tsx and the native-print plugin changes."""

import sys

from playwright.sync_api import sync_playwright

URL = "http://localhost:1420/"
ANDROID_UA = (
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
)

results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" - {detail}" if detail else ""))


def load_sample(page):
    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    sample = page.get_by_text("Try the sample", exact=False).first
    if sample.count() == 0:
        sample = page.locator("text=sample").first
    sample.click()
    page.wait_for_timeout(4000)


with sync_playwright() as p:
    browser = p.chromium.launch(args=["--no-sandbox"])

    # --------------------------------------------------------------- web
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_timeout(2000)
    check("web: start screen renders", page.locator(".start-screen, .start-inner").count() > 0)

    load_sample(page)
    check("web: viewer loads the sample", page.locator("#pdf-viewer").count() > 0)

    # The toolbar button is icon-only, so it is found by its id, not by text.
    check(
        "web: viewer toolbar has Print",
        page.locator("#pdf-viewer_print").count() > 0
        and page.locator("#pdf-viewer_print").is_visible(),
    )
    check("web: no runtime errors", not errors, "; ".join(errors[:3]))

    # ---------------------------------------------------------- desktop
    ctx2 = browser.new_context(
        viewport={"width": 1280, "height": 800},
        user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    )
    page2 = ctx2.new_page()
    errors2 = []
    page2.on("pageerror", lambda e: errors2.append(str(e)))
    load_sample(page2)
    check("desktop: viewer loads", page2.locator("#pdf-viewer").count() > 0)
    check(
        "desktop: Print available in the toolbar",
        page2.locator("#pdf-viewer_print").count() > 0
        and page2.locator("#pdf-viewer_print").is_visible(),
    )
    check("desktop: no runtime errors", not errors2, "; ".join(errors2[:3]))

    # ----------------------------------------------------------- mobile
    ctx3 = browser.new_context(
        viewport={"width": 412, "height": 915},
        user_agent=ANDROID_UA,
        is_mobile=True,
        has_touch=True,
        device_scale_factor=2.625,
    )
    page3 = ctx3.new_page()
    errors3 = []
    page3.on("pageerror", lambda e: errors3.append(str(e)))
    load_sample(page3)

    rail_items = page3.locator(".rail-phone .rail-item").count()
    check("mobile: phone rail renders 5 items", rail_items == 5, f"count={rail_items}")

    more = page3.locator(".rail-phone .rail-item", has_text="More")
    if more.count():
        more.first.click()
        page3.wait_for_timeout(800)
        sheet = page3.locator(".more-sheet").inner_text() if page3.locator(".more-sheet").count() else ""
        check("mobile: More sheet has no Print", "Print" not in sheet, sheet.replace("\n", "|"))
        check("mobile: More sheet has Organize", "Organize" in sheet, sheet.replace("\n", "|"))
    else:
        check("mobile: More button found", False, "no More item in the phone rail")

    check("mobile: no runtime errors", not errors3, "; ".join(errors3[:3]))

    browser.close()

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
