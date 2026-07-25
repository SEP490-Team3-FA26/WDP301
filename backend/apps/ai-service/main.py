from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import prescription, symptoms
from scripts.index_from_mongo import main as index_db
from qdrant_client import QdrantClient
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="AI Prescription Service",
    description="Microservice for handling symptom checking and AI prescription via LLMs",
    version="1.0.0"
)

# Initialize Qdrant collection on startup
@app.on_event("startup")
def init_qdrant():
    try:
        QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
        if "up.railway.app" in QDRANT_HOST:
            qdrant = QdrantClient(url=f"https://{QDRANT_HOST}:443")
        else:
            qdrant = QdrantClient(host=QDRANT_HOST, port=6333)
            
        if not qdrant.collection_exists("medical_knowledge"):
            print("Collection 'medical_knowledge' not found! Indexing from DB...")
            index_db()
        else:
            print("Collection 'medical_knowledge' already exists.")
    except Exception as e:
        print(f"Error checking Qdrant collection on startup: {e}")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from fastapi.staticfiles import StaticFiles

app.include_router(prescription.router)

# Mount static directories for sample prescriptions and uploads
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "static"))
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
else:
    print(f"Warning: static directory {static_dir} not found!")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
