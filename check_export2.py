"""Compares the annotation export return values with and without annotations."""

from playwright.sync_api import sync_playwright

URL = "http://localhost:1420/"


def call(page, expr):
    return page.evaluate(
        """async (expr) => {
            const el = document.getElementById('pdf-viewer');
            const viewer = el.ej2_instances[0];
            try {
                const v = await eval(expr);
                return { ok: true, type: typeof v, isNull: v === null,
                         len: typeof v === 'string' ? v.length : null,
                         sample: String(v).slice(0, 140) };
            } catch (e) {
                return { error: String(e) };
            }
        }""",
        expr,
    )


with sync_playwright() as p:
    browser = p.chromium.launch(args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()

    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    page.get_by_text("Try the sample", exact=False).first.click()
    page.wait_for_timeout(4000)

    print("=== no annotations ===")
    print("asObject :", call(page, "viewer.exportAnnotationsAsObject()"))
    print("asBase64 :", call(page, "viewer.exportAnnotationsAsBase64String('Json')"))

    # Store an annotation directly in the viewer's collection.
    added = page.evaluate(
        """() => {
            const el = document.getElementById('pdf-viewer');
            const viewer = el.ej2_instances[0];
            const vb = viewer.viewerBase;
            const annotation = {
                type: 'Comment',
                bounds: [100, 100, 200, 140],
                note: 'test note',
                author: 'tester',
                name: 'Comment',
                modifiedDate: new Date(),
                isComment: true,
                annotationSettings: { fillColor: '', strokeColor: '', opacity: 1 },
                pageIndex: 0
            };
            try {
                vb.annotationModule.storeAnnotationCollections(annotation, 0);
                return { ok: true };
            } catch (e) {
                return { error: String(e) };
            }
        }"""
    )
    print("\nstore annotation ->", added)
    page.wait_for_timeout(1000)

    print("\n=== after adding an annotation ===")
    print("asObject :", call(page, "viewer.exportAnnotationsAsObject()"))
    print("asBase64 :", call(page, "viewer.exportAnnotationsAsBase64String('Json')"))

    browser.close()
