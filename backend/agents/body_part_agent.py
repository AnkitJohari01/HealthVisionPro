from crewai import Agent, Task, Crew

def identify_body_part(img_bytes: bytes) -> str:
    agent = Agent(
        role="Body Part Identifier",
        goal=(
            "Identify which body part is visible in the radiology image "
            "with high accuracy. Do NOT guess. "
            "Only describe the body part you truly see."
        ),
        backstory=(
            "You specialize in correctly identifying body regions "
            "in medical imaging such as X-rays, CT, MRI."
        ),
        llm="openai/gpt-4o"
    )

    task = Task(
        description=(
            "Identify the correct body part shown in the image. "
            "Examples: knee, ankle, wrist, chest, spine, skull, pelvis, elbow, shoulder.\n"
            "Only return the body part name, nothing else."
        ),
        agent=agent,
        expected_output="A single word or short phrase naming the body part.",
        attachments=[img_bytes]
    )

    crew = Crew(agents=[agent], tasks=[task])
    result = crew.kickoff()

    # Extract output
    if hasattr(result, "raw") and isinstance(result.raw, dict):
        return result.raw.get("output_text", "").strip()
    if hasattr(result, "json_dict"):
        return str(result.json_dict)
    return str(result)
