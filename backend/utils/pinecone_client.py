import os
from pinecone import Pinecone, ServerlessSpec
from openai import OpenAI
import time

# Initialize Pinecone client lazily to avoid import-time network calls
pc = None
_index = None

INDEX_NAME = "healthvision_cases"
DIMENSION = 3072  # text-embedding-3-large dimension


def get_pinecone_client():
    global pc
    if pc is None:
        try:
            pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        except Exception as e:
            print(f"Pinecone client init failed: {e}")
            pc = None
    return pc


def get_index():
    """Lazily return a Pinecone Index object or None if unavailable.

    This avoids failing application startup when the index does not exist
    or Pinecone is temporarily unreachable.
    """
    global _index

    if _index is not None:
        return _index

    pc = get_pinecone_client()
    if pc is None:
        return None

    try:
        _index = pc.Index(INDEX_NAME)
        return _index
    except Exception:
        # Try to create the index if not found
        try:
            print(f"Index {INDEX_NAME} not found. Attempting to create it...")
            pc.create_index(
                name=INDEX_NAME,
                dimension=DIMENSION,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1"),
            )
            # give the service a moment to provision
            time.sleep(2)
            _index = pc.Index(INDEX_NAME)
            print(f"Index {INDEX_NAME} created successfully.")
            return _index
        except Exception as create_err:
            print(f"Unable to create Pinecone index {INDEX_NAME}: {create_err}")
            _index = None
            return None


openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def embed_text(text: str):
    response = openai_client.embeddings.create(
        model="text-embedding-3-large",
        input=text,
    )
    return response.data[0].embedding
