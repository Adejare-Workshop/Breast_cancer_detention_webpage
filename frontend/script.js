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
                imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            }
            reader.readAsDataURL(file);
        }
    });
}

// --- GOOGLE SHEETS SYNC (UPDATED WITH NEW LINK) ---
async function syncDataToSheets(predictionResult) {
    // NEW DEPLOYMENT LINK
    const webAppUrl = "https://script.google.com/macros/s/AKfycbyQRMOoogW408vv2wiNSg4kaoeLg3bsk9oNiUiaN1Os4lDAd7_XXUheiurqyVQY7dWAFQ/exec";

    const payload = {
        age: document.getElementById('age')?.value || "N/A",
        shape: document.getElementById('shape')?.value || "N/A",
        margin: document.getElementById('margin')?.value || "N/A",
        tissue: document.getElementById('tissue')?.value || "N/A",
        halo: document.getElementById('halo')?.value || "N/A",
        prediction: predictionResult,
        image: (currentMode !== 'clinical') ? currentImageBase64 : "" 
    };

    try {
        await fetch(webAppUrl, {
            method: 'POST',
            mode: 'no-cors', 
            body: JSON.stringify(payload)
        });
        console.log("Data synced to Sheets successfully.");
    } catch (error) {
        console.error("Sync error:", error);
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
            
            if (currentMode !== 'clinical') {
                const imgFile = document.getElementById('imageInput').files[0];
                if (imgFile) payload.append('image', imgFile);
                else if (currentMode === 'image') throw new Error("Please select an image file.");
            }
            
            if (currentMode !== 'image') {
                const clinicalData = {
                    'Age': document.getElementById('age')?.value || 53,
                    'Shape': document.getElementById('shape')?.value || 'unknown',
                    'Margin': document.getElementById('margin')?.value || 'unknown',
                    'Tissue': document.getElementById('tissue')?.value || 'unknown',
                    'Halo': document.getElementById('halo')?.value || 'unknown'
                };
                payload.append('clinical_data', JSON.stringify(clinicalData));
            }

            const response = await fetch(`${API_URL}/predict`, {
                method: 'POST',
                body: payload
            });

            if (!response.ok) throw new Error(`Server Error: ${response.status}`);
            const data = await response.json();

            // DISPLAY RESULT
            resultDiv.className = 'success';
            resultDiv.style.color = 'black'; 
            resultDiv.innerHTML = `
                <h3 style="color:#065f46; margin-top:0;">${data.prediction}</h3>
                <p>Confidence: <strong>${(data.confidence * 100).toFixed(1)}%</strong></p>
                <div class="confidence-bar">
                    <div class="fill" style="width: ${data.confidence * 100}%"></div>
                </div>
            `;
            resultDiv.style.display = 'block';

            // SYNC TO THREE TABS IN GOOGLE SHEETS
            await syncDataToSheets(data.prediction);

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
