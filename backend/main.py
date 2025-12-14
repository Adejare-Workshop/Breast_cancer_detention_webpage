from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from inference import DiseasePredictor
import json

app = FastAPI(title="Multimodal Disease Prediction API")

# Allow CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Model Service
model_service = None

@app.on_event("startup")
def startup_event():
    global model_service
    try:
        model_service = DiseasePredictor()
    except Exception as e:
        print(f"Error loading models: {e}")

@app.post("/predict")
async def predict(
    image: UploadFile = File(...),
    # Accepting clinical data as a JSON string inside a form field for simplicity
    clinical_data: str = Form(...) 
):
    """
    API Contract:
    - image: Ultrasound image file (PNG/JPG)
    - clinical_data: JSON string of numeric features (e.g., '{"age": 45, "tumor_size": 2.5...}')
    """
    if not model_service:
        raise HTTPException(status_code=503, detail="Model service not ready")

    try:
        # Parse JSON data
        data_dict = json.loads(clinical_data)
        
        # Run Inference
        result = model_service.predict(image.file, data_dict)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
