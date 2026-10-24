"""
Unit tests for the Autonomous Agent Ecosystem:
- MetaGPT/ChatDev Swarm Pipeline
- AutoGPT Goal AutoPilot
- Synthetic QA Persona Simulator
- Specialized Operational Audits (Security, Data Hygiene, Moderation)
"""
import pytest
from services.agents.swarm import swarm_engine
from services.agents.autopilot import autopilot_engine
from services.agents.qa_agent import qa_agent
from services.agents.specialized import specialized_agents

@pytest.mark.anyio
async def test_swarm_pipeline_execution():
    result = await swarm_engine.run_swarm_pipeline(
        project_title="Alumni Mentorship Matcher",
        user_prompt="Automated matching system based on skills",
        domain="edtech"
    )
    assert result.session_id.startswith("swarm-")
    assert result.status == "completed"
    assert len(result.dialogue) >= 4
    assert "Product Requirements Document" in result.prd
    assert "System Architecture" in result.architecture
    assert "models.py" in result.code_files
    assert "APPROVED" in result.qa_report

@pytest.mark.anyio
async def test_autopilot_goal_execution():
    result = await autopilot_engine.execute_goal("Audit inactive users and send re-engagement emails")
    assert result.task_id.startswith("auto-")
    assert result.status == "completed"
    assert len(result.steps_executed) == 3
    assert result.iterations == 3

@pytest.mark.anyio
async def test_qa_persona_simulation():
    # Probes hit the real app in-process; without MongoDB some return 5xx,
    # so assert on structure and on the probes that need no DB.
    student_report = await qa_agent.run_persona_simulation("student")
    assert student_report.persona == "student"
    assert student_report.mode == "live-probe"
    assert len(student_report.assertions) == 5
    by_name = {a.name: a for a in student_report.assertions}
    assert by_name["API health"].http_status == 200 and by_name["API health"].status in ("passed", "warning")  # warning = slow (no Mongo here)
    assert by_name["Student dashboard requires login"].http_status in (401, 403)
    assert all(a.response_time_ms >= 0 for a in student_report.assertions)
    assert student_report.total_passed + student_report.total_failed <= len(student_report.assertions)

    mentor_report = await qa_agent.run_persona_simulation("mentor")
    assert mentor_report.persona == "mentor"
    assert len(mentor_report.assertions) == 3

@pytest.mark.anyio
async def test_specialized_agents():
    sec_report = await specialized_agents.run_security_audit()
    assert sec_report.findings_count == 4
    assert sec_report.status == "completed"

    hygiene_report = await specialized_agents.run_data_hygiene_audit()
    assert hygiene_report.findings_count == 3

    mod_report = await specialized_agents.run_content_moderation_audit()
    assert mod_report.findings_count == 2
