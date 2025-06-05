from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import time
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Text Embedding Service",
    description="FastAPI service for generating text embeddings",
    version="1.0.0"
)

# Global variable to hold the model
model = None

def load_model():
    """Load the SentenceTransformer model with error handling."""
    global model
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("intfloat/multilingual-e5-base", cache_folder="./models")
        logger.info("Model loaded successfully")
        return True
    except ImportError as e:
        logger.error(f"Import error - likely version compatibility issue: {e}")
        logger.error("Try: pip install sentence-transformers==2.2.2 huggingface-hub==0.16.4")
        return False
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        return False

# Try to load model at startup
model_loaded = load_model()

# Request schema
class EmbedRequest(BaseModel):
    text: str

# Response schema
class EmbedResponse(BaseModel):
    embedding: list[float]
    dims: int
    elapsed_ms: float

@app.get("/")
async def root():
    return {
        "message": "Text Embedding Service", 
        "status": "running" if model_loaded else "model_load_failed",
        "model_loaded": model_loaded
    }

@app.get("/health")
async def health_check():
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded - service unavailable")
    return {"status": "healthy", "model": "intfloat/multilingual-e5-base"}

@app.post("/embed", response_model=EmbedResponse)
async def embed_text(request: EmbedRequest):
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded - service unavailable")
    
    try:
        if not request.text or not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        start = time.perf_counter()
        embedding = model.encode(request.text)
        elapsed = (time.perf_counter() - start) * 1000

        return EmbedResponse(
            embedding=embedding.tolist() if hasattr(embedding, 'tolist') else list(embedding),
            dims=len(embedding),
            elapsed_ms=round(elapsed, 2)
        )
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate embedding")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5050))
    uvicorn.run(app, host="0.0.0.0", port=port)