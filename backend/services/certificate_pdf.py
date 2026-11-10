"""
backend/services/certificate_pdf.py

Certificate PDF rendering with an embedded verification QR code.

The QR encodes the public verification URL so anyone holding the printed
certificate can scan it and land on /certificates/verify/{code}.
"""
from __future__ import annotations

import base64
import io
from typing import Optional

import qrcode
from fpdf import FPDF

# Brand palette — matches the platform's violet identity.
BRAND = (124, 58, 237)      # #7C3AED
BRAND_DEEP = (91, 33, 182)   # #5B21B6
INK = (17, 24, 39)          # #111827
MUTED = (107, 114, 128)     # #6B7280
HAIRLINE = (229, 231, 235)  # #E5E7EB
PAPER = (255, 255, 255)


def qr_png_bytes(data: str, box_size: int = 6, border: int = 2) -> bytes:
    """Render `data` as a PNG QR code."""
    qr = qrcode.QRCode(
        version=None,
        box_size=box_size,
        border=border,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def qr_data_uri(data: str, box_size: int = 6, border: int = 2) -> str:
    """Render `data` as a base64 data URI for inline HTML embedding."""
    raw = qr_png_bytes(data, box_size=box_size, border=border)
    return "data:image/png;base64," + base64.b64encode(raw).decode("utf-8")


def _sanitize(value: Optional[str], max_len: int = 90) -> str:
    """fpdf's core fonts are Latin-1 only; drop anything unrepresentable."""
    text = (value or "").strip()
    text = "".join(ch for ch in text if ch.isprintable())
    return text[:max_len]


def render_certificate_pdf(
    *,
    recipient_name: str,
    title: str,
    issuer: str,
    verification_code: str,
    verify_url: str,
    issued_at: Optional[str] = None,
    extra_lines: Optional[list] = None,
) -> bytes:
    """Render an A4 landscape certificate PDF and return the raw bytes."""
    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=False)
    pdf.add_page()

    width, height = pdf.w, pdf.h

    # Page background + outer frame
    pdf.set_fill_color(*PAPER)
    pdf.rect(0, 0, width, height, "F")
    pdf.set_draw_color(*BRAND)
    pdf.set_line_width(1.2)
    pdf.rect(10, 10, width - 20, height - 20)
    pdf.set_draw_color(*HAIRLINE)
    pdf.set_line_width(0.3)
    pdf.rect(13, 13, width - 26, height - 26)

    # Accent bar along the top of the frame
    pdf.set_fill_color(*BRAND)
    pdf.rect(13, 13, width - 26, 2.2, "F")

    # Header band
    pdf.set_fill_color(248, 245, 255)
    pdf.rect(13, 15.2, width - 26, 20, "F")
    pdf.set_xy(13, 19)
    pdf.set_font("Helvetica", "B", 15)
    pdf.set_text_color(*BRAND)
    pdf.cell(width - 26, 8, "STUDENT ALUMNI", align="C")
    pdf.set_xy(13, 26)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(*MUTED)
    pdf.cell(width - 26, 6, "Certificate of Achievement", align="C")

    # Title
    pdf.set_xy(20, 44)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*MUTED)
    pdf.cell(width - 40, 6, "THIS IS TO CERTIFY THAT", align="C")

    # Recipient name
    pdf.set_xy(20, 52)
    pdf.set_font("Helvetica", "B", 26)
    pdf.set_text_color(*INK)
    pdf.cell(width - 40, 14, _sanitize(recipient_name, 60), align="C")

    # Underline under the name
    name_w = pdf.get_string_width(_sanitize(recipient_name, 60))
    pdf.set_draw_color(*BRAND)
    pdf.set_line_width(0.5)
    pdf.line((width - name_w) / 2, 67.5, (width + name_w) / 2, 67.5)

    # Body copy
    pdf.set_xy(20, 71)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*MUTED)
    pdf.cell(width - 40, 6, "has successfully completed", align="C")

    # Certificate title
    pdf.set_xy(20, 78)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*BRAND_DEEP)
    pdf.cell(width - 40, 10, _sanitize(title, 70), align="C")

    # Extra detail lines
    y = 92
    if extra_lines:
        pdf.set_font("Helvetica", "", 9.5)
        pdf.set_text_color(*MUTED)
        for line in extra_lines:
            pdf.set_xy(20, y)
            pdf.cell(width - 40, 6, _sanitize(line, 120), align="C")
            y += 6.5

    # Footer: issuer + date on the left, QR on the right
    footer_y = height - 40

    pdf.set_xy(24, footer_y)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*INK)
    pdf.cell(90, 6, _sanitize(issuer, 60))
    pdf.set_xy(24, footer_y + 6.5)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*MUTED)
    pdf.cell(90, 5, f"Issued: {_sanitize(issued_at, 40)}" if issued_at else "Issued by the platform")

    pdf.set_xy(24, footer_y + 12.5)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(*BRAND)
    pdf.cell(90, 5, f"Verification Code: {_sanitize(verification_code, 40)}")

    # QR (28mm square) bottom-right
    qr_size = 28
    qr_x = width - 24 - qr_size
    qr_y = footer_y - 2
    pdf.image(qr_png_bytes(verify_url), x=qr_x, y=qr_y, w=qr_size, h=qr_size)
    pdf.set_draw_color(*HAIRLINE)
    pdf.set_line_width(0.3)
    pdf.rect(qr_x, qr_y, qr_size, qr_size)

    pdf.set_xy(qr_x - 26, qr_y + qr_size + 1.5)
    pdf.set_font("Helvetica", "", 7.5)
    pdf.set_text_color(*MUTED)
    pdf.cell(qr_size + 26, 5, "Scan to verify", align="C")

    return bytes(pdf.output())
