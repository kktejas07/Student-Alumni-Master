"""
mou_generator_service.py — AI Automated MoU & Partnership Contract Generator
Generates official downloadable Partnership Contracts and Memorandum of Understanding (MoU) documents
for verified student community partners.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

class MouGeneratorService:
    """Service generating official Partnership Contracts & MoUs."""

    async def generate_mou(self, db: Any, community_id: str, custom_terms: Optional[str] = None) -> Dict[str, Any]:
        """Generates structured MoU contract document for a community partner."""
        try:
            comm = await db.community_directory.find_one({"id": community_id}, {"_id": 0})
        except Exception:
            comm = None

        if not comm:
            from services.agents.outreach_scout_service import INITIAL_COMMUNITIES
            for c in INITIAL_COMMUNITIES:
                if c["id"] == community_id:
                    comm = c
                    break

        if not comm:
            raise ValueError(f"Community {community_id} not found")

        comm_name = comm.get("name", "Student Community")
        organizer_name = comm.get("organizer_name", "Community Representative")
        organizer_role = comm.get("organizer_role", "Community Lead")
        location = comm.get("location", "Global")
        domain = comm.get("domain", "General Tech").upper()

        now_date = datetime.now(timezone.utc).strftime("%B %d, %Y")
        contract_id = f"MOU-SA-{uuid.uuid4().hex[:8].upper()}"

        contract_markdown = f"""# MEMORANDUM OF UNDERSTANDING (MoU)
**Ref ID**: {contract_id}  
**Date of Execution**: {now_date}  

---

## 1. PARTIES
This Memorandum of Understanding ("MoU") is entered into by and between:
1. **Student Alumni Platform (SA)** ("Primary Sponsor & Technology Platform")
2. **{comm_name}** ("Partner Community"), represented by **{organizer_name}** ({organizer_role}).

---

## 2. PURPOSE & SCOPE OF COLLABORATION
The purpose of this agreement is to establish a formal strategic partnership in the domain of **{domain}**.
- **Student Alumni (SA)** agrees to provide verified mentorship access, platform infrastructure, and student cloud perks.
- **{comm_name}** agrees to promote SA initiatives across its {comm.get('members_count', 500)}+ student members in {location}.

---

## 3. GOODIES & SPONSORSHIP COMMITMENTS
Student Alumni (SA) hereby commits the following unlocked perks for members of **{comm_name}**:
"""

        for g in comm.get("free_goodies", []):
            contract_markdown += f"- **{g.get('title')}**: {g.get('value')} (Promo Code: `{g.get('code')}`)\n"

        if custom_terms:
            contract_markdown += f"\n## 4. SPECIAL CLAUSES & CUSTOM TERMS\n{custom_terms}\n"

        contract_markdown += f"""
---

## 5. GOVERNING TERMS & SIGNATURES
This MoU is effective immediately upon digital execution.

| For Student Alumni (SA) Platform | For {comm_name} |
| :--- | :--- |
| **Signature**: *[Digitally Signed by SA Super Admin]* | **Signature**: *[Digitally Signed by {organizer_name}]* |
| **Date**: {now_date} | **Date**: {now_date} |
"""

        contract_doc = {
            "id": contract_id,
            "community_id": community_id,
            "community_name": comm_name,
            "organizer_name": organizer_name,
            "organizer_email": comm.get("organizer_email"),
            "domain": domain,
            "contract_text": contract_markdown,
            "status": "digitally_executed",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        try:
            await db.mou_contracts.insert_one(contract_doc)
            await db.community_directory.update_one(
                {"id": community_id},
                {"$set": {"mou_contract": contract_doc, "crm_stage": "active_partner"}}
            )
        except Exception as e:
            print(f"Error saving MoU to DB: {e}")

        return {"ok": True, "contract": contract_doc}


mou_generator_service = MouGeneratorService()
