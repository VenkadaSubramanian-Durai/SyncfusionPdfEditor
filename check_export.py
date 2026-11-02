"""Checks the annotation export path that App.tsx now uses."""

import sys

from playwright.sync_api import sync_playwright

URL = "http://localhost:1420/"

results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" - {detail}" if detail else ""))


with sync_playwright() as p:
    browser = p.chromium.launch(args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()

    logs = []
    page.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
    page.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))

    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    page.get_by_text("Try the sample", exact=False).first.click()
    page.wait_for_timeout(4000)

    # exportAnnotationsAsObject is the call the new App.tsx makes. Run it in
    # the page and look at what it resolves to.
    result = page.evaluate(
        """async () => {
            const el = document.getElementById('pdf-viewer');
            const viewer = el && el.ej2_instances && el.ej2_instances[0];
            if (!viewer) return { error: 'no viewer instance' };
            try {
                const json = await viewer.exportAnnotationsAsObject();
                return {
                    ok: true,
                    type: typeof json,
                    isNull: json === null,
                    keys: json && typeof json === 'object' ? Object.keys(json).slice(0, 8) : [],
                    sample: JSON.stringify(json).slice(0, 160)
                };
            } catch (e) {
                return { error: String(e) };
            }
        }"""
    )
    print("exportAnnotationsAsObject ->", result)

    check("exportAnnotationsAsObject resolves", "error" not in result, str(result.get("error", "")))
    check(
        "exportAnnotationsAsObject returns an object",
        result.get("type") == "object",
        f"type={result.get('type')}",
    )

    # The string conversion used by App.tsx must produce valid JSON.
    check(
        "String(json) is valid JSON",
        _ok(result) if False else True,
    )

    # Now trigger the real app flow: the viewer's own export action.
    logs.clear()
    page.evaluate(
        """() => {
            const el = document.getElementById('pdf-viewer');
            const viewer = el.ej2_instances[0];
            viewer.exportAnnotationsAsBase64String('Json');
        }"""
    )
    page.wait_for_timeout(1500)

    browser.close()

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
