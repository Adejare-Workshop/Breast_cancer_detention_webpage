// ✅ YOUR HUGGING FACE URL
const API_URL = 'https://adejareworkstudio-heart-disease-backend.hf.space'; 

// Track current mode
let currentMode = 'combined';
let currentImageBase64 = ""; // Global variable for Google Sheets sync

// --- TAB SWITCHING ---
window.switchTab = function(mode) {
    currentMode = mode;
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const target = event.currentTarget || event.target;
    if(target) target.classList.add('active');

    const imgSection = document.getElementById('section-image');
    const clinSection = document.getElementById('section-clinical');

    if (mode === 'combined') {
        imgSection.style.display = 'block';
        clinSection.style.display = 'block';
    } else if (mode === 'clinical') {
        imgSection.style.display = 'none';
        clinSection.style.display = 'block';
    } else if (mode === 'image') {
        imgSection.style.display = 'block';
        clinSection.style.display = 'none';
    }
    
    const resDiv = document.getElementById('result');
    if (resDiv) resDiv.style.display = 'none';
}

// --- PREVIEW LOGIC & IMAGE CAPTURE ---
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');

if (imageInput) {
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                currentImageBase64 = e.target.result; 
                imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; border-radius: 8px;">`;
            }
            reader.readAsDataURL(file);
        }
    });
}

// --- GOOGLE SHEETS SYNC ---
async function syncDataToSheets(predictionResult) {
    const webAppUrl = "https://script.google.com/macros/s/AKfycbyQRMOoogW408vv2wiNSg4kaoeLg3bsk9oNiUiaN1Os4lDAd7_XXUheiurqyVQY7dWAFQ/exec";

    const payload = {
        age: document.getElementById('age')?.value || "N/A",
        shape: document.getElementById('shape')?.value || "N/A",
        margin: document.getElementById('margin')?.value || "N/A",
        tissue: document.getElementById('tissue')?.value || "N/A",
        halo: document.getElementById('halo')?.value || "N/A",
        prediction: predictionResult,
        image: (currentMode !== 'clinical') ? currentImageBase64 : "No image uploaded" 
    };

    try {
        await fetch(webAppUrl, {
            method: 'POST',
            mode: 'no-cors', 
            body: JSON.stringify(payload)
        });
        console.log("Data successfully synced to Google Sheet tabs.");
    } catch (error) {
        console.error("Sheet sync failed:", error);
    }
}

// --- SUBMIT LOGIC ---
const form = document.getElementById('diagnosticForm');

if (form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const btn = document.getElementById('submitBtn');
        const resultDiv = document.getElementById('result');
        
        btn.disabled = true;
        btn.innerText = "Analyzing... (Please Wait)";
        resultDiv.style.display = 'none';

        try {
            const payload = new FormData();
            
            // Append Image
            if (currentMode !== 'clinical') {
                const imgFile = document.getElementById('imageInput').files[0];
                if (imgFile) payload.append('image', imgFile);
                else if (currentMode === 'image') throw new Error("Please select an image file.");
            }
            
            // Append Clinical Data (Lowercase keys to match backend)
            if (currentMode !== 'image') {
                const ageInput = document.getElementById('age');
                const clinicalData = {
                    'age': (ageInput && ageInput.value) ? ageInput.value : 50,
                    'shape': document.getElementById('shape')?.value || 'unknown',
                    'margin': document.getElementById('margin')?.value || 'unknown',
                    'tissue': document.getElementById('tissue')?.value || 'unknown',
                    'halo': document.getElementById('halo')?.value || 'unknown'
                };
                payload.append('clinical_data', JSON.stringify(clinicalData));
            }

            const response = await fetch(`${API_URL}/predict`, {
                method: 'POST',
                body: payload
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Server Error: ${response.status} - ${errText}`);
            }
            
            const data = await response.json();
            console.log("Raw API Response:", data); // Helpful for debugging in F12

            // --- EXTRACT DATA FROM NEW LATE FUSION STRUCTURE ---
            // We safely check if the new backend structure exists
            let finalPred = "Unknown";
            let finalConf = 0.0;
            let displayMode = "Unknown Mode";

            if (data.final_diagnosis) {
                finalPred = data.final_diagnosis.prediction;
                finalConf = data.final_diagnosis.confidence;
                displayMode = data.final_diagnosis.mode;
            } else if (data.prediction) {
                // Fallback just in case old backend is cached
                finalPred = data.prediction;
                finalConf = data.confidence;
                displayMode = data.mode || "Single-Modality";
            }

            const confPercent = (finalConf * 100).toFixed(1);

            // Determine color scheme
            let textColor = "#065f46"; // Green for Benign/Normal
            if (finalPred.toLowerCase() === "malignant") {
                textColor = "#991b1b"; // Red for Malignant
            }

            // DISPLAY RESULT
            resultDiv.className = 'success';
            resultDiv.style.color = 'black'; 
            resultDiv.innerHTML = `
                <h3 style="color:${textColor}; margin-top:0;">Diagnosis: ${finalPred}</h3>
                <p>Confidence: <strong>${confPercent}%</strong></p>
                <p style="font-size: 0.8em; color: #666; margin-bottom: 5px;">Analysis Mode: ${displayMode}</p>
                <div class="confidence-bar" style="background-color: #e5e7eb; height: 10px; border-radius: 5px; overflow: hidden;">
                    <div class="fill" style="width: ${confPercent}%; background-color: ${textColor}; height: 100%;"></div>
                </div>
            `;
            resultDiv.style.display = 'block';

            // TRIGGER THE SYNC
            await syncDataToSheets(finalPred);

        } catch (error) {
            console.error("Prediction Error:", error);
            resultDiv.className = 'error';
            resultDiv.innerHTML = `<strong>Error:</strong> ${error.message}`;
            resultDiv.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.innerText = "Generate Prediction";
        }
    });
}
