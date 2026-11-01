#!/usr/bin/env python3
"""Builds the three page sample document used by the app.

Page 1  text
Page 2  floor plan
Page 3  form

The PDF is written by hand so the repository stays free of extra packages.
"""

import zlib
from pathlib import Path

PAGE_WIDTH = 595
PAGE_HEIGHT = 842

CONTENT = []


def add_text(x, y, size, text, font="F1"):
    escaped = text.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")
    CONTENT.append(
        "BT /%s %d Tf 1 0 0 1 %d %d Tm (%s) Tj ET" % (font, size, x, y, escaped)
    )


def add_line(x1, y1, x2, y2, width=1):
    CONTENT.append(
        "%d w %d %d m %d %d l S" % (width, x1, y1, x2, y2)
    )


def add_rect(x, y, width, height, line_width=1):
    CONTENT.append(
        "%d w %d %d %d %d re S" % (line_width, x, y, width, height)
    )


def add_fill_rect(x, y, width, height, gray=0.9):
    CONTENT.append("%.3f g %d %d %d %d re f 0 g" % (gray, x, y, width, height))


def build_page_text():
    add_text(60, 740, 28, "Syncfusion PDF Editor")
    add_line(60, 730, 535, 730, 2)

    body = [
        "The Syncfusion PDF Viewer is a lightweight and modular component",
        "for viewing and printing PDF files. It provides the best viewing",
        "experience with core interactions such as zooming, scrolling, text",
        "searching, text selection and text copying. The thumbnail, bookmark,",
        "hyperlink and table of contents support provides easy navigation",
        "within and outside the PDF files.",
    ]
    y = 690
    for line in body:
        add_text(60, y, 12, line)
        y -= 18

    add_text(60, y - 20, 20, "Annotations")
    add_line(60, y - 30, 535, y - 30, 2)

    paragraphs = [
        "This document is generated with Syncfusion PDF Viewer with all the",
        "annotations created programmatically. The annotations provide an",
        "extra information that is associated with a particular point in a",
        "document or other piece of information. The annotations that are",
        "associated programmatically can be modified at the UI.",
    ]
    y -= 70
    for line in paragraphs:
        add_text(60, y, 12, line)
        y -= 18

    add_text(60, y - 20, 16, "Text Markup Annotation")
    y -= 60
    add_text(60, y, 12, "Highlight Text")
    y -= 30
    add_text(60, y, 12, "Highlight text while loading a document in the PDF Viewer.")
    y -= 30
    add_text(60, y, 12, "Underline Text")
    y -= 30
    add_text(60, y, 12, "Underline text while loading a document in the PDF Viewer.")


def build_page_floor_plan():
    add_text(60, 740, 22, "Floor plan")
    add_line(60, 730, 535, 730, 2)

    # Outer walls.
    add_rect(70, 120, 455, 540, 3)

    # Interior partitions.
    add_line(250, 120, 250, 420, 2)
    add_line(250, 520, 525, 520, 2)
    add_line(385, 520, 385, 660, 2)
    add_line(70, 420, 170, 420, 2)
    add_line(170, 300, 250, 300, 2)

    # Doors.
    CONTENT.append("2 w 170 420 m 170 385 l S")
    CONTENT.append("2 w 250 420 m 285 420 l S")
    CONTENT.append("2 w 385 520 m 385 485 l S")

    # Windows.
    for x in (110, 200, 300, 440):
        CONTENT.append("3 w %d 660 m %d 660 l S" % (x, x + 50))

    # Rooms.
    add_text(95, 620, 14, "Office")
    add_text(280, 600, 14, "Meeting room")
    add_text(95, 510, 14, "Lobby")
    add_text(95, 380, 14, "Reception")
    add_text(280, 250, 14, "Studio")
    add_text(410, 250, 14, "Storage")

    # Furniture.
    add_rect(95, 630, 70, 40)
    add_rect(300, 570, 90, 60)
    add_fill_rect(285, 160, 80, 90)
    add_rect(410, 160, 90, 50)


def build_page_form():
    add_text(60, 740, 22, "Membership form")
    add_line(60, 730, 535, 730, 2)
    add_text(60, 700, 11, "Fill the form fields and add a signature in the Fill & Sign mode.")

    fields = [
        ("Full name", 650),
        ("Email address", 605),
        ("Phone number", 560),
        ("Membership plan", 515),
    ]

    for label, y in fields:
        add_text(60, y, 12, label)
        add_rect(200, y - 5, 320, 24, 1)
        CONTENT.append(
            "BT /F1 11 Tf 1 0 0 1 208 %d Tm () Tj ET" % (y + 2)
        )

    add_text(60, 460, 12, "Signature")
    add_rect(200, 425, 320, 60, 1)
    add_text(208, 435, 18, "Sign here", "F2")

    add_text(60, 380, 12, "Comments")
    add_rect(200, 330, 320, 40, 1)

    add_text(60, 290, 12, "Preferred contact method")
    add_rect(200, 275, 18, 18, 1)
    add_text(228, 279, 12, "Email")
    add_rect(300, 275, 18, 18, 1)
    add_text(328, 279, 12, "Phone")


def make_content_stream():
    return "\n".join(CONTENT).encode("latin-1")


def build_pdf(pages):
    objects = []

    def add_object(body):
        objects.append(body)
        return len(objects)

    catalog_id = add_object(b"")  # placeholder, filled below
    pages_id = add_object(b"")
    font_regular = add_object(
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
    )
    font_bold = add_object(
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
    )

    page_ids = []
    for content in pages:
        stream = zlib.compress(content)
        content_id = add_object(
            b"<< /Length %d /Filter /FlateDecode >>\nstream\n" % len(stream)
            + stream
            + b"\nendstream"
        )
        page_id = add_object(
            (
                "<< /Type /Page /Parent %d 0 R /MediaBox [0 0 %d %d] "
                "/Resources << /Font << /F1 %d 0 R /F2 %d 0 R >> >> "
                "/Contents %d 0 R >>"
                % (pages_id, PAGE_WIDTH, PAGE_HEIGHT, font_regular, font_bold, content_id)
            ).encode("latin-1")
        )
        page_ids.append(page_id)

    objects[catalog_id - 1] = (
        "<< /Type /Catalog /Pages %d 0 R >>" % pages_id
    ).encode("latin-1")
    objects[pages_id - 1] = (
        "<< /Type /Pages /Count %d /Kids [%s] >>"
        % (len(page_ids), " ".join("%d 0 R" % pid for pid in page_ids))
    ).encode("latin-1")

    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += ("%d 0 obj\n" % index).encode("latin-1")
        out += body
        out += b"\nendobj\n"

    xref_offset = len(out)
    out += ("xref\n0 %d\n" % (len(objects) + 1)).encode("latin-1")
    out += b"0000000000 65535 f \n"
    for offset in offsets[1:]:
        out += ("%010d 00000 n \n" % offset).encode("latin-1")
    out += (
        "trailer\n<< /Size %d /Root %d 0 R >>\nstartxref\n%d\n%%%%EOF\n"
        % (len(objects) + 1, catalog_id, xref_offset)
    ).encode("latin-1")

    return bytes(out)


def main():
    root = Path(__file__).resolve().parent.parent / "public"

    CONTENT.clear()
    build_page_text()
    text_page = make_content_stream()

    CONTENT.clear()
    build_page_floor_plan()
    plan_page = make_content_stream()

    CONTENT.clear()
    build_page_form()
    form_page = make_content_stream()

    sample = build_pdf([text_page, plan_page, form_page])
    (root / "sample.pdf").write_bytes(sample)

    # The second sample is a changed copy of the first one, used by the
    # Compare sample pair.
    CONTENT.clear()
    build_page_text()
    add_text(60, 120, 12, "Revised: the welcome paragraph was updated on the next release.")
    changed_page = make_content_stream()

    changed = build_pdf([changed_page, plan_page, form_page])
    (root / "sample-v2.pdf").write_bytes(changed)

    print("sample.pdf", len(sample), "bytes")
    print("sample-v2.pdf", len(changed), "bytes")


if __name__ == "__main__":
    main()
