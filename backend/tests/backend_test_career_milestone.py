"""
Backend test suite for:
  1. POST /api/ai/career-roadmap/milestone/{week_idx}/complete
  2. PUT /api/users/me stream + department fields
  3. GET /api/auth/me badges persistence

Test account: realtime@studentalumni.in / RealTime@2026
"""
import os
import sys
import json
import requests

BASE = "https://hiring-mvvm.preview.emergentagent.com/api"
EMAIL = "realtime@studentalumni.in"
PASSWORD = "RealTime@2026"

PASS = []
FAIL = []


def rec(name, ok, detail=""):
    if ok:
        PASS.append(name)
        print(f"  PASS  {name}")
    else:
        FAIL.append((name, detail))
        print(f"  FAIL  {name} -- {detail}")


def login():
    r = requests.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    if r.status_code != 200:
        print(f"FATAL: login failed {r.status_code} {r.text}")
        sys.exit(1)
    return r.json()["access_token"]


def auth(tok):
    return {"Authorization": f"Bearer {tok}"}


def main():
    print(f"\n== Logging in as {EMAIL} ==")
    tok = login()
    H = auth(tok)

    # 1. Generate baseline roadmap
    print("\n== Scenario 1: Generate baseline roadmap ==")
    r = requests.post(f"{BASE}/ai/career-roadmap", json={"force": False}, headers=H, timeout=120)
    rec("1.status==200", r.status_code == 200, f"status={r.status_code} body={r.text[:500]}")
    if r.status_code != 200:
        dump()
        return
    rm = r.json()
    weekly_plan = rm.get("weekly_plan") or []
    total = len(weekly_plan)
    rec("1.weekly_plan length 5 or 6", total in (5, 6), f"got {total}")
    mcomp = rm.get("milestones_completed")
    rec("1.milestones_completed is list", isinstance(mcomp, list), f"type={type(mcomp).__name__}")
    print(f"     weekly_plan length: {total}, milestones_completed: {mcomp}")

    # 2. Reset state — undo every week
    print("\n== Scenario 2: Reset state (undo all) ==")
    ok_all = True
    for i in range(total):
        r = requests.post(f"{BASE}/ai/career-roadmap/milestone/{i}/complete",
                          json={"undo": True}, headers=H, timeout=30)
        if r.status_code != 200:
            ok_all = False
            print(f"     undo idx={i} failed status={r.status_code} body={r.text[:200]}")
            break
    rec("2.undo all succeeds", ok_all)
    # confirm empty
    r = requests.post(f"{BASE}/ai/career-roadmap/milestone/0/complete",
                      json={"undo": True}, headers=H, timeout=30)
    if r.status_code == 200:
        body = r.json()
        rec("2.milestones_completed == []", body.get("milestones_completed") == [],
            f"got {body.get('milestones_completed')}")

    # 3. Mark week 0 complete
    print("\n== Scenario 3: Mark week 0 complete ==")
    r = requests.post(f"{BASE}/ai/career-roadmap/milestone/0/complete",
                      json={}, headers=H, timeout=30)
    rec("3.status==200", r.status_code == 200, f"status={r.status_code} body={r.text[:500]}")
    if r.status_code == 200:
        b = r.json()
        rec("3.milestones_completed == [0]", b.get("milestones_completed") == [0],
            f"got {b.get('milestones_completed')}")
        rec("3.total_milestones matches plan", b.get("total_milestones") == total,
            f"got {b.get('total_milestones')} exp {total}")
        rec("3.next_milestone_index == 1", b.get("next_milestone_index") == 1,
            f"got {b.get('next_milestone_index')}")
        nm = b.get("next_milestone") or {}
        rec("3.next_milestone.title non-empty", isinstance(nm.get("title"), str) and len(nm.get("title") or "") > 0,
            f"got title={nm.get('title')!r}")
        rec("3.next_phase_unlocked == false", b.get("next_phase_unlocked") is False,
            f"got {b.get('next_phase_unlocked')}")
        nb = b.get("new_badges") or []
        path_starter = [x for x in nb if x.get("category") == "roadmap_progress"
                        and x.get("tier") == "low" and x.get("label") == "Path Starter"]
        rec("3.new_badges contains Path Starter (low, roadmap_progress)", len(path_starter) > 0,
            f"new_badges={[{'label':x.get('label'),'tier':x.get('tier'),'category':x.get('category')} for x in nb]}")
        all_b = b.get("all_badges") or []
        rec("3.all_badges includes Path Starter",
            any(x.get("label") == "Path Starter" for x in all_b),
            f"all_badges labels={[x.get('label') for x in all_b]}")

    # 4. Idempotent re-call of milestone 0
    print("\n== Scenario 4: Idempotent re-call of milestone 0 ==")
    r = requests.post(f"{BASE}/ai/career-roadmap/milestone/0/complete",
                      json={}, headers=H, timeout=30)
    rec("4.status==200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        b = r.json()
        rec("4.milestones_completed still [0]", b.get("milestones_completed") == [0],
            f"got {b.get('milestones_completed')}")
        rec("4.new_badges is empty", (b.get("new_badges") or []) == [],
            f"got {b.get('new_badges')}")

    # 5. Mark weeks 1 and 2 complete
    print("\n== Scenario 5: Mark weeks 1 and 2 complete ==")
    r1 = requests.post(f"{BASE}/ai/career-roadmap/milestone/1/complete", json={}, headers=H, timeout=30)
    rec("5.week1.status==200", r1.status_code == 200, f"status={r1.status_code}")
    r2 = requests.post(f"{BASE}/ai/career-roadmap/milestone/2/complete", json={}, headers=H, timeout=30)
    rec("5.week2.status==200", r2.status_code == 200, f"status={r2.status_code}")
    if r2.status_code == 200:
        b = r2.json()
        rec("5.milestones_completed == [0,1,2]", b.get("milestones_completed") == [0, 1, 2],
            f"got {b.get('milestones_completed')}")
        all_b = b.get("all_badges") or []
        on_track = [x for x in all_b if x.get("tier") == "moderate" and x.get("label") == "On Track"]
        rec("5.all_badges contains On Track (moderate)", len(on_track) > 0,
            f"all_badges={[{'label':x.get('label'),'tier':x.get('tier'),'category':x.get('category')} for x in all_b if x.get('category')=='roadmap_progress']}")
        # Path Starter (low) should have been replaced by On Track (moderate) — verify no duplicate roadmap_progress low
        low_rp = [x for x in all_b if x.get("category") == "roadmap_progress" and x.get("tier") == "low"]
        rec("5.Path Starter (low) upgraded/replaced (not duplicated)", len(low_rp) == 0,
            f"stale low roadmap_progress={[x.get('label') for x in low_rp]}")

    # 6. Mark remaining weeks 3, 4, (5)
    print("\n== Scenario 6: Mark remaining milestones ==")
    for i in range(3, total):
        r = requests.post(f"{BASE}/ai/career-roadmap/milestone/{i}/complete",
                          json={}, headers=H, timeout=30)
        rec(f"6.week{i}.status==200", r.status_code == 200, f"status={r.status_code}")
    # Final status
    r = requests.post(f"{BASE}/ai/career-roadmap/milestone/{total-1}/complete",
                      json={}, headers=H, timeout=30)
    if r.status_code == 200:
        b = r.json()
        rec("6.milestones_completed is all weeks",
            sorted(b.get("milestones_completed") or []) == list(range(total)),
            f"got {b.get('milestones_completed')}")
        rec("6.next_phase_unlocked == true", b.get("next_phase_unlocked") is True,
            f"got {b.get('next_phase_unlocked')}")
        all_b = b.get("all_badges") or []
        champ = [x for x in all_b if x.get("label") == "Career Champion" and x.get("tier") == "high"]
        rec("6.all_badges contains Career Champion (high)", len(champ) > 0,
            f"labels={[x.get('label') for x in all_b]}")
        # Skill Climber / Pro / Master (3 ≥70 expected → moderate 'Pro')
        skill_labels = [x.get("label") for x in all_b if x.get("category") == "skill_climber"]
        print(f"     skill_climber badges: {skill_labels}")
        # User roadmap.skill_scores has technical=78, communication=72 → 2 skills ≥70 → Skill Climber (low)
        rec("6.some skill_climber badge unlocked (1+ skills >=70)",
            any(x.get("category") == "skill_climber" for x in all_b),
            f"labels={skill_labels}")

    # 7. Undo week 0
    print("\n== Scenario 7: Undo week 0 ==")
    r = requests.post(f"{BASE}/ai/career-roadmap/milestone/0/complete",
                      json={"undo": True}, headers=H, timeout=30)
    rec("7.status==200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        b = r.json()
        rec("7.milestones_completed does not contain 0",
            0 not in (b.get("milestones_completed") or []),
            f"got {b.get('milestones_completed')}")
        # total now total-1. Career Champion requires 5; threshold varies, but let's verify we are below 5 if total=5
        done = len(b.get("milestones_completed") or [])
        all_b = b.get("all_badges") or []
        champ = [x for x in all_b if x.get("label") == "Career Champion" and x.get("tier") == "high"]
        if done < 5:
            rec("7.Career Champion (high) no longer present when done<5",
                len(champ) == 0,
                f"champ still present; done={done}")
        else:
            rec("7.done still >=5 (6-week plan); champ may remain", True)

    # 8. Bad week_idx → 400
    print("\n== Scenario 8: Bad week_idx → 400 ==")
    r = requests.post(f"{BASE}/ai/career-roadmap/milestone/99/complete",
                      json={}, headers=H, timeout=30)
    rec("8.status==400", r.status_code == 400, f"status={r.status_code} body={r.text[:200]}")

    # 9. No auth → 401
    print("\n== Scenario 9: No auth → 401 ==")
    r = requests.post(f"{BASE}/ai/career-roadmap/milestone/0/complete",
                      json={}, timeout=30)
    rec("9.status==401", r.status_code in (401, 403),
        f"status={r.status_code} body={r.text[:200]}")

    # 10. /api/auth/me returns user.badges including earned ones
    print("\n== Scenario 10: GET /auth/me returns badges ==")
    # First re-mark week 0 to get back all milestones if scenario 7 removed
    requests.post(f"{BASE}/ai/career-roadmap/milestone/0/complete",
                  json={}, headers=H, timeout=30)
    r = requests.get(f"{BASE}/auth/me", headers=H, timeout=30)
    rec("10.status==200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        me = r.json()
        badges = me.get("badges") or []
        rec("10.badges is list with items", isinstance(badges, list) and len(badges) > 0,
            f"badges_count={len(badges)}")
        labels = [x.get("label") for x in badges]
        print(f"     user.badges labels: {labels}")
        rec("10.badges contains Career Champion",
            any(x.get("label") == "Career Champion" for x in badges),
            f"labels={labels}")

    # 11. PUT /users/me with stream + department
    print("\n== Scenario 11: PUT /users/me {stream, department} ==")
    r = requests.put(f"{BASE}/users/me",
                     json={"stream": "Science (PCM)", "department": "Computer Science"},
                     headers=H, timeout=30)
    rec("11.put.status==200", r.status_code == 200,
        f"status={r.status_code} body={r.text[:300]}")
    r = requests.get(f"{BASE}/auth/me", headers=H, timeout=30)
    if r.status_code == 200:
        me = r.json()
        rec("11.me.stream == 'Science (PCM)'",
            me.get("stream") == "Science (PCM)",
            f"got {me.get('stream')}")
        rec("11.me.department == 'Computer Science'",
            me.get("department") == "Computer Science",
            f"got {me.get('department')}")

    # Cleanup — undo all milestones to reset state
    print("\n== Cleanup: undo all milestones ==")
    for i in range(total):
        requests.post(f"{BASE}/ai/career-roadmap/milestone/{i}/complete",
                      json={"undo": True}, headers=H, timeout=30)
    r = requests.post(f"{BASE}/ai/career-roadmap/milestone/0/complete",
                      json={"undo": True}, headers=H, timeout=30)
    if r.status_code == 200:
        b = r.json()
        print(f"     final milestones_completed: {b.get('milestones_completed')}")

    dump()


def dump():
    print("\n" + "="*80)
    print(f"RESULTS: {len(PASS)} passed, {len(FAIL)} failed")
    print("="*80)
    if FAIL:
        print("\nFAILED:")
        for n, d in FAIL:
            print(f"  - {n}")
            if d:
                print(f"      {d}")
    sys.exit(0 if not FAIL else 1)


if __name__ == "__main__":
    main()
