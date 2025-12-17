# backend/agents/report_agent.py
from crewai import Agent, Task, Crew
from ._crew_utils import extract_crew_text
import logging

logger = logging.getLogger("report_agent")
logger.setLevel(logging.DEBUG)

def run_radiology_agent(pdf_bytes: bytes) -> str:
    agent = Agent(
        role="Radiology Report Generator",
        goal="Analyze a PDF radiology scan and generate a structured radiology report.",
        backstory="Senior diagnostic radiologist.",
        llm="openai/gpt-4o"
    )

    task = Task(
        description="Analyze the provided radiology PDF and produce a detailed structured radiology report.",
        agent=agent,
        expected_output="A structured radiology report.",
        attachments=[pdf_bytes]
    )

    crew = Crew(agents=[agent], tasks=[task])
    result = crew.kickoff()

    # Debug logs to inspect runtime object
    try:
        logger.debug("Crew result dir: %s", dir(result))
        if hasattr(result, "__dict__"):
            logger.debug("Crew result __dict__ keys: %s", list(result.__dict__.keys()))
    except Exception:
        pass

    text = extract_crew_text(result)
    logger.debug("Extracted crew text: %s", text[:500])
    return text
