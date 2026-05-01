# 🎯 Dashboard Test Accounts — Validation Reference

**Universal password for ALL accounts: `TestPass@123`**

> Two flavours of test accounts:
> 1. **Tier-based** (`<name>@student.demo`) — validate Bronze/Silver/Gold/Platinum visuals
> 2. **Persona-based** (`<persona><n>@persona.demo`) — validate workflow scenarios

---

# 🎭 PERSONA TEST ACCOUNTS — Workflow Scenarios

Each persona has 3 dedicated accounts to test specific dashboard states.

## 🎓 Student Personas — `/student-portal`

| Persona | Email | Name | College | Skills | Bookings | Onboarded |
|---------|-------|------|---------|--------|----------|-----------|
| **🌱 Beginner Student** | `beginner1@persona.demo` | Yuvraj Khanna | Mumbai University | 0 | 0 | ✅ |
| **🌱 Beginner Student** | `beginner2@persona.demo` | Pranav Murthy | DAIICT Gandhinagar | 0 | 0 | ✅ |
| **🌱 Beginner Student** | `beginner3@persona.demo` | Sara Mathur | Chandigarh University | 0 | 0 | ✅ |
| **📅 Student w/ Mentor Bookings** | `booked1@persona.demo` | Veer Kapoor | NIT Calicut | 6 | 9 | ✅ |
| **📅 Student w/ Mentor Bookings** | `booked2@persona.demo` | Rudra Rao | IIIT Hyderabad | 6 | 3 | ✅ |
| **📅 Student w/ Mentor Bookings** | `booked3@persona.demo` | Nidhi Ghosh | Manipal Institute of Tech | 6 | 3 | ✅ |
| **🎟️ Student w/ Event RSVPs** | `enrolled1@persona.demo` | Atharv Das | MIT Manipal | 4 | 0 | ✅ |
| **🎟️ Student w/ Event RSVPs** | `enrolled2@persona.demo` | Kabir Bedi | SSN Chennai | 4 | 0 | ✅ |
| **🎟️ Student w/ Event RSVPs** | `enrolled3@persona.demo` | Shaurya Ghosh | Hindu College Delhi | 4 | 0 | ✅ |
| **⏳ Incomplete Profile Student** | `incomplete1@persona.demo` | Yash Saxena | — | 0 | 0 | ❌ |
| **⏳ Incomplete Profile Student** | `incomplete2@persona.demo` | Dhruv Nair | — | 0 | 0 | ❌ |
| **⏳ Incomplete Profile Student** | `incomplete3@persona.demo` | Reyansh Mishra | — | 0 | 0 | ❌ |
| **🛠️ Student w/ Workshop Flows** | `workshop1@persona.demo` | Advik Mukherjee | NIT Trichy | 8 | 0 | ✅ |
| **🛠️ Student w/ Workshop Flows** | `workshop2@persona.demo` | Vikram Menon | VIT Chennai | 8 | 0 | ✅ |
| **🛠️ Student w/ Workshop Flows** | `workshop3@persona.demo` | Anaya Shukla | IIM Calcutta | 8 | 0 | ✅ |

## 👨‍🏫 Mentor Personas — `/mentor-portal`

| Persona | Email | Name | Title @ Company | Status | Sessions | Rating | Rate |
|---------|-------|------|------------------|--------|----------|--------|------|
| **📅 Active Mentor (sessions today)** | `mentor-active1@persona.demo` | Aadhya Joshi | Tech Lead @ BYJU'S | approved | 22 | 4.6 | ₹1499 |
| **📅 Active Mentor (sessions today)** | `mentor-active2@persona.demo` | Karan Venkatesh | Tech Lead @ MPL | approved | 22 | 4.6 | ₹1499 |
| **📅 Active Mentor (sessions today)** | `mentor-active3@persona.demo` | Disha Roy | Tech Lead @ Zomato | approved | 22 | 4.6 | ₹1499 |
| **📝 Course Creator Mentor** | `mentor-creator1@persona.demo` | Disha Bhatnagar | Staff Engineer @ Ola | approved | 45 | 4.8 | ₹2499 |
| **📝 Course Creator Mentor** | `mentor-creator2@persona.demo` | Tanvi Shah | Staff Engineer @ Atlassian | approved | 45 | 4.8 | ₹2499 |
| **📝 Course Creator Mentor** | `mentor-creator3@persona.demo` | Pari Goyal | Staff Engineer @ PhonePe | approved | 45 | 4.8 | ₹2499 |
| **💰 High-Earner Mentor** | `mentor-earner1@persona.demo` | Saanvi Walia | Engineering Manage @ Microsoft | approved | 78 | 4.7 | ₹2999 |
| **💰 High-Earner Mentor** | `mentor-earner2@persona.demo` | Rahul Mehta | Engineering Manage @ Morgan Stanley | approved | 78 | 4.7 | ₹2999 |
| **💰 High-Earner Mentor** | `mentor-earner3@persona.demo` | Praveen Krishnan | Engineering Manage @ ONGC | approved | 78 | 4.7 | ₹2999 |
| **🌱 New Mentor (just approved)** | `mentor-new1@persona.demo` | Akash Mathur | Senior Software En @ Mphasis | approved | 0 | 0.0 | ₹999 |
| **🌱 New Mentor (just approved)** | `mentor-new2@persona.demo` | Navya Khanna | Senior Software En @ IBM India | approved | 0 | 0.0 | ₹999 |
| **🌱 New Mentor (just approved)** | `mentor-new3@persona.demo` | Om Yadav | Senior Software En @ Mindtree | approved | 0 | 0.0 | ₹999 |
| **⏳ Pending Approval Mentor** | `mentor-pending1@persona.demo` | Priya Ghosh | Software Engineer @ Morgan Stanley | pending | 0 | 0.0 | ₹799 |
| **⏳ Pending Approval Mentor** | `mentor-pending2@persona.demo` | Veer Kashyap | DevOps Engineer @ Razorpay X | pending | 0 | 0.0 | ₹799 |
| **⏳ Pending Approval Mentor** | `mentor-pending3@persona.demo` | Ishaan Choudhary | Backend Developer @ Niti Aayog | pending | 0 | 0.0 | ₹799 |
| **⭐ Top-Rated Mentor (4.9+)** | `mentor-top1@persona.demo` | Mira Naidu | Principal Engineer @ Morgan Stanley | approved | 124 | 4.95 | ₹4999 |
| **⭐ Top-Rated Mentor (4.9+)** | `mentor-top2@persona.demo` | Manav Goel | Principal Engineer @ Salesforce | approved | 124 | 4.95 | ₹4999 |
| **⭐ Top-Rated Mentor (4.9+)** | `mentor-top3@persona.demo` | Kiara Sharma | Principal Engineer @ Goldman Sachs | approved | 124 | 4.95 | ₹4999 |

## 🛡️ Admin Personas — `/super-admin-portal`

| Persona | Email | Name | Scope | Super | Permissions |
|---------|-------|------|-------|-------|-------------|
| **📊 Analytics-only Admin (read-only)** | `admin-analytics1@persona.demo` | Anaya Khanna | analytics | — | view analytics |
| **📊 Analytics-only Admin (read-only)** | `admin-analytics2@persona.demo` | Aditya Arora | analytics | — | view analytics |
| **📊 Analytics-only Admin (read-only)** | `admin-analytics3@persona.demo` | Aarav Khanna | analytics | — | view analytics |
| **👤 College-scoped Admin** | `admin-college1@persona.demo` | Yuvraj Banerjee | college | — | users, view analytics |
| **👤 College-scoped Admin** | `admin-college2@persona.demo` | Anaya Nair | college | — | users, view analytics |
| **👤 College-scoped Admin** | `admin-college3@persona.demo` | Dhruv Walia | college | — | users, view analytics |
| **💵 Finance/Payouts Admin** | `admin-finance1@persona.demo` | Avni Saxena | finance | — | payouts, view analytics |
| **💵 Finance/Payouts Admin** | `admin-finance2@persona.demo` | Yuvraj Walia | finance | — | payouts, view analytics |
| **💵 Finance/Payouts Admin** | `admin-finance3@persona.demo` | Disha Desai | finance | — | payouts, view analytics |
| **🔒 Content Moderator Admin** | `admin-mod1@persona.demo` | Rohan Rao | moderation | — | view analytics, moderate content |
| **🔒 Content Moderator Admin** | `admin-mod2@persona.demo` | Pranav Sood | moderation | — | view analytics, moderate content |
| **🔒 Content Moderator Admin** | `admin-mod3@persona.demo` | Vivaan Iyer | moderation | — | view analytics, moderate content |
| **🛡️ Super Admin (full access)** | `admin-super1@persona.demo` | Rudra Kapoor | platform | ✅ | users, payouts, view analytics |
| **🛡️ Super Admin (full access)** | `admin-super2@persona.demo` | Diya Patel | platform | ✅ | users, payouts, view analytics |
| **🛡️ Super Admin (full access)** | `admin-super3@persona.demo` | Ashish Sood | platform | ✅ | users, payouts, view analytics |

## 🏫 College Personas — `/college-portal`

| Persona | Email | College | NAAC | NIRF | Placement % | Onboarded |
|---------|-------|---------|------|------|-------------|-----------|
| **🤝 Strong Alumni Network** | `college-alumni1@persona.demo` | IIM Ahmedabad | A++ | #1 | 80% | ✅ |
| **🤝 Strong Alumni Network** | `college-alumni2@persona.demo` | BITS Goa | A+ | #26 | 80% | ✅ |
| **🤝 Strong Alumni Network** | `college-alumni3@persona.demo` | IIM Indore | A++ | #6 | 80% | ✅ |
| **🏗️ Building Placement Cell** | `college-building1@persona.demo` | PES University | A | #145 | 55% | ✅ |
| **🏗️ Building Placement Cell** | `college-building2@persona.demo` | MS Ramaiah Institute | A | #150 | 55% | ✅ |
| **🏗️ Building Placement Cell** | `college-building3@persona.demo` | PSG Coimbatore | A | #130 | 55% | ✅ |
| **🎯 Active Drives Scheduled** | `college-drives1@persona.demo` | NIT Rourkela | A+ | #19 | 72% | ✅ |
| **🎯 Active Drives Scheduled** | `college-drives2@persona.demo` | NIT Calicut | A+ | #23 | 72% | ✅ |
| **🎯 Active Drives Scheduled** | `college-drives3@persona.demo` | Manipal Institute of Tech | A+ | #56 | 72% | ✅ |
| **📊 High-Placement College** | `college-high1@persona.demo` | IIT Kanpur | A++ | #4 | 92% | ✅ |
| **📊 High-Placement College** | `college-high2@persona.demo` | IIT Hyderabad | A++ | #8 | 92% | ✅ |
| **📊 High-Placement College** | `college-high3@persona.demo` | IIT Hyderabad | A++ | #8 | 92% | ✅ |
| **🌱 Just-Onboarded College** | `college-onboarding1@persona.demo` | CMC Vellore | A++ | #3 | 15% | ❌ |
| **🌱 Just-Onboarded College** | `college-onboarding2@persona.demo` | NALSAR Hyderabad | A++ | #2 | 15% | ❌ |
| **🌱 Just-Onboarded College** | `college-onboarding3@persona.demo` | CMC Vellore | A++ | #3 | 15% | ❌ |

---

# 🏅 TIER TEST ACCOUNTS — Visual Validation (Bronze→Platinum)

## 🎓 STUDENT — Tier Visual

| Tier | Email | Name | College | CGPA | Skills | Score |
|------|-------|------|---------|------|--------|-------|
| **Platinum** | `shruti.tiwari867@student.demo` | Shruti Tiwari | VIT Chennai | 9.19 | 9 | **100** |
| **Platinum** | `pari.raman658@student.demo` | Pari Raman | KL University | 8.13 | 9 | **100** |
| **Platinum** | `siddharth.rajan886@student.demo` | Siddharth Rajan | IISER Pune | 7.92 | 8 | **100** |
| **Platinum** | `gauri.sengupta870@student.demo` | Gauri Sengupta | IISER Kolkata | 7.15 | 9 | **100** |
| **Platinum** | `vivaan.khanna729@student.demo` | Vivaan Khanna | SRM Chennai | 6.55 | 8 | **100** |
| **Gold** | `praveen.sharma742@student.demo` | Praveen Sharma | ISI Kolkata | 7.52 | 5 | **79** |
| **Gold** | `vikram.das713@student.demo` | Vikram Das | NIT Surathkal | 6.73 | 6 | **79** |
| **Gold** | `tara.dubey759@student.demo` | Tara Dubey | SRM Chennai | 8.55 | 5 | **79** |
| **Gold** | `priya.goyal750@student.demo` | Priya Goyal | Anna University | 7.72 | 6 | **79** |
| **Gold** | `aarush.reddy653@student.demo` | Aarush Reddy | NIT Warangal | 8.7 | 6 | **79** |
| **Silver** | `myra.bhatnagar395@student.demo` | Myra Bhatnagar | Karunya University | 7.07 | 4 | **59** |
| **Silver** | `ashish.patel384@student.demo` | Ashish Patel | RV College Bangalore | 8.72 | 4 | **59** |
| **Silver** | `karthik.ghosh523@student.demo` | Karthik Ghosh | SSN Chennai | 9.28 | 4 | **59** |
| **Silver** | `ira.goyal495@student.demo` | Ira Goyal | Pondicherry University | 8.27 | 4 | **59** |
| **Silver** | `shruti.chopra348@student.demo` | Shruti Chopra | IIIT Delhi | 9.35 | 5 | **59** |
| **Bronze** | `myra.tandon54@student.demo` | Myra Tandon | PDPU Gandhinagar | 6.44 | 3 | **39** |
| **Bronze** | `anaya.goyal12@student.demo` | Anaya Goyal | BMS College Bangalore | 6.8 | 3 | **39** |
| **Bronze** | `gauri.sharma77@student.demo` | Gauri Sharma | GLA Mathura | 6.68 | 3 | **39** |
| **Bronze** | `ramesh.pillai62@student.demo` | Ramesh Pillai | Mahindra University | 7.33 | 3 | **39** |
| **Bronze** | `priya.raman5@student.demo` | Priya Raman | JSS Noida | 6.26 | 3 | **39** |

## 👨‍🏫 MENTOR — Tier Visual

| Tier | Email | Name | Company | Yrs | Sessions | Rating | Score |
|------|-------|------|---------|-----|----------|--------|-------|
| **Platinum** | `arnav.das183@mentor.demo` | Arnav Das | OpenAI | 23 | 114 | 4.978049761330436 | **100** |
| **Platinum** | `rudra.kapoor182@mentor.demo` | Rudra Kapoor | Apple | 23 | 172 | 4.987984094664818 | **100** |
| **Platinum** | `shruti.patel185@mentor.demo` | Shruti Patel | Microsoft | 24 | 199 | 4.932532834965406 | **99** |
| **Platinum** | `arjun.shukla184@mentor.demo` | Arjun Shukla | OpenAI | 19 | 248 | 4.942841123907932 | **99** |
| **Platinum** | `dhruv.agarwal181@mentor.demo` | Dhruv Agarwal | Meta | 15 | 171 | 4.844689213583728 | **99** |
| **Gold** | `ananya.bhatnagar162@mentor.demo` | Ananya Bhatnagar | Reliance Jio | 10 | 80 | 4.7312179432054 | **79** |
| **Gold** | `neha.pillai121@mentor.demo` | Neha Pillai | Flipkart | 10 | 46 | 4.614737548748755 | **79** |
| **Gold** | `yash.raman175@mentor.demo` | Yash Raman | PhonePe | 8 | 63 | 4.635849251401435 | **79** |
| **Gold** | `kavya.mathur141@mentor.demo` | Kavya Mathur | BYJU'S | 9 | 80 | 4.6591035425195955 | **79** |
| **Gold** | `yash.yadav127@mentor.demo` | Yash Yadav | Zomato | 11 | 39 | 4.76082137060509 | **78** |
| **Silver** | `aarav.sood59@mentor.demo` | Aarav Sood | IBM India | 7 | 23 | 4.427491877950747 | **59** |
| **Silver** | `vivaan.das69@mentor.demo` | Vivaan Das | HCL Tech | 7 | 21 | 4.557103426609977 | **59** |
| **Silver** | `aarav.mittal107@mentor.demo` | Aarav Mittal | Mindtree | 7 | 22 | 4.562145633467823 | **59** |
| **Silver** | `shaurya.sinha52@mentor.demo` | Shaurya Sinha | Mindtree | 7 | 24 | 4.5043892584937 | **59** |
| **Silver** | `kabir.malhotra85@mentor.demo` | Kabir Malhotra | ICICI Bank | 7 | 17 | 4.502898493075984 | **58** |
| **Bronze** | `shaurya.das15@mentor.demo` | Shaurya Das | BharatPe | 3 | 8 | 4.230663933401842 | **39** |
| **Bronze** | `tanay.sen29@mentor.demo` | Tanay Sen | BharatPe | 3 | 5 | 4.138730778844097 | **39** |
| **Bronze** | `tanvi.chopra2@mentor.demo` | Tanvi Chopra | BharatPe | 3 | 8 | 4.201287887119521 | **39** |
| **Bronze** | `rohit.sharma45@mentor.demo` | Rohit Sharma | Khatabook | 3 | 8 | 4.151104337886808 | **39** |
| **Bronze** | `sai.verma38@mentor.demo` | Sai Verma | Cars24 | 3 | 5 | 4.106096410555292 | **39** |

## 🏫 COLLEGE — Tier Visual

| Tier | Email | College | NAAC | NIRF | Placement % | Score |
|------|-------|---------|------|------|-------------|-------|
| **Platinum** | `iitb@university.in` | IIT Bombay | A++ | #3 | 96% | **95** |
| **Platinum** | `admin2@iitdelhi.demo` | IIT Delhi | A++ | #2 | 95% | **81** |
| **Platinum** | `admin3@iitmadras.demo` | IIT Madras | A++ | #1 | 94% | **84** |
| **Platinum** | `admin4@iitkanpur.demo` | IIT Kanpur | A++ | #4 | 93% | **84** |
| **Platinum** | `admin5@iitkharagpur.demo` | IIT Kharagpur | A++ | #5 | 92% | **98** |
| **Gold** | `admin19@nitcalicut.demo` | NIT Calicut | A+ | #23 | 82% | **79** |
| **Gold** | `admin22@bitsgoa.demo` | BITS Goa | A+ | #26 | 87% | **79** |
| **Gold** | `admin23@bitshyderabad.demo` | BITS Hyderabad | A+ | #29 | 86% | **73** |
| **Gold** | `admin24@iiithyderabad.demo` | IIIT Hyderabad | A+ | #47 | 95% | **72** |
| **Gold** | `iiitb@university.in` | IIIT Bangalore | A+ | #60 | 92% | **67** |
| **Silver** | `admin45@ststephenscollege.demo` | St Stephens College | A | #95 | 68% | **59** |
| **Silver** | `admin65@nirmauniversity.demo` | Nirma University | A | #185 | 73% | **55** |
| **Silver** | `admin71@rnsinstitutebangalor.demo` | RNS Institute Bangalor | B | #280 | 55% | **59** |
| **Silver** | `admin74@galgotiasuniversity.demo` | Galgotias University | A | #240 | 60% | **55** |
| **Silver** | `admin79@gdgoenkauniversity.demo` | GD Goenka University | B | #290 | 50% | **56** |

## 🛡️ SUPER ADMIN

| Type | Email | Name |
|------|-------|------|
| **Super Admin** | `admin@careerpath.app` | Platform Admin (default) |
| Super Admin | `disha.menon1@admin.demo` | Disha Menon |
| Super Admin | `vikram.sen2@admin.demo` | Vikram Sen |
| Super Admin | `kavya.khurana3@admin.demo` | Kavya Khurana |
| Super Admin | `pranav.pandey4@admin.demo` | Pranav Pandey |
| Super Admin | `naman.sharma5@admin.demo` | Naman Sharma |

---

# ✅ Validation Checklist by Persona

## Student Dashboard
- 🌱 **Beginner** — empty skills, 0 projects, profile completion banner shown
- ⏳ **Incomplete** — should see onboarding prompt / redirect
- 📅 **Booked** — 'My Bookings' shows 3 confirmed sessions, calendar entries visible
- 🎟️ **Enrolled** — 'My Events' shows 3 RSVPs with countdown timers
- 🛠️ **Workshop** — 'Workshops' tab shows registered + completed with certificate URL

## Mentor Dashboard
- 🌱 **New** — 0 sessions stat, 'Get your first booking' empty state CTA
- ⏳ **Pending** — 'Awaiting Approval' banner, limited dashboard access
- 📅 **Active** — 2 sessions scheduled today (10am, 2pm), Join button live
- 💰 **High-earner** — 6 months of payouts, total earnings stat populated
- ⭐ **Top-rated** — 4.95★ rating, 'Top Mentor' badge, Platinum tier
- 📝 **Creator** — 'My Courses' tab shows 3 published courses

## Admin Dashboard
- 🛡️ **Super** — full sidebar, all 26 sub-views accessible
- 👤 **College-scoped** — only sees their college's students/data
- 📊 **Analytics** — read-only, no edit buttons, charts visible
- 💵 **Finance** — Payouts, Wallet, Subscriptions sub-views only
- 🔒 **Moderator** — Content Approval queue + Violations sub-views

## College Dashboard
- 🌱 **Onboarding** — empty state, 'Add your first student' CTA, low Bronze tier
- 📊 **High-placement** — 92% placement, Platinum tier, top recruiters list
- 🏗️ **Building** — 55% placement, Silver tier, mid-stage CTAs
- 🎯 **Active drives** — Upcoming Events shows multiple recruiter drives
- 🤝 **Alumni** — Alumni Network sub-view populated

---

## 🔁 Regenerate everything
```bash
cd /app/backend
python3 seed_realistic.py --reset            # 1360 tier-based users
python3 seed_personas.py --reset             # 63 persona-based users + supporting data
python3 generate_test_account_list.py        # rebuild this markdown file
python3 export_seed_data.py                  # export to JSON+CSV
```

_Generated by `/app/backend/generate_test_account_list.py`_