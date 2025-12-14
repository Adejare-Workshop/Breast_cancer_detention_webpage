import torch
import numpy as np
import pandas as pd
import joblib
import os
import gdown  # <--- NEW IMPORT
from PIL import Image
from torchvision import transforms
from medclip import MedCLIPModel
from pytorch_tabnet.tab_model import TabNetClassifier

class DiseasePredictor:
    def __init__(self, model_dir="results"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Loading models on {self.device}...")

        # --- NEW CODE START: Download Weights from Drive ---
        # We define the local filename here.
        weights_path = f"{model_dir}/model_weights.pth"
        
        if not os.path.exists(weights_path):
            print("Weights not found locally. Downloading from Google Drive...")
            
            # YOUR SPECIFIC FILE ID
            file_id = '1k_3siDeRQd6cgqu1_LzTvh9BM2xpFB3T'
            
            # Correct Google Drive Direct Download URL format
            url = f'https://drive.google.com/uc?id={file_id}'
            
            # Download the file
            gdown.download(url, weights_path, quiet=False)
        # --- NEW CODE END ---

        # 1. Load Scalers
        self.scaler_clinical = joblib.load(f"{model_dir}/scaler_clinical.joblib")
        self.scaler_image = joblib.load(f"{model_dir}/scaler_image.joblib")

        # 2. Load MedCLIP (Image Encoder)
        self.medclip = MedCLIPModel()
        # Load the weights we just downloaded (or found locally)
        self.medclip.load_state_dict(torch.load(weights_path, map_location=self.device))
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
        
        # Scale features using the saved scaler
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
