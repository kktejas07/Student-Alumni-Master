"""
Professional certificate email templates (table-based for broad email-client support).

Used by certificates.py (import dispatch) and echo_showcase.py (per-cert ECHO emails).
All styles are inline + table layout so Gmail/Outlook/webmail render consistently.
"""

BRAND = "StudentAlumni"
BRAND_PURPLE = "#7C5CFC"
BRAND_DARK = "#0B0B14"
CARD_BG = "#151526"
BORDER = "#2A2A3E"
TEXT = "#EDEDF5"
MUTED = "#9A9AB0"
GREEN = "#10B981"


def _style_scope():
    return {
        "card_bg": CARD_BG, "border": BORDER, "text": TEXT, "muted": MUTED,
        "accent": BRAND_PURPLE, "green": GREEN,
    }


def _render_cert_rows(certificates: list) -> str:
    """Render one card per certificate (title / code / verify link)."""
    rows = ""
    for idx, c in enumerate(certificates, start=1):
        rows += f"""
        <tr>
          <td style="padding:14px 16px;border:1px solid {BORDER};border-radius:10px;background:{CARD_BG};vertical-align:top;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:{TEXT};">{idx}. {c.get('title') or 'Official Certificate'}</td>
              </tr>
              <tr>
                <td style="padding-top:4px;font-family:Consolas,Menlo,monospace;font-size:12px;color:{MUTED};">Code: {c.get('code') or ''}</td>
              </tr>
              <tr>
                <td style="padding-top:10px;">
                  <a href="{c.get('verify_url') or '#'}" style="display:inline-block;background:{BRAND_PURPLE};color:#FFFFFF;text-decoration:none;padding:10px 22px;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;">Verify &amp; Download &rarr;</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:10px;font-size:0;">&nbsp;</td></tr>"""
    return rows


def render_view_email(recipient_name: str, certificates: list, extra_note: str = "") -> str:
    """Existing-account email: your certificates are ready."""
    s = _style_scope()
    rows = _render_cert_rows(certificates)
    note = extra_note or "Your certificates are live now — log in to My Certificates to view, download, and share them anytime."
    return f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:{BRAND_DARK};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{BRAND_DARK}" style="background:{BRAND_DARK};">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td align="center" style="padding:24px 24px 8px;">
            <span style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#FFFFFF;">
              <span style="color:{BRAND_PURPLE};">{BRAND}</span>
            </span>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:0 24px 20px;">
            <span style="display:inline-block;width:48px;height:3px;background:{BRAND_PURPLE};border-radius:2px;">&nbsp;</span>
          </td>
        </tr>
        <!-- Hero -->
        <tr>
          <td align="center" style="padding:8px 24px 4px;">
            <span style="display:inline-block;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);padding:6px 14px;border-radius:20px;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:{GREEN};">&#10003; Certificates Delivered</span>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:12px 24px 4px;">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;color:{TEXT};">Your Certificates Are Ready</span>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:4px 24px 16px;">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:{MUTED};line-height:22px;">
              Hi <strong style="color:{TEXT};">{recipient_name}</strong>,<br/>
              {len(certificates)} official certificate(s) were issued to you and registered on the {BRAND} verifiable credentials ledger.
            </span>
          </td>
        </tr>
        <!-- Certs -->
        <tr><td style="padding:4px 24px;">{rows}</td></tr>
        <!-- Note -->
        <tr>
          <td align="center" style="padding:16px 24px;">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:{MUTED};line-height:20px;">{note}</span>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td align="center" style="padding:16px 24px 28px;border-top:1px solid {BORDER};">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:{MUTED};line-height:18px;">
              {BRAND} &middot; Connecting Students, Alumni &amp; Mentors<br/>
              This is an automated message. Please do not reply to this email.
            </span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""


def render_claim_email(recipient_name: str, email: str, certificates: list, register_link: str) -> str:
    """Missing-account email: create an account to claim."""
    s = _style_scope()
    rows = _render_cert_rows(certificates)
    return f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:{BRAND_DARK};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{BRAND_DARK}" style="background:{BRAND_DARK};">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <tr>
          <td align="center" style="padding:24px 24px 8px;">
            <span style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#FFFFFF;">
              <span style="color:{BRAND_PURPLE};">{BRAND}</span>
            </span>
          </td>
        </tr>
        <tr><td align="center" style="padding:0 24px 20px;"><span style="display:inline-block;width:48px;height:3px;background:{BRAND_PURPLE};">&nbsp;</span></td></tr>
        <tr>
          <td align="center" style="padding:8px 24px 4px;">
            <span style="display:inline-block;background:rgba(124,92,252,0.15);border:1px solid rgba(124,92,252,0.45);padding:6px 14px;border-radius:20px;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#C4B5FD;">Awaiting Claim</span>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:12px 24px 4px;">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;color:{TEXT};">Claim Your Certificates</span>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:4px 24px 16px;">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:{MUTED};line-height:22px;">
              Hi <strong style="color:{TEXT};">{recipient_name}</strong>,<br/>
              {len(certificates)} official certificate(s) were issued to <strong style="color:{TEXT};">{email}</strong>.
              Create your free {BRAND} account to claim, download, and share them.
            </span>
          </td>
        </tr>
        <tr><td style="padding:4px 24px;">{rows}</td></tr>
        <tr>
          <td align="center" style="padding:20px 24px;">
            <a href="{register_link}" style="display:inline-block;background:{BRAND_PURPLE};color:#FFFFFF;text-decoration:none;padding:14px 34px;border-radius:10px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">Create Account &amp; Claim &rarr;</a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:16px 24px 28px;border-top:1px solid {BORDER};">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:{MUTED};line-height:18px;">
              {BRAND} &middot; Connecting Students, Alumni &amp; Mentors<br/>
              This is an automated message. Please do not reply to this email.
            </span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""


def render_single_cert_email(recipient_name: str, title: str, code: str, verify_url: str, idx: int, total: int) -> str:
    """Individual per-certificate email (1 of N)."""
    return render_view_email(
        recipient_name,
        [{"title": title, "code": code, "verify_url": verify_url}],
        extra_note=f"Certificate {idx} of {total} has been issued. The rest are on their way." if total > 1 else "This certificate is live now — log in to My Certificates to view and download it anytime.",
    )