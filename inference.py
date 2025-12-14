import torch
import numpy as np
import pandas as pd
import joblib
from PIL import Image
from torchvision import transforms
from medclip import MedCLIPModel
from pytorch_tabnet.tab_model import TabNetClassifier

class DiseasePredictor:
    def __init__(self, model_dir="results"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Loading models on {self.device}...")

        # 1. Load Scalers (Crucial for correct inference)
        self.scaler_clinical = joblib.load(f"{model_dir}/scaler_clinical.joblib")
        self.scaler_image = joblib.load(f"{model_dir}/scaler_image.joblib")

        # 2. Load MedCLIP (Image Encoder)
        self.medclip = MedCLIPModel()
        # Loading weights as defined in the notebook logic
        self.medclip.load_state_dict(torch.load(f"{model_dir}/Medclip_model_weights.pth", map_location=self.device))
        self.medclip.to(self.device)
        self.medclip.eval()

        # 3. Load TabNet (Classifier)
        self.tabnet = joblib.load(f"{model_dir}/tabnet_combined_model.joblib")

        # 4. Define Image Transform
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
        ])
        
        # Label Mapping
        self.labels = {0: 'Normal', 1: 'Benign', 2: 'Malignant'}

    def preprocess_image(self, image_file):
        """Processes image to embeddings using MedCLIP."""
        image = Image.open(image_file).convert('RGB')
        img_tensor = self.transform(image).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            embedding = self.medclip.encode_image(img_tensor)
            embedding_np = embedding.cpu().numpy()
            
        # Scale embeddings using the saved scaler
        return self.scaler_image.transform(embedding_np)

    def preprocess_clinical(self, data_dict):
        """Processes tabular data to match training shape."""
        # Convert dict to DataFrame
        df = pd.DataFrame([data_dict])
        
        # Ensure columns match training order (You must list all numeric features used in training here)
        # Note: This implies the dict keys must match the CSV columns used in 'project jare.ipynb'
        
        # Scale features
        return self.scaler_clinical.transform(df.values)

    def predict(self, image_file, clinical_data):
        # 1. Get Image Features
        img_feats = self.preprocess_image(image_file)
        
        # 2. Get Clinical Features
        clin_feats = self.preprocess_clinical(clinical_data)
        
        # 3. Early Fusion (Concatenate)
        X_combined = np.hstack([img_feats, clin_feats])
        
        # 4. Predict
        prediction_idx = self.tabnet.predict(X_combined)[0]
        probabilities = self.tabnet.predict_proba(X_combined)[0]
        
        return {
            "prediction": self.labels[int(prediction_idx)],
            "confidence": float(np.max(probabilities)),
            "probabilities": {self.labels[i]: float(p) for i, p in enumerate(probabilities)}
        }
