from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastembed import TextEmbedding
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

# Load the model (load once)
try:
    model = TextEmbedding(
        model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2", # you can use any other models you want i use this one because it is so fast and lightwieght 
        cache_dir="./models"
    )
    logger.info("Model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    raise

print("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

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
    return {"message": "Text Embedding Service", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"}

@app.post("/embed", response_model=EmbedResponse)
async def embed_text(request: EmbedRequest):
    try:
        if not request.text or not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        start = time.perf_counter()
        embedding = next(model.embed([request.text]))
        elapsed = (time.perf_counter() - start) * 1000
        
        return EmbedResponse(
            embedding=embedding.tolist(),
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