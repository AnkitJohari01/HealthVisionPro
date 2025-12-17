# from crewai import Agent, Task, Crew

# def analyze_patient_voice_text(transcript: str) -> str:
#     """Takes Whisper transcript and produces medical insights."""

#     agent = Agent(
#         role="Medical Voice Assistant",
#         goal=(
#             "Understand symptoms described by the patient, extract key meaning, "
#             "and explain in simple, friendly medical language."
#         ),
#         backstory=(
#             "You are an expert clinical assistant who listens to patient voice reports. "
#             "You identify symptoms, duration, severity, emotional tone, and risk factors. "
#             "You always write in simple language for patients AND a clear clinical summary for doctors."
#         ),
#         llm="openai/gpt-4o"
#     )

#     task = Task(
#         description=(
#             "Analyze this patient voice transcript:\n"
#             f"{transcript}\n\n"
#             "Extract the following:\n"
#             "- Key symptoms\n"
#             "- Duration\n"
#             "- Severity\n"
#             "- Possible causes\n"
#             "- Red flag warnings\n"
#             "- Patient-friendly explanation\n"
#             "- Doctor-style clinical summary\n"
#             "- Recommended next steps (tests, self-care, or doctor visit)\n\n"
#             "Keep language simple, friendly, and medically correct."
#         ),
#         agent=agent,
#         expected_output="A structured, friendly medical interpretation."
#     )

#     crew = Crew(
#         agents=[agent],
#         tasks=[task]
#     )

#     result = crew.kickoff()

#     # Extract any of the valid outputs CrewAI may produce
#     if hasattr(result, "json_dict") and result.json_dict:
#         jd = result.json_dict
#         if isinstance(jd, dict):
#             if jd.get("final_output"):
#                 return jd["final_output"]
#             if jd.get("result"):
#                 return jd["result"]
#             return str(jd)

#     if hasattr(result, "raw") and result.raw:
#         raw = result.raw
#         if isinstance(raw, dict):
#             if raw.get("output_text"):
#                 return raw["output_text"]
#             if raw.get("text"):
#                 return raw["text"]
#         return str(raw)

#     if hasattr(result, "tasks_output") and result.tasks_output:
#         t = result.tasks_output[0]
#         if getattr(t, "output", None):
#             return str(t.output)
#         if getattr(t, "result", None):
#             return str(t.result)
#         return str(t)

#     return "No analysis produced."




























from crewai import Agent, Task, Crew

def analyze_patient_voice_text(transcript: str) -> str:
    """Takes Whisper transcript and produces medical insights."""

    agent = Agent(
        role="Medical Voice Assistant",
        goal=(
            "Understand symptoms described by the patient, extract key meaning, "
            "and explain in simple, friendly medical language."
        ),
        backstory=(
            "You are an expert clinical assistant who listens to patient voice reports. "
            "You identify symptoms, duration, severity, emotional tone, and risk factors. "
            "You always write in simple language for patients AND a clear clinical summary for doctors."
        ),
        llm="openai/gpt-4o"
    )

    task = Task(
        description=(
            "Analyze this patient voice transcript:\n"
            f"{transcript}\n\n"
            "Extract the following:\n"
            "- Key symptoms\n"
            "- Duration\n"
            "- Severity\n"
            "- Possible causes\n"
            "- Red flag warnings\n"
            "- Patient-friendly explanation\n"
            "- Doctor-style clinical summary\n"
            "- Recommended next steps (tests, self-care, or doctor visit)\n\n"
            "Keep language simple, friendly, and medically correct."
        ),
        agent=agent,
        expected_output="A structured, friendly medical interpretation."
    )

    crew = Crew(
        agents=[agent],
        tasks=[task]
    )

    result = crew.kickoff()

    # =========================================================
    # 🔥 FIX — Safe extraction (no `.get()` applied to strings)
    # =========================================================

    # 1) json_dict path
    if hasattr(result, "json_dict") and result.json_dict:
        jd = result.json_dict
        if isinstance(jd, dict):
            return jd.get("final_output") or jd.get("result") or str(jd)
        else:
            return str(jd)   # 👈 prevents crash

    # 2) result.raw path
    if hasattr(result, "raw") and result.raw:
        raw = result.raw

        if isinstance(raw, dict):                     # valid place for .get()
            return raw.get("output_text") or raw.get("text") or str(raw)

        return str(raw)                                # 👈 FIX: handles string case safely

    # 3) tasks_output fallback
    if hasattr(result, "tasks_output") and result.tasks_output:
        t = result.tasks_output[0]
        return (
            str(getattr(t, "output", None) or
                getattr(t, "result", None) or
                t)
        )

    return "No analysis produced."




