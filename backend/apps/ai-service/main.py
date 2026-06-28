from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import prescription
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize basic tracing later if needed
# Phoenix is currently disabled due to dependency conflicts

app = FastAPI(title="AI Prescription Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prescription.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
