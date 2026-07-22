"""
Professional email templates for StudentAlumni platform.

Brand: dark navy (#080B12) + violet (#8B5CF6)
"""

from typing import Optional

BRAND = {
    "bg": "#080B12",
    "bg2": "#0D1326",
    "card": "rgba(255,255,255,0.03)",
    "border": "rgba(255,255,255,0.06)",
    "text": "#F4F4F8",
    "text2": "#A1A6B7",
    "text3": "#6E7388",
    "primary": "#8B5CF6",
    "primaryD": "#7C3AED",
    "primaryL": "#A78BFA",
    "accent": "#10B981",
    "secondary": "#3B82F6",
    "amber": "#F59E0B",
    "rose": "#f43f5e",
    "name": "StudentAlumni",
    "logo_url": "https://studentalumni.ai/sa-icon.png",
    "base_url": "https://studentalumni.ai",
}

_ICONS = {
    "search": (
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" '
        'fill="none" stroke="{c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    ),
    "bot": (
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" '
        'fill="none" stroke="{c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/>'
        '<path d="M12 7v4"/></svg>'
    ),
    "calendar": (
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" '
        'fill="none" stroke="{c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>'
        '<line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
    ),
    "chart": (
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" '
        'fill="none" stroke="{c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>'
        '<line x1="6" y1="20" x2="6" y2="14"/></svg>'
    ),
    "check": (
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" '
        'fill="none" stroke="{c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
        '<polyline points="20 6 9 17 4 12"/></svg>'
    ),
    "cross": (
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" '
        'fill="none" stroke="{c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
        '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    ),
    "user": (
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" '
        'fill="none" stroke="{c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>'
        '<circle cx="12" cy="7" r="4"/></svg>'
    ),
    "clock": (
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" '
        'fill="none" stroke="{c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
    ),
    "star": (
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" '
        'fill="{c}" stroke="{c}" stroke-width="1" stroke-linejoin="round">'
        '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
    ),
}


def _icn(name: str, color: str = "#8B5CF6") -> str:
    raw = _ICONS.get(name, "")
    return raw.format(c=color) if raw else ""

EMAIL_TEMPLATES = {
    "test": {"label": "Test Email", "description": "Send a test email to verify provider settings"},
    "password_reset": {"label": "Password Reset", "description": "OTP code sent when a user requests a password reset"},
    "email_verification": {"label": "Email Verification", "description": "Verify a new user's email address"},
    "welcome": {"label": "Welcome Email", "description": "Sent to new users after successful signup"},
    "mentor_approved": {"label": "Mentor Approved", "description": "Sent when an admin approves a mentor application"},
    "mentor_rejected": {"label": "Mentor Rejected", "description": "Sent when an admin rejects a mentor application"},
    "booking_created": {"label": "Booking Request", "description": "Notify mentor of a new session booking request"},
    "booking_confirmed": {"label": "Booking Confirmed", "description": "Notify student that a session was confirmed"},
    "booking_cancelled": {"label": "Booking Cancelled", "description": "Notify student that a session was cancelled"},
    "booking_rescheduled": {"label": "Booking Rescheduled", "description": "Notify both parties of a rescheduled session"},
    "connection_request": {"label": "Connection Request", "description": "Notify user of a new network connection request"},
    "connection_accepted": {"label": "Connection Accepted", "description": "Notify user that a connection was accepted"},
    "review_received": {"label": "Review Received", "description": "Notify mentor of a new rating/review"},
    "event_registration": {"label": "Event Registration", "description": "Confirm event registration"},
    "broadcast": {"label": "Admin Broadcast", "description": "Manual broadcast message from admin"},
}


def _get_logo_url() -> str:
    import os
    be = os.environ.get("BACKEND_URL") or ""
    if be:
        return be.rstrip("/") + "/api/static/sa-icon.png"
    return BRAND["logo_url"]


def base_html(content: str, preview_text: str = "", logo_url: str = "") -> str:
    pspan = ""
    if preview_text:
        bg = BRAND["bg"]
        pspan = f"""<span class="sg-text" style="display:none;font-size:1px;color:{bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">{preview_text}</span>"""
    logo = logo_url or _get_logo_url()
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{BRAND["name"]}</title>
  {pspan}
  <style>
    * {{ margin:0; padding:0; box-sizing:border-box; }}
    body {{ background-color:transparent; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }}
    table {{ border-collapse:collapse; }}
    .wrapper {{ width:100%; background-color:transparent; padding:24px 0; }}
    .container {{ max-width:560px; margin:0 auto; background-color:{BRAND["bg2"]}; border-radius:16px; border:1px solid {BRAND["border"]}; overflow:hidden; }}
    .header {{ padding:40px 32px 0; text-align:center; }}
    .header-logo {{ width:44px; height:44px; border-radius:12px; margin-bottom:8px; }}
    .header-name {{ font-size:16px; font-weight:700; color:{BRAND["text"]}; letter-spacing:-0.3px; }}
    .header-name span {{ color:{BRAND["primary"]}; }}
    .divider {{ height:1px; background:{BRAND["border"]}; margin:16px 32px; }}
    .body {{ padding:24px 32px 32px; }}
    .footer {{ padding:24px 32px 32px; text-align:center; }}
    .footer-text {{ font-size:11px; color:{BRAND["text3"]}; line-height:18px; }}
    .footer-links {{ margin-bottom:8px; }}
    .footer-links a {{ color:{BRAND["text3"]}; text-decoration:none; font-size:11px; margin:0 8px; }}
    .btn {{ display:inline-block; padding:12px 28px; border-radius:10px; font-size:14px; font-weight:600; text-decoration:none; text-align:center; }}
    .btn-primary {{ background-color:{BRAND["primary"]}; color:#fff; }}
    .btn-outline {{ border:1px solid {BRAND["border"]}; color:{BRAND["text2"]}; }}
    h1 {{ font-size:22px; font-weight:700; color:{BRAND["text"]}; margin-bottom:8px; letter-spacing:-0.5px; }}
    h2 {{ font-size:16px; font-weight:600; color:{BRAND["text"]}; margin-bottom:6px; }}
    p {{ font-size:13.5px; color:{BRAND["text2"]}; line-height:22px; margin-bottom:14px; }}
    .code {{ display:inline-block; padding:10px 24px; border-radius:10px; background:{BRAND["primary"]}15; border:1px solid {BRAND["primary"]}30; font-size:24px; font-weight:700; color:{BRAND["primary"]}; letter-spacing:4px; margin:8px 0; }}
    .meta {{ display:inline-block; padding:8px 14px; border-radius:8px; background:rgba(255,255,255,0.03); border:1px solid {BRAND["border"]}; font-size:12px; color:{BRAND["text2"]}; margin:4px 0; }}
    .meta strong {{ color:{BRAND["text"]}; }}
    .meta svg, .status-badge svg {{ vertical-align:middle; margin-right:5px; }}
    .status-badge {{ display:inline-block; padding:4px 12px; border-radius:999px; font-size:11px; font-weight:600; }}
    .status-success {{ background:{BRAND["accent"]}20; color:{BRAND["accent"]}; }}
    .status-error {{ background:{BRAND["rose"]}20; color:{BRAND["rose"]}; }}
    .status-warning {{ background:{BRAND["amber"]}20; color:{BRAND["amber"]}; }}
    .detail-row {{ display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid {BRAND["border"]}; }}
    .detail-label {{ font-size:12px; color:{BRAND["text3"]}; }}
    .detail-value {{ font-size:12px; color:{BRAND["text"]}; font-weight:600; }}
    @media only screen and (max-width:480px) {{
      .container {{ border-radius:0; border-left:none; border-right:none; }}
      .header {{ padding:28px 20px 0; }}
      .body {{ padding:20px 20px 24px; }}
      .divider {{ margin:12px 20px; }}
      .footer {{ padding:16px 20px 24px; }}
    }}
  </style>
</head>
<body>
  <table class="wrapper" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center">
      <table class="container" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td class="header">
          <img src="{logo}" alt="{BRAND["name"]}" class="header-logo" width="44" height="44" />
          <div class="header-name">{BRAND["name"]}<span>.</span></div>
        </td></tr>
        <tr><td><div class="divider"></div></td></tr>
        <tr><td class="body">
          {content}
        </td></tr>
        <tr><td><div class="divider"></div></td></tr>
        <tr><td class="footer">
          <div class="footer-links">
            <a href="{BRAND["base_url"]}">Website</a>
            <a href="{BRAND["base_url"]}/login">Sign In</a>
            <a href="{BRAND["base_url"]}/support">Support</a>
          </div>
          <div class="footer-text">
            &copy; 2026 {BRAND["name"]}. All rights reserved.<br/>
            If you did not expect this email, you may ignore it.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def render_template(template_name: str, data: Optional[dict] = None) -> tuple:
    data = data or {}
    renderer = _RENDERERS.get(template_name)
    if not renderer:
        return ("Unknown Template", "<p>Template not found.</p>")
    return renderer(data)


def _render_test(data: dict) -> tuple:
    return (
        "Test Email from StudentAlumni",
        f"""
        <h1>Test Email</h1>
        <p>If you received this, your email settings are working correctly.</p>
        <p style="margin-top:12px;font-size:11px;color:{BRAND["text3"]}">
          Sent at: {data.get("sent_at", "—")} &middot; Provider: {data.get("provider", "—")}
        </p>
        """
    )


def _render_password_reset(data: dict) -> tuple:
    otp = data.get("otp", "000000")
    return (
        "Password Reset Code — StudentAlumni",
        f"""
        <h1>Reset your password</h1>
        <p>We received a request to reset the password for your {BRAND["name"]} account. Use the code below to proceed.</p>
        <div style="text-align:center;margin:16px 0;">
          <div class="code">{otp}</div>
        </div>
        <p>This code will expire in <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
        """
    )


def _render_email_verification(data: dict) -> tuple:
    name = data.get("name", "there")
    verify_link = data.get("verify_link", "")
    return (
        "Verify your email — StudentAlumni",
        f"""
        <h1>Welcome, {name}!</h1>
        <p>Thanks for joining {BRAND["name"]}. Please verify your email address to get started.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="{verify_link}" class="btn btn-primary">Verify my email</a>
        </div>
        <p>Click the button above to verify your account. The link expires in <strong>30 minutes</strong>.</p>
        <p style="margin-top:12px;font-size:12px;color:{BRAND["text3"]};">If you did not create this account, you can safely ignore this email.</p>
        """
    )


def _render_welcome(data: dict) -> tuple:
    name = data.get("name", "there")
    role = data.get("role", "student")
    sv = _icn("search"); sb = _icn("bot"); sc = _icn("calendar"); sg = _icn("chart")
    return (
        "Welcome to StudentAlumni!",
        f"""
        <h1>Welcome, {name}!</h1>
        <p>You've joined India's trusted alumni network. Here's what you can do next:</p>
        <table cellpadding="0" cellspacing="0" role="presentation" style="margin:12px 0;">
          <tr>
            <td style="padding:4px 0;">
              <div class="meta">{sv} <strong>Find Mentors</strong> — Connect with verified alumni from top companies</div>
            </td>
          </tr>
          <tr>
            <td style="padding:4px 0;">
              <div class="meta">{sb} <strong>AI Career Copilot</strong> — Agent K helps with resumes, briefs &amp; recommendations</div>
            </td>
          </tr>
          <tr>
            <td style="padding:4px 0;">
              <div class="meta">{sc} <strong>Book Sessions</strong> — 1-on-1 mentoring sessions tailored to your goals</div>
            </td>
          </tr>
          <tr>
            <td style="padding:4px 0;">
              <div class="meta">{sg} <strong>Track Growth</strong> — Dashboard, analytics &amp; career timeline</div>
            </td>
          </tr>
        </table>
        <div style="text-align:center;margin:16px 0;">
          <a href="{BRAND["base_url"]}/dashboard" class="btn btn-primary">Go to Dashboard</a>
        </div>
        """
    )


def _render_mentor_approved(data: dict) -> tuple:
    name = data.get("name", "Mentor")
    ck = _icn("check", "#10B981")
    return (
        "Your mentor application is approved!",
        f"""
        <h1>Congratulations, {name}!</h1>
        <p>{ck} Your mentor application has been <span class="status-badge status-success">approved</span>. You can now start accepting session requests from students.</p>
        <div style="text-align:center;margin:16px 0;">
          <a href="{BRAND["base_url"]}/mentor/dashboard" class="btn btn-primary">Go to Mentor Dashboard</a>
        </div>
        <p style="font-size:12px;color:{BRAND["text3"]};">Set your availability and topics to get started.</p>
        """
    )


def _render_mentor_rejected(data: dict) -> tuple:
    name = data.get("name", "Mentor")
    reason = data.get("reason", "Your application did not meet our current requirements.")
    cr = _icn("cross", "#f43f5e")
    return (
        "Update on your mentor application",
        f"""
        <h1>Application update</h1>
        <p>Thank you for applying to be a mentor on {BRAND["name"]}. After review, we are unable to approve your application at this time.</p>
        <div style="margin:12px 0;">
          <div class="status-badge status-error">{cr} Not approved</div>
        </div>
        <p><strong>Reason:</strong> {reason}</p>
        <p>You may reapply after addressing the above. We appreciate your interest!</p>
        <div style="text-align:center;margin:16px 0;">
          <a href="{BRAND["base_url"]}/mentor/apply" class="btn btn-outline">Reapply</a>
        </div>
        """
    )


def _render_booking_created(data: dict) -> tuple:
    student = data.get("student_name", "A student")
    topic = data.get("topic", "Career guidance")
    when = data.get("when", "—")
    return (
        f"New booking request from {student}",
        f"""
        <h1>New Booking Request</h1>
        <p><strong>{student}</strong> has requested a session with you.</p>
        <table cellpadding="0" cellspacing="0" role="presentation" style="margin:12px 0;">
          <tr><td><div class="meta"><strong>Topic:</strong> {topic}</div></td></tr>
          <tr><td><div class="meta"><strong>Requested time:</strong> {when}</div></td></tr>
        </table>
        <div style="text-align:center;margin:16px 0;">
          <a href="{BRAND["base_url"]}/mentor/bookings" class="btn btn-primary">Review Booking</a>
        </div>
        """
    )


def _render_booking_confirmed(data: dict) -> tuple:
    mentor = data.get("mentor_name", "Your mentor")
    when = data.get("when", "—")
    topic = data.get("topic", "your session")
    ck = _icn("check", "#10B981"); sc = _icn("calendar")
    return (
        f"Session confirmed with {mentor}!",
        f"""
        <h1>Session Confirmed</h1>
        <p>{ck} Your <strong>{topic}</strong> session with <strong>{mentor}</strong> has been confirmed.</p>
        <table cellpadding="0" cellspacing="0" role="presentation" style="margin:12px 0;">
          <tr><td><div class="meta">{sc} <strong>Date &amp; Time:</strong> {when}</div></td></tr>
        </table>
        <div style="text-align:center;margin:16px 0;">
          <a href="{BRAND["base_url"]}/bookings" class="btn btn-primary">View Session Details</a>
        </div>
        """
    )


def _render_booking_cancelled(data: dict) -> tuple:
    mentor = data.get("mentor_name", "Your mentor")
    reason = data.get("reason", "No reason provided.")
    cr = _icn("cross", "#f43f5e")
    return (
        "Session cancelled",
        f"""
        <h1>Session Cancelled</h1>
        <p>{cr} Unfortunately, <strong>{mentor}</strong> has cancelled your session.</p>
        <div style="margin:12px 0;">
          <div class="meta"><strong>Reason:</strong> {reason}</div>
        </div>
        <p>You can browse other mentors and book a new session.</p>
        <div style="text-align:center;margin:16px 0;">
          <a href="{BRAND["base_url"]}/mentors" class="btn btn-primary">Find a Mentor</a>
        </div>
        """
    )


def _render_booking_rescheduled(data: dict) -> tuple:
    name = data.get("other_name", "The other party")
    old_time = data.get("old_time", "—")
    new_time = data.get("new_time", "—")
    sc = _icn("calendar"); cl = _icn("clock")
    return (
        "Session rescheduled",
        f"""
        <h1>Session Rescheduled</h1>
        <p><strong>{name}</strong> has rescheduled your session.</p>
        <table cellpadding="0" cellspacing="0" role="presentation" style="margin:12px 0;">
          <tr><td><div class="meta">{sc} <strong>Previous:</strong> {old_time}</div></td></tr>
          <tr><td><div class="meta">{cl} <strong>New time:</strong> {new_time}</div></td></tr>
        </table>
        <p>Please check your calendar and update your schedule accordingly.</p>
        <div style="text-align:center;margin:16px 0;">
          <a href="{BRAND["base_url"]}/bookings" class="btn btn-primary">View Updated Session</a>
        </div>
        """
    )


def _render_connection_request(data: dict) -> tuple:
    requester = data.get("requester_name", "Someone")
    us = _icn("user")
    return (
        f"Connection request from {requester}",
        f"""
        <h1>New Connection Request</h1>
        <p>{us} <strong>{requester}</strong> wants to connect with you on {BRAND["name"]}.</p>
        <div style="text-align:center;margin:16px 0;">
          <a href="{BRAND["base_url"]}/network" class="btn btn-primary">View Request</a>
        </div>
        <p style="font-size:12px;color:{BRAND["text3"]};">You can accept or decline this request.</p>
        """
    )


def _render_connection_accepted(data: dict) -> tuple:
    accepter = data.get("accepter_name", "Someone")
    ck = _icn("check", "#10B981")
    return (
        f"{accepter} accepted your connection request!",
        f"""
        <h1>Connection Accepted</h1>
        <p>{ck} <strong>{accepter}</strong> has accepted your connection request. You are now connected!</p>
        <div style="text-align:center;margin:16px 0;">
          <a href="{BRAND["base_url"]}/network" class="btn btn-primary">View Your Network</a>
        </div>
        """
    )


def _render_review_received(data: dict) -> tuple:
    student = data.get("student_name", "A student")
    rating = data.get("rating", "5")
    st = _icn("star")
    return (
        f"New {rating} star review from {student}",
        f"""
        <h1>New Review</h1>
        <p>{st} <strong>{student}</strong> left you a <strong>{rating} / 5</strong> rating.</p>
        <p style="margin:8px 0;font-size:22px;color:{BRAND["amber"]};">{"&#9733;" * int(rating)}{"&#9734;" * (5 - int(rating))}</p>
        <p>Reviews help you build credibility and attract more students.</p>
        <div style="text-align:center;margin:16px 0;">
          <a href="{BRAND["base_url"]}/mentor/reviews" class="btn btn-primary">View Reviews</a>
        </div>
        """
    )


def _render_event_registration(data: dict) -> tuple:
    event = data.get("event_title", "an event")
    when = data.get("event_date", "—")
    name = data.get("name", "there")
    ck = _icn("check", "#10B981"); sc = _icn("calendar")
    return (
        f"Registered for {event}",
        f"""
        <h1>You're registered!</h1>
        <p>{ck} Hi {name}, you have successfully registered for <strong>{event}</strong>.</p>
        <table cellpadding="0" cellspacing="0" role="presentation" style="margin:12px 0;">
          <tr><td><div class="meta">{sc} <strong>Date:</strong> {when}</div></td></tr>
        </table>
        <p>Add it to your calendar so you don't miss it.</p>
        <div style="text-align:center;margin:16px 0;">
          <a href="{BRAND["base_url"]}/events" class="btn btn-primary">View Events</a>
        </div>
        """
    )


def _render_broadcast(data: dict) -> tuple:
    subject = data.get("subject", "Announcement")
    message = data.get("message", "")
    return (
        subject,
        f"""
        <h1>{subject}</h1>
        <div style="margin:12px 0;padding:14px;border-radius:10px;background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.12);">
          <p style="margin:0;white-space:pre-wrap;">{message}</p>
        </div>
        <p style="font-size:11px;color:{BRAND["text3"]};">— The {BRAND["name"]} Team</p>
        """
    )


_RENDERERS = {
    "test": _render_test,
    "password_reset": _render_password_reset,
    "email_verification": _render_email_verification,
    "welcome": _render_welcome,
    "mentor_approved": _render_mentor_approved,
    "mentor_rejected": _render_mentor_rejected,
    "booking_created": _render_booking_created,
    "booking_confirmed": _render_booking_confirmed,
    "booking_cancelled": _render_booking_cancelled,
    "booking_rescheduled": _render_booking_rescheduled,
    "connection_request": _render_connection_request,
    "connection_accepted": _render_connection_accepted,
    "review_received": _render_review_received,
    "event_registration": _render_event_registration,
    "broadcast": _render_broadcast,
}


def get_template_list() -> list:
    return [
        {
            "id": tid,
            "label": meta["label"],
            "description": meta["description"],
        }
        for tid, meta in EMAIL_TEMPLATES.items()
    ]


def preview_template(template_name: str, sample_data: Optional[dict] = None) -> dict:
    default_sample = {
        "test": {"sent_at": "Jul 19, 2026 10:30 AM", "provider": "Postal"},
        "password_reset": {"otp": "482916"},
        "email_verification": {"name": "Priya", "verify_link": "https://studentalumni.ai/verify-email?token=sampletok123"},
        "welcome": {"name": "Priya Sharma", "role": "student"},
        "mentor_approved": {"name": "Rahul Verma"},
        "mentor_rejected": {"name": "Rahul Verma", "reason": "Insufficient industry experience in the selected domain."},
        "booking_created": {"student_name": "Ananya Reddy", "topic": "Career switch to Product Management", "when": "Jul 22, 2026 4:00 PM IST"},
        "booking_confirmed": {"mentor_name": "Rahul Verma", "when": "Jul 22, 2026 4:00 PM IST", "topic": "Product Management"},
        "booking_cancelled": {"mentor_name": "Rahul Verma", "reason": "Schedule conflict"},
        "booking_rescheduled": {"other_name": "Rahul Verma", "old_time": "Jul 22, 4:00 PM", "new_time": "Jul 24, 5:00 PM"},
        "connection_request": {"requester_name": "Arjun Mehta"},
        "connection_accepted": {"accepter_name": "Sneha Kapoor"},
        "review_received": {"student_name": "Ananya Reddy", "rating": "5"},
        "event_registration": {"name": "Priya", "event_title": "AI in Finance — Workshop", "event_date": "Aug 5, 2026"},
        "broadcast": {"subject": "Platform Maintenance Tonight", "message": "The platform will be undergoing scheduled maintenance from 2 AM to 4 AM IST. You may experience brief downtime."},
    }
    merged = {**(default_sample.get(template_name, {})), **(sample_data or {})}
    subject, body = render_template(template_name, merged)
    html = base_html(body)
    return {"subject": subject, "html": html, "data": merged}
