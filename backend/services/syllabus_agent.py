"""
backend/services/syllabus_agent.py

AI Mentor Course & Syllabus Generator Agent.
Generates multi-week workshop syllabi, lesson plans, projects, and grading rubrics for mentors and instructors.
"""

import logging
from typing import Dict, Any, List

logger = logging.getLogger("syllabus_agent")

class MentorSyllabusAgent:
    """Automated AI Agent for generating course syllabi, lesson modules, and assignments."""

    @staticmethod
    def generate_syllabus(topic: str, target_level: str = "Intermediate", weeks: int = 4) -> Dict[str, Any]:
        logger.debug(f"[SyllabusAgent DEBUG] Generating {weeks}-week syllabus for topic='{topic}' level='{target_level}'")

        clean_topic = topic.strip().title()

        modules = []
        for w in range(1, weeks + 1):
            if w == 1:
                mod_title = f"Week 1: Fundamentals of {clean_topic} & Core Concepts"
                objectives = ["Understand foundational principles", "Set up local development environment", "Execute first hands-on baseline project"]
                project = "Environment setup & Hello-World baseline project"
            elif w == 2:
                mod_title = f"Week 2: Advanced Data Flow & Architecture Patterns"
                objectives = ["Implement modular component structures", "Manage dynamic state and data flow", "Handle API integration & async pipelines"]
                project = "Interactive data-driven prototype"
            elif w == 3:
                mod_title = f"Week 3: Security, Performance & Scalability Optimization"
                objectives = ["Apply security best practices & validation", "Optimize database query performance & caching", "Conduct load testing & error handling"]
                project = "Production-ready backend API service"
            else:
                mod_title = f"Week {w}: Capstone Integration & Deployment"
                objectives = ["Assemble end-to-end full stack capstone", "Deploy to cloud server / container environment", "Present project to mentors & peer review"]
                project = "Final Capstone Presentation & Live Cloud Deployment"

            modules.append({
                "week": w,
                "title": mod_title,
                "learning_objectives": objectives,
                "assignment": project,
            })

        grading_rubric = {
            "hands_on_projects": "40%",
            "final_capstone": "40%",
            "peer_collaboration_and_participation": "20%",
        }

        prerequisites = [
            "Basic understanding of programming logic",
            "Familiarity with Git and terminal commands",
            "Text editor / IDE setup (VS Code or Cursor)",
        ]

        return {
            "course_title": f"Mastering {clean_topic}: {target_level} Bootcamp",
            "target_audience": f"Students & Professionals ({target_level} Level)",
            "duration_weeks": weeks,
            "prerequisites": prerequisites,
            "modules": modules,
            "grading_rubric": grading_rubric,
        }
