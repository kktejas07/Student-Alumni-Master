"""Pydantic schemas + boot-time seed data.

Verbatim segment of features/echo_showcase.py (audit Step 5b). Exec'd into that
module's namespace in source order — referenced names resolve from the shared
namespace; do not import this file directly.
"""
from __future__ import annotations

# ── Pydantic schemas ─────────────────────────────────────────────────────────
class StatItem(BaseModel):
    label: str
    value: str
    icon: Optional[str] = "users"
    color: Optional[str] = None
    display_order: Optional[int] = 0

class HighlightItem(BaseModel):
    icon: Optional[str] = "star"
    title: str
    description: Optional[str] = ""
    color: Optional[str] = None
    display_order: Optional[int] = 0

class TestimonialItem(BaseModel):
    name: str
    branch: Optional[str] = ""
    department: Optional[str] = ""
    year: Optional[str] = ""
    quote: str
    rating: Optional[int] = 5
    avatar_url: Optional[str] = None
    photo_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    visible: Optional[bool] = True
    sort_order: Optional[int] = 0

class TimelineItem(BaseModel):
    icon: Optional[str] = "star"
    title: str
    description: Optional[str] = ""

class PartnerItem(BaseModel):
    name: str
    logo_url: Optional[str] = None
    kind: Optional[str] = "association"  # association | sponsor
    website_url: Optional[str] = None

class SponsorItem(BaseModel):
    name: str
    logo_url: Optional[str] = None
    tier: Optional[str] = "Gold Sponsor"  # Title Sponsor | Platinum | Gold | Silver | Associate
    website_url: Optional[str] = None
    priority: Optional[int] = 0

class GalleryItem(BaseModel):
    url: str
    caption: Optional[str] = ""
    alt: Optional[str] = ""
    credit: Optional[str] = ""
    tags: Optional[List[str]] = []
    featured: Optional[bool] = False
    order: Optional[int] = 0
    hero: Optional[bool] = False

class DownloadItem(BaseModel):
    title: str
    file_url: str
    description: Optional[str] = ""
    file_size: Optional[str] = ""
    category: Optional[str] = "Document"

class VideoItem(BaseModel):
    title: str
    video_url: str
    thumbnail_url: Optional[str] = None
    description: Optional[str] = ""
    platform: Optional[str] = "youtube"  # youtube | vimeo | mp4

class AboutCard(BaseModel):
    icon: Optional[str] = "star"
    title: str
    description: Optional[str] = ""
    color: Optional[str] = None

class SpeakerItem(BaseModel):
    """A speaker/panelist on the showcase page.

    Mirrors the reference site (echo.studentalumni.ai): a speaker card shows
    photo, name, position · company, bio, and social links. Panel members are
    rendered in a distinct 'Panel Members' section.
    """
    name: str
    position: Optional[str] = ""       # e.g. "Chief AI Architect"
    company: Optional[str] = ""        # e.g. "Google"
    bio: Optional[str] = ""            # 1-2 line bio
    photo_url: Optional[str] = None    # square headshot
    linkedin_url: Optional[str] = None
    twitter_url: Optional[str] = None
    website_url: Optional[str] = None
    location: Optional[str] = ""         # e.g. "Union, New Jersey, USA"
    category: Optional[str] = ""          # e.g. "International Panel", "Voices That Build"
    is_panel_member: Optional[bool] = False   # True → shows under "Panel Members"
    session_title: Optional[str] = ""        # keynote/panel/talk this speaker is part of
    visible: Optional[bool] = True
    sort_order: Optional[int] = 0

class EventCategoryItem(BaseModel):
    """One event track/category (e.g. hackathon problem statement category)."""
    name: str
    description: Optional[str] = ""
    icon: Optional[str] = "brain"   # lucide icon key
    color: Optional[str] = None

class ScheduleItem(BaseModel):
    """A time-boxed agenda entry on the schedule/timeline."""
    time: Optional[str] = ""        # e.g. "10:00 AM"
    title: str
    description: Optional[str] = ""
    session_type: Optional[str] = "session"  # keynote | panel | workshop | activity | break
    speaker_names: Optional[List[str]] = []  # speaker names taking part
    venue: Optional[str] = ""
    day: Optional[int] = 1

class PanelItem(BaseModel):
    """A panel discussion topic + list of panelist names."""
    topic: str
    description: Optional[str] = ""
    panelists: Optional[List[str]] = []

class FaqItem(BaseModel):
    question: str
    answer: str

class PerkItem(BaseModel):
    """A perk/benefit card shown on the event detail page."""
    name: str
    description: Optional[str] = ""
    value: Optional[str] = ""           # e.g. "$29 value", "Coupon", "Included"
    icon: Optional[str] = None           # lucide icon key
    display_order: Optional[int] = 0

class CyberConclaveSession(BaseModel):
    """One session card inside the Cyber Security Conclave section."""
    title: str
    description: Optional[str] = ""

class CyberConclaveConfig(BaseModel):
    """Configuration for the Cyber Security Conclave section."""
    enabled: Optional[bool] = True
    badge: Optional[str] = "INTERNATIONAL VIRTUAL CONCLAVE"
    title: Optional[str] = "Cyber Security with AI"
    subtitle: Optional[str] = ""
    date_label: Optional[str] = ""
    time_label: Optional[str] = ""
    sessions: Optional[List[CyberConclaveSession]] = []

class TickerMessage(BaseModel):
    """A single message in the top scrolling ticker bar."""
    text: str
    display_order: Optional[int] = 0

class PrizePoolItem(BaseModel):
    total: Optional[str] = ""
    first: Optional[str] = ""
    second: Optional[str] = ""
    third: Optional[str] = ""
    other_prizes: Optional[List[str]] = []

class RegistrationConfig(BaseModel):
    enabled: Optional[bool] = True
    fee: Optional[float] = 0
    individual_fee: Optional[float] = None
    team_fee: Optional[float] = None
    discount_coupons: Optional[Dict[str, float]] = Field(default_factory=dict)
    currency: Optional[str] = "INR"
    max_seats: Optional[int] = 0
    seat_leverage: Optional[float] = 0.8  # 0.0-1.0 — fraction of registrations that consume seats (0.8 = 20% buffer)
    deadline: Optional[str] = ""
    temporary_open: Optional[bool] = False
    temporary_close_at: Optional[str] = ""
    payment_note: Optional[str] = ""
    payment_url: Optional[str] = None  # External payment gateway link (e.g. Razorpay/Stripe) shown on the register page
    poster_images: Optional[List[str]] = []  # Poster images displayed on the register page
    ticket_template: Optional[str] = "aurora"  # aurora | classic | minimal
    contact_phones: Optional[List[str]] = []  # Contact phone numbers shown on the registration page


DEFAULT_SECTIONS = {
    "hero": True,
    "stats": True,
    "about": True,
    "gallery": True,
    "testimonials": True,
    "timeline": True,
    "speakers": True,
    "categories": True,
    "perks": True,
    "ticker": True,
    "conclave": True,
    "schedule": True,
    "panels": True,
    "faqs": True,
    "partners": True,
    "sponsors": True,
    "videos": True,
    "downloads": True,
    "cta": True,
    "registration": True,
}

class EchoCatalogItem(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    event_id: str
    vendor_id: Optional[str] = None
    vendor_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    servings: Optional[str] = None
    category: str = "food" # 'food' or 'handcraft'
    price: float = 0.0
    stock: int = 0
    images: List[str] = []
    is_active: bool = True
    created_at: Optional[datetime] = None

class EchoCoupon(BaseModel):
    code: str
    discount_type: str = "percentage" # 'percentage', 'fixed'
    discount_value: float = 0.0
    event_id: Optional[str] = None
    valid_until: Optional[datetime] = None
    max_uses: int = 0
    times_used: int = 0
    created_at: Optional[datetime] = None

class EchoOrderItem(BaseModel):
    item_id: str
    name: str
    quantity: int
    price_at_time: float
    vendor_id: Optional[str] = None
    status: str = "pending" # pending, fulfilled

class EchoOrder(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    event_id: str
    user_id: str
    user_email: str
    items: List[EchoOrderItem] = []
    total_amount: float = 0.0
    discount_applied: float = 0.0
    coupon_code: Optional[str] = None
    final_amount: float = 0.0
    status: str = "pending" # pending, paid, fulfilled, cancelled
    payment_id: Optional[str] = None
    created_at: Optional[datetime] = None



class ShowcaseCreateSchema(BaseModel):
    title: str
    slug: str
    aliases: Optional[List[str]] = []  # Legacy/alternate slugs that resolve to this showcase
    subtitle: Optional[str] = ""
    description: Optional[str] = ""
    date: Optional[str] = ""
    end_date: Optional[str] = ""
    time: Optional[str] = ""
    venue: Optional[str] = ""
    college: Optional[str] = ""
    category: Optional[str] = "college-event"
    status: Optional[str] = "draft"           # draft | published | archived
    event_status_badge: Optional[str] = "Upcoming"  # Upcoming | Live | Completed
    hero_image_url: Optional[str] = None
    hero_cover_url: Optional[str] = None
    hero_thumbnail_url: Optional[str] = None
    hero_bg_url: Optional[str] = None
    hero_banners: Optional[List[str]] = []
    organizer_name: Optional[str] = ""
    organizer_logo_url: Optional[str] = None
    stats: Optional[List[StatItem]] = []
    highlights: Optional[List[HighlightItem]] = []
    about_cards: Optional[List[AboutCard]] = []
    testimonials: Optional[List[TestimonialItem]] = []
    timeline: Optional[List[TimelineItem]] = []
    speakers: Optional[List[SpeakerItem]] = []
    categories: Optional[List[EventCategoryItem]] = []
    schedule: Optional[List[ScheduleItem]] = []
    panels: Optional[List[PanelItem]] = []
    faqs: Optional[List[FaqItem]] = []
    eligibility: Optional[str] = ""
    prize_pool: Optional[PrizePoolItem] = None
    team_composition: Optional[str] = ""
    partners: Optional[List[PartnerItem]] = []
    sponsors: Optional[List[SponsorItem]] = []
    gallery: Optional[List[GalleryItem]] = []
    gallery_layout: Optional[str] = "grid"  # grid | masonry | mixed | featured-grid | carousel
    downloads: Optional[List[DownloadItem]] = []
    videos: Optional[List[VideoItem]] = []
    cta_title: Optional[str] = "Stay tuned for more events!"
    cta_subtitle: Optional[str] = "Join our community and never miss an opportunity to learn, connect, and grow."
    cta_button_text: Optional[str] = "View Upcoming Events"
    cta_url: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    og_image_url: Optional[str] = None
    sections: Optional[Dict[str, bool]] = None
    registration: Optional[RegistrationConfig] = None
    perks: Optional[List[PerkItem]] = []
    ticker_messages: Optional[List[TickerMessage]] = []
    cyber_conclave: Optional[CyberConclaveConfig] = None

# ShowcaseUpdateSchema makes every field optional (for partial PATCH-style updates).
# Defined as a standalone model (not inheriting ShowcaseCreateSchema) to avoid
# mutable-attribute override type errors with strict type-checkers.
class ShowcaseUpdateSchema(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    aliases: Optional[List[str]] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    end_date: Optional[str] = None
    time: Optional[str] = None
    venue: Optional[str] = None
    college: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    event_status_badge: Optional[str] = None
    hero_image_url: Optional[str] = None
    hero_cover_url: Optional[str] = None
    hero_thumbnail_url: Optional[str] = None
    hero_bg_url: Optional[str] = None
    hero_banners: Optional[List[str]] = None
    organizer_name: Optional[str] = None
    organizer_logo_url: Optional[str] = None
    stats: Optional[List[StatItem]] = None
    highlights: Optional[List[HighlightItem]] = None
    about_cards: Optional[List[AboutCard]] = None
    testimonials: Optional[List[TestimonialItem]] = None
    timeline: Optional[List[TimelineItem]] = None
    speakers: Optional[List[SpeakerItem]] = None
    categories: Optional[List[EventCategoryItem]] = None
    schedule: Optional[List[ScheduleItem]] = None
    panels: Optional[List[PanelItem]] = None
    faqs: Optional[List[FaqItem]] = None
    eligibility: Optional[str] = None
    prize_pool: Optional[PrizePoolItem] = None
    team_composition: Optional[str] = None
    partners: Optional[List[PartnerItem]] = None
    sponsors: Optional[List[SponsorItem]] = None
    gallery: Optional[List[GalleryItem]] = None
    gallery_layout: Optional[str] = None
    downloads: Optional[List[DownloadItem]] = None
    videos: Optional[List[VideoItem]] = None
    cta_title: Optional[str] = None
    cta_subtitle: Optional[str] = None
    cta_button_text: Optional[str] = None
    cta_url: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    og_image_url: Optional[str] = None
    sections: Optional[Dict[str, bool]] = None
    registration: Optional[RegistrationConfig] = None
    sessions: Optional[List[Dict[str, Any]]] = None
    perks: Optional[List[PerkItem]] = None
    ticker_messages: Optional[List[TickerMessage]] = None
    cyber_conclave: Optional[CyberConclaveConfig] = None


# ── Seed Default Data ────────────────────────────────────────────────────────
VNR_SHOWCASE_SEED = {
    "title": "VNR ECHO 2026",
    "slug": "vnr-echo-2026",
    "aliases": ["vnrvjit", "vnrjvit", "vnr", "vnr-vjiet", "vnr-vjit"],
    "subtitle": "Empowering Tomorrow's Leaders · VNR VJIET in collaboration with StudentAlumni.ai",
    "description": "Walk in with an idea, walk out with a product. A 12-hour intensive build sprint for VNR VJIET students.",
    "date": "August 15, 2026",
    "time": "9:00 AM – 9:00 PM",
    "venue": "Main Auditorium, VNR VJIET, Hyderabad",
    "college": "VNR VJIET",
    "category": "college-event",
    "status": "published",
    "event_status_badge": "Upcoming",
    "hero_image_url": "https://picsum.photos/seed/echo2026-hero/1200/700",
    "hero_cover_url": "https://picsum.photos/seed/echo2026-hero/1200/700",
    "hero_thumbnail_url": "https://picsum.photos/seed/echo2026-hero/800/500",
    "hero_bg_url": "https://picsum.photos/seed/echo2026-bg/1600/900",
    "organizer_name": "Student Alumni Cell · VNR VJIET",
    "organizer_logo_url": None,
    "stats": [
        { "label": "Students Attended", "value": "320+", "icon": "users", "display_order": 0 },
        { "label": "Expert Speakers",   "value": "12",   "icon": "speakers", "display_order": 1 },
        { "label": "Sessions",          "value": "6",    "icon": "sessions", "display_order": 2 },
        { "label": "Networking Connections", "value": "48", "icon": "network", "display_order": 3 },
        { "label": "Feedback Score",    "value": "95%",  "icon": "feedback", "display_order": 4 }
    ],
    "highlights": [
        { "icon": "book", "title": "Learn",   "description": "Industry insights", "display_order": 0 },
        { "icon": "network", "title": "Connect", "description": "Build your network", "display_order": 1 },
        { "icon": "trending", "title": "Grow", "description": "Shape your future", "display_order": 2 }
    ],
    "about_cards": [
        { "icon": "book", "title": "Learn", "description": "Industry insights from leading professionals" },
        { "icon": "network", "title": "Connect", "description": "Build lasting networks with peers and alumni" },
        { "icon": "trending", "title": "Grow", "description": "Shape your professional future" }
    ],
    "testimonials": [
        { "name": "Ananya S.", "branch": "Computer Science", "department": "Computer Science", "year": "Final Year", "quote": "Amazing event! The sessions were insightful and helped me understand industry expectations much better.", "rating": 5, "visible": True, "sort_order": 0 },
        { "name": "Rohit M.", "branch": "Information Technology", "department": "Information Technology", "year": "Pre-final Year", "quote": "Great opportunity to network with professionals and connect with like-minded peers.", "rating": 5, "visible": True, "sort_order": 1 },
        { "name": "Priya K.", "branch": "Electronics & Communication", "department": "Electronics & Communication", "year": "Final Year", "quote": "The workshops were hands-on and very practical. Looking forward to more such events!", "rating": 5, "visible": True, "sort_order": 2 }
    ],
    "timeline": [
        { "icon": "star", "title": "Inspiring Keynotes", "description": "Industry leaders shared their journey and insights" },
        { "icon": "users", "title": "Panel Discussions", "description": "Engaging conversations on career and tech trends" },
        { "icon": "code", "title": "Hands-on Workshops", "description": "Practical learning and skill-building sessions" },
        { "icon": "network", "title": "Networking Sessions", "description": "Students connected with experts and alumni" }
    ],
    "speakers": [
        { "name": "Vijay Raghavan", "position": "Chief AI Architect", "company": "Google", "location": "Bangalore, India", "bio": "Leads large-scale ML systems and has mentored 100+ student teams.", "is_panel_member": True, "category": "Keynote Speaker", "session_title": "AI at Scale — Keynote", "sort_order": 0, "visible": True },
        { "name": "Sneha Reddy", "position": "VP Engineering", "company": "Microsoft", "location": "Hyderabad, India", "bio": "Product leader behind developer tooling at Microsoft. Passionate about D&I in tech.", "is_panel_member": True, "category": "Panelist", "session_title": "Careers in AI — Panel", "sort_order": 1, "visible": True },
        { "name": "Dr. Kavitha Nair", "position": "Professor & NLP Researcher", "company": "VNR VJIET", "location": "Hyderabad, India", "bio": "Researcher in NLP and student mentor for AI-DS program.", "is_panel_member": True, "category": "Academic Mentor", "session_title": "Careers in AI — Panel", "sort_order": 2, "visible": True },
        { "name": "Arjun Mehta", "position": "Founder", "company": "BrightFuture Labs", "location": "Hyderabad, India", "bio": "Serial entrepreneur building edtech for rural India.", "is_panel_member": False, "category": "Industry Speaker", "session_title": "Entrepreneurship 101", "sort_order": 3, "visible": True }
    ],
    "categories": [
        { "name": "Healthcare & MedTech", "description": "Build AI solutions for diagnosis, telemedicine and wellness.", "icon": "heartpulse", "color": "#F43F5E" },
        { "name": "EdTech & Learning", "description": "Personalised learning, accessibility and exam-prep tools.", "icon": "graduation-cap", "color": "#8B5CF6" },
        { "name": "Climate & Sustainability", "description": "Track, reduce and offset carbon with smart systems.", "icon": "leaf", "color": "#10B981" },
        { "name": "FinTech & Inclusion", "description": "Financial literacy, UPI innovation and rural banking.", "icon": "landmark", "color": "#F59E0B" },
        { "name": "Smart Cities & Mobility", "description": "Traffic, public transport and safer campuses.", "icon": "bus", "color": "#3B82F6" }
    ],
    "schedule": [
        { "time": "09:30 AM", "title": "Registration & Breakfast", "description": "Check-in with QR tickets and grab breakfast.", "session_type": "break", "day": 1 },
        { "time": "10:00 AM", "title": "Keynote — AI at Scale", "description": "Vijay Raghavan kicks off the day.", "session_type": "keynote", "speaker_names": ["Vijay Raghavan"], "day": 1 },
        { "time": "11:00 AM", "title": "Panel — Careers in AI", "description": "Industry veterans answer student questions.", "session_type": "panel", "speaker_names": ["Sneha Reddy", "Dr. Kavitha Nair"], "day": 1 },
        { "time": "12:30 PM", "title": "Hackathon Build Sprint", "description": "Teams build on their problem categories.", "session_type": "workshop", "day": 1 },
        { "time": "04:00 PM", "title": "Demo & Judging", "description": "Final demos, judging and prize distribution.", "session_type": "activity", "day": 1 }
    ],
    "panels": [
        { "topic": "Careers in AI", "description": "How students can break into AI roles and what companies look for.", "panelists": ["Sneha Reddy", "Dr. Kavitha Nair", "Arjun Mehta"] },
        { "topic": "From Campus to Company", "description": "Internships, placements and the alumni advantage.", "panelists": ["Vijay Raghavan", "Arjun Mehta"] }
    ],
    "faqs": [
        { "question": "Who can participate?", "answer": "Any student from an affiliated college with a valid student ID. Individual and team (4–5) entries are welcome." },
        { "question": "Is the event free?", "answer": "Yes — ECHO 2026 is free for college students. Food and certificates are included." },
        { "question": "Do I need to know AI/ML to attend?", "answer": "No. The keynotes and workshops are beginner-friendly. You can join a team with mixed skills." }
    ],
    "eligibility": "Open to all undergrad and postgrad students. Teams of 4–5 encouraged; individual starts welcome.",
    "prize_pool": { "total": "₹30,000", "tracks": "₹10,000", "grand_pool": "₹20,000", "wehive_germany": None, "visas": None, "other_prizes": ["Track Winners Certificate", "Overall Winner Trophy"] },
    "team_composition": "4–5 members, at least one member from each of design, coding and presentation.",
    "partners": [
        { "name": "CodeSpectra", "kind": "sponsor", "logo_url": None },
        { "name": "Featherless", "kind": "sponsor", "logo_url": None }
    ],
    "sponsors": [
        { "name": "Tech Corp", "tier": "Title Sponsor", "website_url": "https://example.com", "logo_url": None, "priority": 0 },
        { "name": "InnoLabs", "tier": "Gold Sponsor", "website_url": "https://example.com", "logo_url": None, "priority": 1 }
    ],
    "perks": [
        { "name": "Networking with Industry Leaders", "description": "Direct access to professionals from Google, Microsoft, and startups", "value": "Live", "icon": "users" },
        { "name": "Hackathon Prizes", "description": "₹30,000 prize pool across 5 categories", "value": "₹30,000", "icon": "trophy" },
        { "name": "Certificates for all", "description": "Participation and winner certificates with QR verification", "value": "Verifiable", "icon": "award" },
        { "name": "Free Food & Refreshments", "description": "Lunch, snacks, and beverages throughout the event", "value": "Included", "icon": "coffee" },
        { "name": "Internship Opportunities", "description": "On-the-spot internship offers from partner companies", "value": "Live", "icon": "briefcase" }
    ],
    "ticker_messages": [
        { "text": "VNR ECHO 2026 — Empowering Tomorrow's Leaders" },
        { "text": "320+ students · 12 speakers · 5 hackathon tracks" },
        { "text": "Free entry for all VNR VJIET students" },
        { "text": "Certificates, networking, and internship opportunities" },
        { "text": "August 15, 2026 · Main Auditorium, VNR VJIET" }
    ],
    "cyber_conclave": {
        "enabled": False,
        "badge": "",
        "title": "",
        "subtitle": "",
        "date_label": "",
        "time_label": "",
        "sessions": []
    },
    "downloads": [
        { "title": "VNR ECHO 2026 Brochure", "description": "Official event guide & schedule", "file_url": "", "file_size": "2.4 MB", "category": "Brochure" }
    ],
    "videos": [],
    "gallery": [
        { "url": "https://picsum.photos/seed/echo2026-1/800/600", "caption": "Keynote session", "alt": "Keynote session at VNR ECHO 2026", "featured": True, "order": 0, "hero": True },
        { "url": "https://picsum.photos/seed/echo2026-2/800/600", "caption": "Audience & panels", "alt": "Panel discussion", "order": 1 },
        { "url": "https://picsum.photos/seed/echo2026-3/800/600", "caption": "Graduation ceremony", "alt": "Ceremony moments", "order": 2 },
        { "url": "https://picsum.photos/seed/echo2026-4/800/600", "caption": "Workshops", "alt": "Hands-on workshops", "order": 3 }
    ],
    "gallery_layout": "grid",
    "cta_title": "Stay tuned for more events!",
    "cta_subtitle": "Join our community and never miss an opportunity to learn, connect, and grow.",
    "cta_button_text": "View Upcoming Events",
    "cta_url": None,
    "seo_title": "VNR ECHO 2026 — Student Alumni Flagship Showcase",
    "seo_description": "Join VNR ECHO 2026 for inspiration, workshops, networking, and industry keynotes.",
    "seo_keywords": "VNR VJIET, ECHO 2026, Student Alumni, Hackathon, Networking",
    "sections": dict(DEFAULT_SECTIONS),
    "registration": {
        "enabled": True,
        "fee": 0,
        "currency": "INR",
        "max_seats": 500,
        "deadline": "",
        "payment_note": "Free entry for VNR VJIET students. Registrations close 1 day before the event.",
        "payment_url": None,
        "poster_images": [],
        "contact_phones": [
            "91214 95077",
            "84669 65800"
        ],
    },
    "created_at": _now(),
    "updated_at": _now(),
    "created_by": "system"
}

SNIST_SHOWCASE_SEED = {
    "title": "HackWave 3.0 (2026)",
    "slug": "snist",
    "aliases": ["hackwave-3.0", "hackwave-3", "hackwave", "snist"],
    "subtitle": "Career Development Center · SNIST in collaboration with StudentAlumni.ai",
    "description": "Build something real. In one overnight sprint. National-Level 24-Hour Tech Fest with 7 Verticals across AI, Security, Hiring and Firesides.",
    "date": "September 04 – 05, 2026",
    "time": "Sep 4th, 08:00 AM — Sep 5th, 01:00 PM",
    "venue": "Sreenidhi Institute of Science and Technology (SNIST), Hyderabad",
    "college": "SNIST",
    "category": "college-event",
    "status": "published",
    "event_status_badge": "Upcoming",
    "hero_image_url": "/images/hackwave/hackwave_main_poster.png",
    "hero_cover_url": "/images/hackwave/hackwave_main_poster.png",
    "hero_thumbnail_url": "/images/hackwave/hackwave_main_poster.png",
    "hero_bg_url": "/images/hackwave/hackwave_main_poster.png",
    "hero_banners": [
        "/images/hackwave/hackwave_main_poster.png",
        "/images/hackwave/hackwave_full_programme.png"
    ],
    "organizer_name": "Career Development Center · SNIST in collaboration with StudentAlumni.ai",
    "organizer_logo_url": None,
    "stats": [
        { "label": "Students Attended", "value": "1200+", "icon": "users", "display_order": 0 },
        { "label": "Expert Speakers",   "value": "18+",  "icon": "speakers", "display_order": 1 },
        { "label": "Verticals",         "value": "7",    "icon": "sessions", "display_order": 2 },
        { "label": "Mega Grand Pool",   "value": "₹2L",  "icon": "trophy", "display_order": 3 },
        { "label": "Total Prize Pool",  "value": "₹17.5L+", "icon": "feedback", "display_order": 4 }
    ],
    "highlights": [
        { "icon": "code", "title": "Build by Sunset", "description": "Overnight 24-hour sprint", "display_order": 0 },
        { "icon": "shield", "title": "Cyber Security Conclave", "description": "ISC2 NJ Chapter virtual conclave", "display_order": 1 },
        { "icon": "briefcase", "title": "Meet Who Hire", "description": "On-the-spot placement and internship offers", "display_order": 2 }
    ],
    "about_cards": [
        { "icon": "book", "title": "Learn", "description": "Industry insights from leading cybersecurity & AI practitioners" },
        { "icon": "network", "title": "Connect", "description": "Recruiters and hiring managers in the room" },
        { "icon": "trending", "title": "Grow", "description": "₹17,50,000+ total rewards and sponsorship pool" }
    ],
    "testimonials": [
        { "name": "Karthik R.", "branch": "Computer Science", "department": "Computer Science", "year": "Final Year", "quote": "HackWave set a new benchmark for college tech fests. The on-the-spot interviews were real.", "rating": 5, "visible": True, "sort_order": 0 },
        { "name": "Meera P.", "branch": "Information Technology", "department": "Information Technology", "year": "Pre-final Year", "quote": "The Cyber Security Conclave with the ISC2 NJ chapter opened my eyes to real security pathways.", "rating": 5, "visible": True, "sort_order": 1 }
    ],
    "timeline": [
        { "icon": "star", "title": "Day 1: Kickoff & Build Sprint", "description": "Opening keynote, problem statement release, and 24-hour build" },
        { "icon": "shield", "title": "Day 1 Evening: Cyber Conclave", "description": "ISC2 New Jersey virtual session and Q&A" },
        { "icon": "code", "title": "Day 2 Morning: Demos & Judging", "description": "Pitch deck presentation to industry judges" },
        { "icon": "award", "title": "Day 2 Afternoon: Awards & Offers", "description": "Distribution of prizes, visas, and internship letters" }
    ],
    "speakers": [
        { "name": "Stan Mierzwa, Ph.D.", "position": "Director, Center for Cybersecurity", "company": "Kean University", "location": "Union, New Jersey, USA", "linkedin_url": "https://linkedin.com/in/stanmierzwa", "bio": "Leading cybersecurity education and research.", "is_panel_member": True, "category": "International Panel", "sort_order": 0, "visible": True },
        { "name": "Ken Fishkin", "position": "President", "company": "ISC2 New Jersey Chapter", "location": "New Jersey, USA", "linkedin_url": "https://linkedin.com/in/kfishkin", "bio": "Champion for cybersecurity career entry from university campus.", "is_panel_member": True, "category": "International Panel", "sort_order": 1, "visible": True },
        { "name": "Sharon Kelley", "position": "Board Member", "company": "ISC2 New Jersey Chapter", "location": "Hoboken, New Jersey, USA", "linkedin_url": "https://linkedin.com/in/sharon-kelley-0292181", "bio": "Security leader, educator, and governance mentor.", "is_panel_member": True, "category": "International Panel", "sort_order": 2, "visible": True },
        { "name": "Jeremy Livingston", "position": "CISO & Deputy CIO", "company": "Stevens Institute of Technology", "location": "Effort, Pennsylvania, USA", "linkedin_url": "https://linkedin.com/in/jeremylivin", "bio": "Leading cybersecurity and higher ed IT infrastructure.", "is_panel_member": True, "category": "International Panel", "sort_order": 3, "visible": True },
        { "name": "Suman Kalia", "position": "Associate Professor & Chair, Computer Science", "company": "Saint Peter's University", "location": "Jersey City, New Jersey, USA", "linkedin_url": "https://linkedin.com/in/suman-kalia-300b521", "bio": "Academic leader in algorithms and security engineering.", "is_panel_member": True, "category": "International Panel", "sort_order": 4, "visible": True },
        { "name": "Jonna Dheeraj", "position": "Account Delivery & Program Management", "company": "Embedded SW · AI · VLSI · 5G · IoT", "location": "Hyderabad, India", "bio": "Building high-performance embedded systems.", "is_panel_member": False, "category": "Voices That Build", "sort_order": 5, "visible": True },
        { "name": "Harish Kotra", "position": "DevX Lead", "company": "Quirq", "location": "Hyderabad, India", "bio": "Developer relations leader and community builder.", "is_panel_member": False, "category": "Voices That Build", "sort_order": 6, "visible": True },
        { "name": "M Avinash Rao", "position": "Client Account Manager", "company": "Deloitte", "location": "Hyderabad, India", "bio": "Enterprise tech consulting and digital delivery expert.", "is_panel_member": False, "category": "Voices That Build", "sort_order": 7, "visible": True },
        { "name": "Gopichand Anumolu", "position": "Founder", "company": "ATLAST", "location": "Hyderabad, India", "bio": "Startup founder engineering developer tools.", "is_panel_member": False, "category": "Voices That Build", "sort_order": 8, "visible": True }
    ],
    "categories": [
        { "name": "AI That Solves a Real Problem", "description": "Build an AI application that solves a meaningful, real-world problem with high value.", "icon": "target", "color": "#F43F5E" },
        { "name": "Beyond the Chatbot", "description": "Reimagine AI interaction via voice, visual, workflows, and automation.", "icon": "rocket", "color": "#8B5CF6" },
        { "name": "AI for Builders", "description": "Developer and creator tools that remove friction and accelerate workflows.", "icon": "wrench", "color": "#3B82F6" },
        { "name": "Autonomous AI Workflows", "description": "Multi-step reasoning, tool-using autonomous agent systems.", "icon": "cpu", "color": "#10B981" },
        { "name": "Build the Unexpected", "description": "Original, creative, and ambitious concepts that surprise and delight.", "icon": "sparkles", "color": "#F59E0B" }
    ],
    "schedule": [
        { "time": "08:00 AM", "title": "Check-in & Kit Collection", "description": "QR entry passes scanned, badge and t-shirt distribution.", "session_type": "break", "day": 1 },
        { "time": "09:30 AM", "title": "Opening Keynote & Problem Releases", "description": "Introduction of 7 verticals and tracks.", "session_type": "keynote", "day": 1 },
        { "time": "06:00 PM", "title": "Cyber Security Conclave (Virtual)", "description": "Live virtual stream with ISC2 New Jersey Chapter.", "session_type": "panel", "day": 1 },
        { "time": "09:00 AM", "title": "Final Submission & Judging", "description": "Evaluation by expert panels.", "session_type": "activity", "day": 2 },
        { "time": "12:00 PM", "title": "Valedictory & Prize Distribution", "description": "Grand pool & visa awards ceremony.", "session_type": "activity", "day": 2 }
    ],
    "panels": [
        { "topic": "Cyber Security Trends & Pathways", "description": "Global insights from ISC2 NJ Chapter panelists.", "panelists": ["Stan Mierzwa, Ph.D.", "Ken Fishkin", "Sharon Kelley", "Jeremy Livingston", "Suman Kalia"] }
    ],
    "faqs": [
        { "question": "Who can register?", "answer": "Students across all engineering and technology colleges with a valid student ID." },
        { "question": "What is the team size?", "answer": "Individual or teams of 2 to 5 members." },
        { "question": "What is included in the ticket?", "answer": "Full access to 7 verticals, 4 meal coupons, official t-shirt, participation certificate, and judging entry." }
    ],
    "eligibility": "Undergraduate and postgraduate students from any recognised institute.",
    "prize_pool": {
        "total": "₹17,50,000+",
        "tracks": "₹50,000",
        "grand_pool": "₹2,00,000",
        "wehive_germany": "₹15,00,000",
        "visas": "2 Business Visas",
        "other_prizes": [
            "2 Business Visas sponsored in full",
            "Up to ₹15,00,000 Germany Master's Sponsorship",
            "₹2,00,000 Mega Grand Pool",
            "₹50,000 Hackathon Tracks"
        ]
    },
    "team_composition": "Teams of 2–5 members recommended.",
    "partners": [
        { "name": "WeHive", "kind": "visa_partner", "logo_url": None },
        { "name": "CodeSpectra", "kind": "sponsor", "logo_url": None },
        { "name": "Featherless", "kind": "sponsor", "logo_url": None }
    ],
    "sponsors": [
        { "name": "WeHive Consulting", "tier": "Visa & Global Partner", "website_url": "https://wehive.com", "logo_url": None, "priority": 0 }
    ],
    "perks": [
        { "name": "Networking with Industry Leaders", "description": "Direct access to professionals from Google, Microsoft, and startups", "value": "Live", "icon": "users" },
        { "name": "Hackathon Prizes", "description": "₹2,00,000 Mega Grand Pool (₹50,000 Track Pool)", "value": "₹2,00,000", "icon": "trophy" },
        { "name": "Certificates for all", "description": "Participation and winner certificates with QR verification", "value": "Verifiable", "icon": "award" },
        { "name": "Free Food & Refreshments", "description": "Meals, snacks, and beverages throughout the overnight sprint", "value": "Included", "icon": "coffee" },
        { "name": "Internship Opportunities", "description": "On-the-spot internship offers from partner companies", "value": "Live", "icon": "briefcase" },
        { "name": "Cyber Security Certs", "description": "ISC2-powered cert prep track with global panelists", "value": "Premium", "icon": "shield" },
        { "name": "Open Source Bounties", "description": "Bounties and prizes for best open-source contributions", "value": "Live", "icon": "code" },
        { "name": "Workshop Kits", "description": "Hands-on lab materials for AI, Security and Cloud tracks", "value": "Included", "icon": "wrench" },
        { "name": "Exclusive Swag", "description": "HackWave 3.0 t-shirt, stickers, and badges for all participants", "value": "Included", "icon": "shirt" }
    ],
    "ticker_messages": [
        { "text": "HackWave 3.0 — National-Level 24-Hour Tech Fest" },
        { "text": "7 Verticals · AI, Security, Hiring & Firesides" },
        { "text": "₹2,00,000 Mega Grand Pool · ₹50,000 Track Pool" },
        { "text": "Certificates · Internship offers · Swag & Meal Coupons" },
        { "text": "September 04–05, 2026 · SNIST Campus, Hyderabad" },
        { "text": "Built with love for students across all campuses" }
    ],
    "cyber_conclave": {
        "enabled": True,
        "badge": "INTERNATIONAL VIRTUAL CONCLAVE",
        "title": "Cyber Security with AI",
        "subtitle": "ISC2 New Jersey Chapter × StudentAlumni.ai — Global insights for students building a career in security",
        "date_label": "Friday, September 4, 2026",
        "time_label": "6:00 PM IST · 8:30 AM ET",
        "sessions": [
            { "title": "Global security trends", "description": "Where the threat landscape is moving." },
            { "title": "AI on both sides", "description": "How AI is reshaping defence and attack." },
            { "title": "Certifications that matter", "description": "CISSP, CC and the paths worth it." },
            { "title": "Career pathways", "description": "How to enter the field from campus." }
        ]
    },
    "handbook_url": "/HackWave_3.0_Event_Handbook.pdf",
    "downloads": [
        { "title": "HackWave 3.0 Event Handbook", "description": "Official participant guide & 7 verticals rules", "file_url": "/HackWave_3.0_Event_Handbook.pdf", "file_size": "2.1 MB", "category": "Handbook" }
    ],
    "videos": [
        {
            "title": "HackWave 3.0 SNIST Official Teaser",
            "video_url": "https://www.youtube.com/watch?v=M576WGiDBdQ",
            "thumbnail_url": "/images/hackwave/hackwave_main_poster.png",
            "description": "Watch the official teaser for HackWave 3.0 at SNIST — 7 Verticals, ₹17,50,000+ Prize & Sponsorship Pool.",
            "platform": "youtube"
        }
    ],
    "gallery": [
        { "url": "/images/hackwave/hackwave_main_poster.png", "caption": "Official HackWave Poster", "alt": "HackWave 3.0 SNIST", "featured": True, "order": 0, "hero": True },
        { "url": "/images/hackwave/hackwave_full_programme.png", "caption": "Full Programme Guide", "alt": "Programme Guide", "order": 1 }
    ],
    "gallery_layout": "grid",
    "cta_title": "Register for HackWave 3.0!",
    "cta_subtitle": "Experience the overnight build sprint at SNIST.",
    "cta_button_text": "Get Entry Pass",
    "cta_url": None,
    "seo_title": "HackWave 3.0 — SNIST 24-Hour Tech Fest",
    "seo_description": "Join HackWave 3.0 at SNIST for overnight hackathon, international cybersecurity conclave, and hiring.",
    "seo_keywords": "SNIST, HackWave 3.0, Hackathon, Cybersecurity, Student Alumni",
    "sections": dict(DEFAULT_SECTIONS),
    "registration": {
        "enabled": True,
        "fee": 599,
        "individual_fee": 599,
        "team_fee": 2495,
        "currency": "INR",
        "max_seats": 985,
        "deadline": "2026-09-04T13:00:00+05:30",
        "payment_note": "Includes 4 meals, swag, hackathon entry, and certificate.",
        "payment_url": None,
        "poster_images": [
            "/images/hackwave/hackwave_main_poster.png",
            "/images/hackwave/hackwave_full_programme.png"
        ],
        "contact_phones": [
            "91214 95077",
            "84669 65800"
        ]
    },
    "created_at": _now(),
    "updated_at": _now(),
    "created_by": "system"
}

DEFAULT_SHOWCASE_SEED = VNR_SHOWCASE_SEED


async def seed_echo_showcase(db: AsyncIOMotorDatabase):
    """Seed SNIST and VNR showcases if missing, and ensure gallery_layout exists."""
    try:
        # 1. Seed SNIST if missing
        snist_existing = await db.echo_showcases.find_one(_slug_query("snist"))
        if not snist_existing:
            s_doc = dict(SNIST_SHOWCASE_SEED)
            s_doc["created_at"] = _now()
            s_doc["updated_at"] = _now()
            await db.echo_showcases.insert_one(s_doc)
            print("[ECHO CMS] Seeded default snist showcase")

        # 2. Seed VNR if missing
        vnr_existing = await db.echo_showcases.find_one(_slug_query("vnr-echo-2026"))
        if not vnr_existing:
            v_doc = dict(VNR_SHOWCASE_SEED)
            v_doc["created_at"] = _now()
            v_doc["updated_at"] = _now()
            await db.echo_showcases.insert_one(v_doc)
            print("[ECHO CMS] Seeded default vnr-echo-2026 showcase")

        await db.echo_showcases.update_many({"gallery_layout": {"$exists": False}}, {"$set": {"gallery_layout": "grid"}})
    except Exception as e:
        print(f"[ECHO CMS] Seed warning: {e}")


