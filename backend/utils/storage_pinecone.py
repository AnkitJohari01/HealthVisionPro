"""Runtime-safe Pinecone operations used by the app.

This module acquires the index at call time (using ``get_index``)
so the application doesn't fail to import when Pinecone is not
configured or the index is missing.
"""

from typing import List, Dict
from utils.pinecone_client import get_index, embed_text
import os


def save_to_pinecone(patient_id: int, analysis_text: str) -> None:
    index = get_index()
    if index is None:
        print("Warning: Pinecone index not available. Skipping save.")
        return

    embedding = embed_text(analysis_text)
    try:
        index.upsert(
            vectors=[
                {
                    "id": f"case-{patient_id}-{os.urandom(4).hex()}",
                    "values": embedding,
                    "metadata": {"patient_id": patient_id, "analysis": analysis_text},
                }
            ]
        )
    except Exception as e:
        print(f"Pinecone upsert failed: {e}")


def search_similar_cases(query_text: str, top_k: int = 3) -> List[Dict]:
    index = get_index()
    if index is None:
        print("Warning: Pinecone index not available. Returning empty results.")
        return []

    try:
        embedding = embed_text(query_text)
        results = index.query(vector=embedding, top_k=top_k, include_metadata=True)
    except Exception as e:
        print(f"Pinecone query failed: {e}")
        return []

    similar = []
    for match in results.get("matches", []):
        metadata = match.get("metadata", {})
        similar.append({"score": match.get("score"), "analysis": metadata.get("analysis")})

    return similar
