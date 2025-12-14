from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from inference import HeartDiseasePredictor  # <--- UPDATED IMPORT
import json
import os

app = FastAPI(title="Multimodal Heart Disease Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model_service = None

@app.on_event("startup")
def startup_event():
    global model_service
    try:
        if not os.path.exists("results"):
            os.makedirs("results")
            
        print("Initializing model service...")
        # <--- UPDATED CLASS USAGE
        model_service = HeartDiseasePredictor(model_dir="results") 
        print("Model service ready!")
    except Exception as e:
        print(f"CRITICAL ERROR loading models: {e}")

@app.get("/")
def read_root():
    return {"status": "healthy", "message": "Heart Disease Prediction API is running"}

@app.post("/predict")
async def predict(
    image: UploadFile = File(...),
    clinical_data: str = Form(...) 
):
    if not model_service:
        raise HTTPException(status_code=503, detail="Model service not ready")

    try:
        data_dict = json.loads(clinical_data)
        result = model_service.predict(image.file, data_dict)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
