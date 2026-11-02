"""Checks where the Print option lives in the viewer toolbar."""

from playwright.sync_api import sync_playwright

URL = "http://localhost:1420/"


def dump(page, label):
    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    sample = page.get_by_text("Try the sample", exact=False).first
    sample.click()
    page.wait_for_timeout(4000)

    print(f"\n===== {label} =====")
    # Every element whose id or class mentions print.
    found = page.evaluate(
        """() => {
            const out = [];
            document.querySelectorAll('[id*="print" i], [class*="print" i], [title*="print" i], [aria-label*="print" i]')
              .forEach((el) => {
                  const cs = getComputedStyle(el);
                  out.push({
                      tag: el.tagName,
                      id: el.id,
                      cls: el.className && el.className.toString().slice(0, 90),
                      title: el.getAttribute('title'),
                      aria: el.getAttribute('aria-label'),
                      display: cs.display,
                      visibility: cs.visibility,
                      text: (el.innerText || '').trim().slice(0, 40)
                  });
              });
            return out;
        }"""
    )
    for item in found:
        print(item)

    print("--- toolbar item ids ---")
    ids = page.evaluate(
        """() => Array.from(document.querySelectorAll('#pdf-viewer .e-toolbar-item, #pdf-viewer .e-toolbar button, #pdf-viewer .e-toolbar .e-btn'))
                    .map((el) => el.id || el.className.toString().slice(0, 60))"""
    )
    print(ids)


with sync_playwright() as p:
    browser = p.chromium.launch(args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    dump(page, "desktop 1280")
    browser.close()
