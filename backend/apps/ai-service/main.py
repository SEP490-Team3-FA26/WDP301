from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import prescription
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize basic tracing later if needed
# Phoenix is currently disabled due to dependency conflicts

app = FastAPI(title="AI Prescription Service", version="1.0.0")

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
