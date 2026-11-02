"""Enhancement #10 — Multi-language DPDP Act 2023 Consent.

Consent forms in 8 Indian languages with proper script rendering,
HTML form generation, and consent recording with language tracking.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from .database import consent_col


LANGUAGES = [
    {"code": "en", "name": "English", "native_name": "English"},
    {"code": "hi", "name": "Hindi", "native_name": "हिन्दी"},
    {"code": "te", "name": "Telugu", "native_name": "తెలుగు"},
    {"code": "ta", "name": "Tamil", "native_name": "தமிழ்"},
    {"code": "kn", "name": "Kannada", "native_name": "ಕನ್ನಡ"},
    {"code": "ml", "name": "Malayalam", "native_name": "മലയാളം"},
    {"code": "mr", "name": "Marathi", "native_name": "मराठी"},
    {"code": "bn", "name": "Bengali", "native_name": "বাংলা"},
]

CONSENT_TEMPLATES: dict[str, dict[str, str]] = {
    "en": {
        "title": "Data Processing Consent",
        "purpose": (
            "We collect your name, email, phone number, age, city, education, "
            "skills, and interests to match you with relevant offers from our "
            "brand partners. Your data will be shared with brands whose offers "
            "match your profile."
        ),
        "retention": (
            "Your data will be retained for 180 days from the date of consent. "
            "After this period, your data will be automatically deleted unless "
            "you renew your consent."
        ),
        "rights": (
            "Under the Digital Personal Data Protection Act, 2023, you have the "
            "right to withdraw your consent at any time, request access to your "
            "data, request correction of inaccurate data, and request erasure "
            "of your personal data. Withdrawal of consent will not affect the "
            "lawfulness of processing based on consent before its withdrawal."
        ),
        "contact": (
            "For any queries regarding your personal data, contact our Data "
            "Protection Officer at dpo@axiss.in or call +91-XXXXXXXXXX."
        ),
        "accept_label": "I Agree",
        "reject_label": "I Decline",
    },
    "hi": {
        "title": "डेटा प्रोसेसिंग सहमति",
        "purpose": (
            "हम आपका नाम, ईमेल, फ़ोन नंबर, आयु, शहर, शिक्षा, कौशल और रुचियाँ "
            "एकत्र करते हैं ताकि आपको हमारे ब्रांड भागीदारों के प्रासंगिक ऑफ़र से "
            "मिलान किया जा सके। आपका डेटा उन ब्रांडों के साथ साझा किया जाएगा जिनके "
            "ऑफ़र आपकी प्रोफ़ाइल से मेल खाते हैं।"
        ),
        "retention": (
            "आपका डेटा सहमति की तारीख से 180 दिनों तक रखा जाएगा। इस अवधि के बाद, "
            "जब तक आप अपनी सहमति का नवीनीकरण नहीं करते, आपका डेटा स्वचालित रूप से "
            "हटा दिया जाएगा।"
        ),
        "rights": (
            "डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 के तहत, आपको किसी भी "
            "समय अपनी सहमति वापस लेने, अपने डेटा तक पहुँच का अनुरोध करने, गलत "
            "डेटा में सुधार का अनुरोध करने और अपने व्यक्तिगत डेटा को मिटाने का "
            "अनुरोध करने का अधिकार है। सहमति वापस लेने से पहले की गई प्रोसेसिंग "
            "की वैधता प्रभावित नहीं होगी।"
        ),
        "contact": (
            "अपने व्यक्तिगत डेटा से संबंधित किसी भी प्रश्न के लिए, हमारे डेटा "
            "संरक्षण अधिकारी से dpo@axiss.in पर या +91-XXXXXXXXXX पर संपर्क करें।"
        ),
        "accept_label": "मैं सहमत हूँ",
        "reject_label": "मैं असहमत हूँ",
    },
    "te": {
        "title": "డేటా ప్రాసెసింగ్ సమ్మతి",
        "purpose": (
            "మా బ్రాండ్ భాగస్వాముల సంబంధిత ఆఫర్లతో మిమ్మల్ని అనుసంధానం చేయడానికి "
            "మీ పేరు, ఇమెయిల్, ఫోన్ నంబర్, వయస్సు, నగరం, విద్య, నైపుణ్యాలు మరియు "
            "ఆసక్తులను మేము సేకరిస్తాము. మీ ప్రొఫైల్‌కు సరిపోయే ఆఫర్లు ఉన్న "
            "బ్రాండ్‌లతో మీ డేటా భాగస్వామ్యం చేయబడుతుంది."
        ),
        "retention": (
            "మీ డేటా సమ్మతి తేదీ నుండి 180 రోజులు భద్రపరచబడుతుంది. ఈ కాలం తర్వాత, "
            "మీరు మీ సమ్మతిని పునరుద్ధరించకపోతే మీ డేటా స్వయంచాలకంగా తొలగించబడుతుంది."
        ),
        "rights": (
            "డిజిటల్ వ్యక్తిగత డేటా రక్షణ చట్టం, 2023 ప్రకారం, మీరు ఎప్పుడైనా మీ "
            "సమ్మతిని ఉపసంహరించుకోవడానికి, మీ డేటాకు ప్రాప్యత కోరడానికి, తప్పు డేటాను "
            "సరిదిద్దమని కోరడానికి మరియు మీ వ్యక్తిగత డేటాను తొలగించమని కోరడానికి "
            "హక్కు కలిగి ఉన్నారు."
        ),
        "contact": (
            "మీ వ్యక్తిగత డేటాకు సంబంధించిన ఏవైనా ప్రశ్నల కోసం, మా డేటా రక్షణ "
            "అధికారిని dpo@axiss.in వద్ద లేదా +91-XXXXXXXXXX కు సంప్రదించండి."
        ),
        "accept_label": "నేను అంగీకరిస్తున్నాను",
        "reject_label": "నేను తిరస్కరిస్తున్నాను",
    },
    "ta": {
        "title": "தரவு செயலாக்க ஒப்புதல்",
        "purpose": (
            "எங்கள் பிராண்ட் கூட்டாளர்களின் தொடர்புடைய சலுகைகளுடன் உங்களை "
            "இணைக்க உங்கள் பெயர், மின்னஞ்சல், தொலைபேசி எண், வயது, நகரம், கல்வி, "
            "திறன்கள் மற்றும் ஆர்வங்களை நாங்கள் சேகரிக்கிறோம். உங்கள் சுயவிவரத்துடன் "
            "பொருந்தும் சலுகைகள் கொண்ட பிராண்டுகளுடன் உங்கள் தரவு பகிரப்படும்."
        ),
        "retention": (
            "உங்கள் தரவு ஒப்புதல் தேதியிலிருந்து 180 நாட்கள் வரை தக்கவைக்கப்படும். "
            "இந்த காலத்திற்குப் பிறகு, நீங்கள் உங்கள் ஒப்புதலைப் புதுப்பிக்காவிட்டால் "
            "உங்கள் தரவு தானாக நீக்கப்படும்."
        ),
        "rights": (
            "டிஜிட்டல் தனிநபர் தரவு பாதுகாப்புச் சட்டம், 2023 இன் கீழ், எந்த நேரத்திலும் "
            "உங்கள் ஒப்புதலை திரும்பப் பெறவும், உங்கள் தரவுக்கான அணுகலைக் கோரவும், "
            "தவறான தரவைத் திருத்தக் கோரவும், உங்கள் தனிப்பட்ட தரவை அழிக்கக் கோரவும் "
            "உங்களுக்கு உரிமை உள்ளது."
        ),
        "contact": (
            "உங்கள் தனிப்பட்ட தரவு தொடர்பான கேள்விகளுக்கு, எங்கள் தரவு பாதுகாப்பு "
            "அதிகாரியை dpo@axiss.in அல்லது +91-XXXXXXXXXX இல் தொடர்பு கொள்ளுங்கள்."
        ),
        "accept_label": "நான் ஒப்புக்கொள்கிறேன்",
        "reject_label": "நான் மறுக்கிறேன்",
    },
    "kn": {
        "title": "ಡೇಟಾ ಸಂಸ್ಕರಣೆ ಒಪ್ಪಿಗೆ",
        "purpose": (
            "ನಮ್ಮ ಬ್ರ್ಯಾಂಡ್ ಪಾಲುದಾರರ ಸಂಬಂಧಿತ ಆಫರ್‌ಗಳೊಂದಿಗೆ ನಿಮ್ಮನ್ನು "
            "ಹೊಂದಿಸಲು ನಿಮ್ಮ ಹೆಸರು, ಇಮೇಲ್, ಫೋನ್ ಸಂಖ್ಯೆ, ವಯಸ್ಸು, ನಗರ, ಶಿಕ್ಷಣ, "
            "ಕೌಶಲ್ಯಗಳು ಮತ್ತು ಆಸಕ್ತಿಗಳನ್ನು ನಾವು ಸಂಗ್ರಹಿಸುತ್ತೇವೆ. ನಿಮ್ಮ "
            "ಪ್ರೊಫೈಲ್‌ಗೆ ಹೊಂದಿಕೆಯಾಗುವ ಆಫರ್‌ಗಳನ್ನು ಹೊಂದಿರುವ ಬ್ರ್ಯಾಂಡ್‌ಗಳೊಂದಿಗೆ "
            "ನಿಮ್ಮ ಡೇಟಾವನ್ನು ಹಂಚಿಕೊಳ್ಳಲಾಗುತ್ತದೆ."
        ),
        "retention": (
            "ನಿಮ್ಮ ಡೇಟಾವನ್ನು ಒಪ್ಪಿಗೆ ದಿನಾಂಕದಿಂದ 180 ದಿನಗಳವರೆಗೆ ಉಳಿಸಿಕೊಳ್ಳಲಾಗುತ್ತದೆ. "
            "ಈ ಅವಧಿಯ ನಂತರ, ನೀವು ನಿಮ್ಮ ಒಪ್ಪಿಗೆಯನ್ನು ನವೀಕರಿಸದ ಹೊರತು ನಿಮ್ಮ ಡೇಟಾವನ್ನು "
            "ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಅಳಿಸಲಾಗುತ್ತದೆ."
        ),
        "rights": (
            "ಡಿಜಿಟಲ್ ವೈಯಕ್ತಿಕ ಡೇಟಾ ಸಂರಕ್ಷಣಾ ಕಾಯ್ದೆ, 2023 ರ ಅಡಿಯಲ್ಲಿ, ನೀವು ಯಾವುದೇ "
            "ಸಮಯದಲ್ಲಿ ನಿಮ್ಮ ಒಪ್ಪಿಗೆಯನ್ನು ಹಿಂಪಡೆಯಲು, ನಿಮ್ಮ ಡೇಟಾಗೆ ಪ್ರವೇಶವನ್ನು "
            "ಕೋರಲು, ತಪ್ಪಾದ ಡೇಟಾವನ್ನು ತಿದ್ದಲು ಮತ್ತು ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಡೇಟಾವನ್ನು "
            "ಅಳಿಸಲು ಕೋರಲು ಹಕ್ಕಿದೆ."
        ),
        "contact": (
            "ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಡೇಟಾ ಕುರಿತ ಯಾವುದೇ ಪ್ರಶ್ನೆಗಳಿಗೆ, ನಮ್ಮ ಡೇಟಾ ಸಂರಕ್ಷಣಾ "
            "ಅಧಿಕಾರಿಯನ್ನು dpo@axiss.in ನಲ್ಲಿ ಅಥವಾ +91-XXXXXXXXXX ನಲ್ಲಿ ಸಂಪರ್ಕಿಸಿ."
        ),
        "accept_label": "ನಾನು ಒಪ್ಪುತ್ತೇನೆ",
        "reject_label": "ನಾನು ನಿರಾಕರಿಸುತ್ತೇನೆ",
    },
    "ml": {
        "title": "ഡേറ്റ പ്രോസസ്സിംഗ് സമ്മതം",
        "purpose": (
            "ഞങ്ങളുടെ ബ്രാൻഡ് പങ്കാളികളുടെ പ്രസക്തമായ ഓഫറുകളുമായി നിങ്ങളെ "
            "പൊരുത്തപ്പെടുത്തുന്നതിന് നിങ്ങളുടെ പേര്, ഇമെയിൽ, ഫോൺ നമ്പർ, "
            "പ്രായം, നഗരം, വിദ്യാഭ്യാസം, നൈപുണ്യങ്ങൾ, താൽപ്പര്യങ്ങൾ എന്നിവ "
            "ഞങ്ങൾ ശേഖരിക്കുന്നു. നിങ്ങളുടെ പ്രൊഫൈലുമായി പൊരുത്തപ്പെടുന്ന "
            "ഓഫറുകളുള്ള ബ്രാൻഡുകളുമായി നിങ്ങളുടെ ഡേറ്റ പങ്കിടും."
        ),
        "retention": (
            "നിങ്ങളുടെ ഡേറ്റ സമ്മത തീയതി മുതൽ 180 ദിവസം വരെ സൂക്ഷിക്കും. "
            "ഈ കാലയളവിന് ശേഷം, നിങ്ങൾ സമ്മതം പുതുക്കിയില്ലെങ്കിൽ നിങ്ങളുടെ "
            "ഡേറ്റ സ്വയമേവ ഇല്ലാതാക്കപ്പെടും."
        ),
        "rights": (
            "ഡിജിറ്റൽ വ്യക്തിഗത ഡേറ്റ സംരക്ഷണ നിയമം, 2023 പ്രകാരം, ഏത് സമയത്തും "
            "നിങ്ങളുടെ സമ്മതം പിൻവലിക്കാനും, നിങ്ങളുടെ ഡേറ്റയിലേക്ക് "
            "പ്രവേശനം അഭ്യർത്ഥിക്കാനും, തെറ്റായ ഡേറ്റ തിരുത്താനും, നിങ്ങളുടെ "
            "വ്യക്തിഗത ഡേറ്റ ഇല്ലാതാക്കാനും നിങ്ങൾക്ക് അവകാശമുണ്ട്."
        ),
        "contact": (
            "നിങ്ങളുടെ വ്യക്തിഗത ഡേറ്റയെ സംബന്ധിച്ച ഏതെങ്കിലും ചോദ്യങ്ങൾക്ക്, "
            "ഞങ്ങളുടെ ഡേറ്റ പ്രൊട്ടക്ഷൻ ഓഫീസറെ dpo@axiss.in ൽ അല്ലെങ്കിൽ "
            "+91-XXXXXXXXXX ൽ ബന്ധപ്പെടുക."
        ),
        "accept_label": "ഞാൻ സമ്മതിക്കുന്നു",
        "reject_label": "ഞാൻ നിരസിക്കുന്നു",
    },
    "mr": {
        "title": "डेटा प्रक्रिया संमती",
        "purpose": (
            "आमच्या ब्रँड भागीदारांच्या संबंधित ऑफर्सशी तुमची जुळणी करण्यासाठी "
            "आम्ही तुमचे नाव, ईमेल, फोन नंबर, वय, शहर, शिक्षण, कौशल्ये आणि "
            "आवडी गोळा करतो. तुमच्या प्रोफाइलशी जुळणाऱ्या ऑफर्स असलेल्या "
            "ब्रँड्ससोबत तुमचा डेटा शेअर केला जाईल."
        ),
        "retention": (
            "तुमचा डेटा संमती दिनांकापासून 180 दिवसांसाठी ठेवला जाईल. या "
            "कालावधीनंतर, तुम्ही तुमची संमती नूतनीकरण न केल्यास तुमचा डेटा "
            "आपोआप हटवला जाईल."
        ),
        "rights": (
            "डिजिटल वैयक्तिक डेटा संरक्षण कायदा, 2023 अंतर्गत, तुम्हाला कधीही "
            "तुमची संमती मागे घेण्याचा, तुमच्या डेटामध्ये प्रवेश मागण्याचा, "
            "चुकीचा डेटा दुरुस्त करण्याची मागणी करण्याचा आणि तुमचा वैयक्तिक "
            "डेटा हटवण्याची मागणी करण्याचा अधिकार आहे."
        ),
        "contact": (
            "तुमच्या वैयक्तिक डेटाबद्दल कोणत्याही प्रश्नांसाठी, आमच्या डेटा "
            "संरक्षण अधिकाऱ्यांशी dpo@axiss.in वर किंवा +91-XXXXXXXXXX वर "
            "संपर्क साधा."
        ),
        "accept_label": "मी सहमत आहे",
        "reject_label": "मी नकार देतो",
    },
    "bn": {
        "title": "ডেটা প্রসেসিং সম্মতি",
        "purpose": (
            "আমাদের ব্র্যান্ড অংশীদারদের প্রাসঙ্গিক অফারগুলির সাথে আপনাকে "
            "মেলানোর জন্য আমরা আপনার নাম, ইমেল, ফোন নম্বর, বয়স, শহর, শিক্ষা, "
            "দক্ষতা এবং আগ্রহ সংগ্রহ করি। আপনার প্রোফাইলের সাথে মেলে এমন "
            "অফারগুলি সহ ব্র্যান্ডগুলির সাথে আপনার ডেটা ভাগ করা হবে।"
        ),
        "retention": (
            "আপনার ডেটা সম্মতির তারিখ থেকে ১৮০ দিনের জন্য রাখা হবে। এই সময়ের "
            "পরে, আপনি আপনার সম্মতি নবায়ন না করলে আপনার ডেটা স্বয়ংক্রিয়ভাবে "
            "মুছে ফেলা হবে।"
        ),
        "rights": (
            "ডিজিটাল ব্যক্তিগত ডেটা সুরক্ষা আইন, ২০২৩ এর অধীনে, আপনার যেকোনো "
            "সময়ে আপনার সম্মতি প্রত্যাহার করার, আপনার ডেটায় অ্যাক্সেসের "
            "অনুরোধ করার, ভুল ডেটা সংশোধনের অনুরোধ করার এবং আপনার ব্যক্তিগত "
            "ডেটা মুছে ফেলার অনুরোধ করার অধিকার রয়েছে।"
        ),
        "contact": (
            "আপনার ব্যক্তিগত ডেটা সম্পর্কিত যেকোনো প্রশ্নের জন্য, আমাদের ডেটা "
            "সুরক্ষা অফিসারের সাথে dpo@axiss.in এ অথবা +91-XXXXXXXXXX এ "
            "যোগাযোগ করুন।"
        ),
        "accept_label": "আমি সম্মত",
        "reject_label": "আমি অসম্মত",
    },
}


def get_consent_form(lang: str = "en") -> dict:
    return CONSENT_TEMPLATES.get(lang, CONSENT_TEMPLATES["en"])


def validate_consent_language(lang: str) -> bool:
    return lang in CONSENT_TEMPLATES


def supported_languages() -> list[dict]:
    return list(LANGUAGES)


def render_consent_html(lang: str = "en", brand_name: str = "AXISS") -> str:
    t = get_consent_form(lang)
    lang_info = next((l for l in LANGUAGES if l["code"] == lang), LANGUAGES[0])
    lang_selector = "".join(
        f'<option value="{l["code"]}" {"selected" if l["code"] == lang else ""}>'
        f'{l["native_name"]} ({l["name"]})</option>'
        for l in LANGUAGES
    )

    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{t["title"]} — {brand_name}</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{
  font-family:'Noto Sans','Segoe UI',system-ui,sans-serif;
  background:#0A0E1A;color:#F9FAFB;
  min-height:100vh;display:flex;align-items:center;justify-content:center;
  padding:24px;
}}
.card{{
  max-width:600px;width:100%;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.08);
  border-radius:16px;padding:32px;
}}
h1{{font-size:22px;font-weight:700;margin-bottom:8px;color:#F9FAFB}}
.brand{{color:#6366F1;font-size:14px;margin-bottom:20px}}
.lang-select{{
  float:right;background:#1F2937;color:#F9FAFB;border:1px solid rgba(255,255,255,0.15);
  border-radius:8px;padding:6px 10px;font-size:13px;margin-bottom:12px;
}}
.section{{margin-bottom:20px}}
.section h2{{
  font-size:14px;font-weight:600;color:#818CF8;
  text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;
}}
.section p{{
  font-size:14px;line-height:1.6;color:rgba(255,255,255,0.7);
}}
.actions{{display:flex;gap:12px;margin-top:28px}}
.btn{{
  flex:1;padding:14px;border:none;border-radius:10px;
  font-size:15px;font-weight:600;cursor:pointer;text-align:center;
}}
.btn-accept{{background:#6366F1;color:#fff}}
.btn-accept:hover{{background:#4F46E5}}
.btn-reject{{
  background:transparent;color:rgba(255,255,255,0.5);
  border:1px solid rgba(255,255,255,0.15);
}}
.btn-reject:hover{{border-color:rgba(255,255,255,0.3);color:#F9FAFB}}
.footer{{text-align:center;margin-top:20px;font-size:11px;color:rgba(255,255,255,0.3)}}
</style>
</head>
<body>
<div class="card">
  <select class="lang-select" onchange="location.search='?lang='+this.value">
    {lang_selector}
  </select>
  <h1>{t["title"]}</h1>
  <div class="brand">{brand_name} &middot; DPDP Act 2023</div>

  <div class="section">
    <h2>{"उद्देश्य" if lang == "hi" else "Purpose"}</h2>
    <p>{t["purpose"]}</p>
  </div>

  <div class="section">
    <h2>{"अवधारण" if lang == "hi" else "Retention"}</h2>
    <p>{t["retention"]}</p>
  </div>

  <div class="section">
    <h2>{"अधिकार" if lang == "hi" else "Your Rights"}</h2>
    <p>{t["rights"]}</p>
  </div>

  <div class="section">
    <h2>{"संपर्क" if lang == "hi" else "Contact"}</h2>
    <p>{t["contact"]}</p>
  </div>

  <div class="actions">
    <button class="btn btn-accept" onclick="submitConsent('accept')">{t["accept_label"]}</button>
    <button class="btn btn-reject" onclick="submitConsent('reject')">{t["reject_label"]}</button>
  </div>

  <div class="footer">
    Digital Personal Data Protection Act, 2023 &middot; {lang_info["native_name"]}
  </div>
</div>
<script>
function submitConsent(action) {{
  const params = new URLSearchParams(window.location.search);
  params.set('action', action);
  params.set('lang', '{lang}');
  fetch('/api/lead-aggregator/consent/submit?' + params.toString(), {{
    method: 'POST',
    headers: {{'Content-Type': 'application/json'}},
  }}).then(r => r.json()).then(d => {{
    if (action === 'accept') {{
      document.querySelector('.card').innerHTML =
        '<h1 style="text-align:center;margin:40px 0">&#10003;</h1>' +
        '<p style="text-align:center;color:rgba(255,255,255,0.7)">'+
        (d.message || 'Consent recorded. Thank you!') + '</p>';
    }} else {{
      document.querySelector('.card').innerHTML =
        '<p style="text-align:center;color:rgba(255,255,255,0.5);margin:40px 0">'+
        'Consent declined. Your data will not be processed.</p>';
    }}
  }});
}}
</script>
</body>
</html>"""


async def record_consent_with_language(
    lead_id: str,
    phone: str,
    email: Optional[str],
    lang: str,
    ip_address: str,
    user_agent: str,
    brand_id: Optional[str] = None,
) -> dict:
    consent_id = f"CNS-{secrets.token_hex(8)}"
    now = datetime.now(timezone.utc)
    retention_days = 180

    doc = {
        "consent_id": consent_id,
        "lead_id": lead_id,
        "phone": phone,
        "email": email,
        "brand_id": brand_id,
        "action": "grant",
        "purpose": "lead_processing",
        "language": lang,
        "language_name": next(
            (l["native_name"] for l in LANGUAGES if l["code"] == lang), "English"
        ),
        "ip_address": ip_address,
        "user_agent": user_agent,
        "retention_period": retention_days,
        "timestamp": now,
        "expires_at": now + timedelta(days=retention_days),
    }
    await consent_col.insert_one(doc)

    return {
        "status": "ok",
        "consent_id": consent_id,
        "language": lang,
        "expires_at": doc["expires_at"].isoformat(),
    }
