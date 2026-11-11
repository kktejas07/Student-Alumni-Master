"""ECHO Unstop sync + ticket CSV import endpoints.

Verbatim segment of features/echo_showcase.py (audit Step 5b). Exec'd into that
module's namespace in source order — referenced names resolve from the shared
namespace; do not import this file directly.
"""
from __future__ import annotations

@router.post("/sync-unstop")
async def sync_unstop_opportunities(request: Request):
    await _require_admin(request)
    """Scrape and sync live hackathons, workshops, quizzes, and competitions from Unstop into ECHO showcases."""
    try:
        logger.info("⚡ [UNSTOP SYNC] Manual trigger received. Scraping opportunities from Unstop...")
        from scripts.scrape_unstop_events import run_unstop_sync
        count = await run_unstop_sync()
        logger.info(f"[UNSTOP SYNC] Successfully synced {count} opportunities into DB.")
        return {"status": "success", "synced_count": count, "message": f"Successfully synced {count} opportunities from Unstop"}
    except Exception as e:
        logger.error(f"💥 [UNSTOP SYNC ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unstop sync failed: {str(e)}")


@router.post("/admin/import-tickets/preview")
async def import_tickets_preview(
    request: Request,
    file: UploadFile = File(...),
    source: str = Query("unstop", description="Source platform: 'unstop', 'studentalumni', or a custom name"),
):
    """Parse an import CSV export and return a preview of what would be imported.
    Does NOT write to the database — dry-run only. Admin-only.
    """
    await _require_admin(request)
    content = await file.read()
    from security_scanner import scan_file_for_viruses_async
    await scan_file_for_viruses_async(content)
    from scripts.import_unstop_csv import parse_unstop_csv, build_registrations
    rows = parse_unstop_csv(content)
    if not rows:
        raise HTTPException(status_code=400, detail="CSV is empty or has no valid rows with email addresses")
    result = build_registrations(rows, slug="", showcase_title="", source=source)
    stats = result["stats"]
    # Return all parsed registrations as preview
    preview = result["registrations"]
    return {
        "stats": stats,
        "preview": preview,
        "total_rows": len(rows),
    }


@router.post("/admin/import-tickets")
async def import_tickets_registrations(
    request: Request,
    file: UploadFile = File(...),
    slug: str = Query(..., description="ECHO showcase slug to attach registrations to"),
    source: str = Query("unstop", description="Source platform: 'unstop', 'studentalumni', or a custom name"),
):
    """Import ticket buyers into ECHO registrations + SA accounts.

    - Parses the CSV, groups by Team ID
    - Creates echo_registrations for each buyer
    - Provisions SA accounts (idempotent by email)
    - Generates QR codes for paid registrations
    - Mirrors to event_registrations
    - Sends welcome emails to newly created accounts
    """
    await _require_admin(request)
    db = _get_db(request)
    content = await file.read()
    from security_scanner import scan_file_for_viruses_async
    await scan_file_for_viruses_async(content)

    from scripts.import_unstop_csv import parse_unstop_csv, build_registrations

    rows = parse_unstop_csv(content)
    if not rows:
        raise HTTPException(status_code=400, detail="CSV is empty or has no valid rows with email addresses")

    # Fetch the showcase for context
    showcase = await db.echo_showcases.find_one(_slug_query(slug))
    if not showcase:
        raise HTTPException(status_code=404, detail=f"Showcase '{slug}' not found")
    showcase_title = showcase.get("title", "")
    canonical_slug = showcase.get("slug") or slug

    result = build_registrations(rows, slug=canonical_slug, showcase_title=showcase_title, source=source)
    registrations = result["registrations"]
    stats = result["stats"]

    imported = 0
    new_accounts = 0
    existing_accounts = 0
    errors: List[str] = []
    frontend_url = frontend_base_url()

    for reg in registrations:
        try:
            email = reg.get("email", "").lower()
            if not email:
                continue

            # Check for existing registration (idempotent by email + slug)
            existing = await db.echo_registrations.find_one({
                "email": email, "slug": canonical_slug
            })
            if existing:
                continue  # already imported

            now_iso = _now()
            reg_id = f"Echo-{secrets.token_hex(8).upper()}"
            is_paid = (reg.get("payment") or {}).get("status") == "paid"

            # Build the ECHO registration document
            echo_reg = {
                "id": reg_id,
                "slug": canonical_slug,
                "showcase_title": showcase_title,
                "showcase_college": showcase.get("college"),
                "full_name": reg.get("full_name") or reg.get("first_name", ""),
                "email": email,
                "phone": reg.get("phone", ""),
                "year": reg.get("year", ""),
                "college": reg.get("college", ""),
                "branch": reg.get("branch", ""),
                "fee": reg.get("fee", 0),
                "currency": reg.get("currency", "INR"),
                "payment": reg.get("payment"),
                "qr_code_base64": None,
                "registered_at": reg.get("registered_at", now_iso),
                "status": reg.get("status", "registered"),
                "created_at": now_iso,
                "terms_accepted": True,
                "terms_accepted_at": now_iso,
                "whatsapp_opt_in": True,
                "registration_type": reg.get("registration_type", "individual"),
                "team_name": reg.get("team_name", ""),
                "team_id": reg.get("team_id", ""),
                "team_size": len(reg.get("team_members", [])) + 1 if reg.get("team_members") else 1,
                "team_members": reg.get("team_members", []),
                "is_team_member": reg.get("is_team_member", False),
                "is_team_lead": reg.get("is_team_lead", False),
                "source": reg.get("source") or source,
                "unstop_metadata": reg.get("unstop_metadata", {}),
            }

            # Generate QR code for paid registrations
            if is_paid:
                echo_reg["qr_code_base64"] = generate_qr_code(
                    f"{frontend_url}/echo/scan/{reg_id}"
                )
                echo_reg["status"] = "registered"

            await db.echo_registrations.insert_one(dict(echo_reg))
            imported += 1

            # Provision SA account (idempotent by email)
            sa_user, created, temp_password = await _provision_sa_account(db, echo_reg, showcase)
            if created:
                new_accounts += 1
                # Send welcome email
                if temp_password:
                    await _send_sa_welcome_email(echo_reg, showcase, temp_password)
            elif sa_user:
                existing_accounts += 1

            # Mirror to event_registrations
            if sa_user:
                await _mirror_to_event_registration(db, echo_reg, showcase, sa_user)

            # Generate session coupons for paid registrations
            if is_paid:
                sessions = showcase.get("sessions") or []
                if sessions:
                    await _generate_coupons_for_registration(
                        db, canonical_slug, reg_id, sessions
                    )

        except Exception as e:
            errors.append(f"{reg.get('email', '?')}: {str(e)}")
            logger.error(f"[UNSTOP IMPORT] Error importing {reg.get('email')}: {e}")

    logger.info(
        f"[UNSTOP IMPORT] slug={canonical_slug} imported={imported} "
        f"new_accounts={new_accounts} existing={existing_accounts} errors={len(errors)}"
    )

    return {
        "status": "success",
        "slug": canonical_slug,
        "imported": imported,
        "new_accounts": new_accounts,
        "existing_accounts": existing_accounts,
        "errors": errors,
        "stats": stats,
    }


