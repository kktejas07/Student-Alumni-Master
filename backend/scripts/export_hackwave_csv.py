import asyncio
import csv
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

async def export_hackwave_registrations():
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        raise SystemExit("MONGO_URL is not set. Export this script's connection string via the environment; never hardcode credentials.")
    db_name = os.environ.get('DB_NAME', 'studentalumniadmin')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Query all echo registrations
    docs = await db.echo_registrations.find({}).sort("created_at", -1).to_list(5000)
    print(f"[Export] Total echo_registrations records fetched: {len(docs)}")
    
    headers = [
        "Registration ID",
        "Event Title",
        "Event Slug",
        "Full Name",
        "Email",
        "Phone Number",
        "Campus / College",
        "Branch",
        "Year",
        "Registration Type",
        "Team Name",
        "Is Team Member",
        "Team Leader Name",
        "Team Leader Email",
        "Payment Status",
        "Payment Category",
        "Fee Amount (INR)",
        "Payment Gateway",
        "Payment ID",
        "Paid At",
        "Registration Date"
    ]
    
    rows = []
    for d in docs:
        pay_info = d.get('payment') or {}
        raw_status = (pay_info.get('status') or d.get('payment_status') or 'unpaid').lower()
        fee = float(d.get('fee') or pay_info.get('amount') or 0.0)
        
        if raw_status == 'paid':
            payment_status = 'PAID'
            paid_category = 'Paid (Free)' if fee == 0 else 'Paid'
        elif raw_status == 'failed':
            payment_status = 'FAILED'
            paid_category = 'Failed / Unpaid'
        elif raw_status == 'pending':
            payment_status = 'PENDING'
            paid_category = 'Unpaid (Pending)'
        else:
            payment_status = 'UNPAID'
            paid_category = 'Unpaid'
            
        reg_type = d.get('registration_type') or ('Team' if d.get('team_name') or d.get('is_team_member') else 'Individual')
        
        row = {
            "Registration ID": d.get('id') or str(d.get('_id')),
            "Event Title": d.get('showcase_title') or d.get('event_title') or d.get('slug') or '',
            "Event Slug": d.get('slug') or '',
            "Full Name": d.get('full_name') or '',
            "Email": d.get('email') or d.get('user_key') or '',
            "Phone Number": d.get('phone') or '',
            "Campus / College": d.get('college') or d.get('showcase_college') or '',
            "Branch": d.get('branch') or '',
            "Year": d.get('year') or '',
            "Registration Type": reg_type.title(),
            "Team Name": d.get('team_name') or '',
            "Is Team Member": 'Yes' if d.get('is_team_member') else 'No',
            "Team Leader Name": d.get('team_leader_name') or '',
            "Team Leader Email": d.get('team_leader_email') or '',
            "Payment Status": payment_status,
            "Payment Category": paid_category,
            "Fee Amount (INR)": fee,
            "Payment Gateway": pay_info.get('gateway') or '',
            "Payment ID": pay_info.get('payment_id') or '',
            "Paid At": pay_info.get('paid_at') or '',
            "Registration Date": d.get('registered_at') or d.get('created_at') or ''
        }
        rows.append(row)
        
    # Destination path
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    os.makedirs(output_dir, exist_ok=True)
    filename = f"hackwave_3_0_students_registrations_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    filepath = os.path.join(output_dir, filename)
    
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)
        
    print(f"[Export] CSV successfully generated at: {filepath}")
    
    # Also write a standard hackwave_3_0_registrations.csv in artifact / uploads
    latest_path = os.path.join(output_dir, "hackwave_3_0_registrations.csv")
    with open(latest_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)
        
    print(f"[Export] Standard CSV path: {latest_path}")
    return latest_path

if __name__ == "__main__":
    asyncio.run(export_hackwave_registrations())
