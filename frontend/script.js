// ✅ YOUR HUGGING FACE URL
const API_URL = 'https://adejareworkstudio-heart-disease-backend.hf.space'; 

// Track current mode
let currentMode = 'combined';

// --- TAB SWITCHING ---
window.switchTab = function(mode) {
    currentMode = mode;
    
    // 1. Update Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    // Robust check to handle clicks on the button text vs the button itself
    const target = event.currentTarget || event.target;
    if(target) target.classList.add('active');

    // 2. Show/Hide Sections
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
    
    // Clear results when switching
    const resDiv = document.getElementById('result');
    if (resDiv) resDiv.style.display = 'none';
}


// --- PREVIEW LOGIC ---
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');

if (imageInput) {
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            }
            reader.readAsDataURL(file);
        }
    });
}


// --- SUBMIT LOGIC (CONSOLIDATED) ---
const form = document.getElementById('diagnosticForm');

if (form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const btn = document.getElementById('submitBtn');
        const resultDiv = document.getElementById('result');
        
        // 1. VISUAL FEEDBACK
        btn.disabled = true;
        btn.innerText = "Analyzing... (Please Wait)";
        resultDiv.style.display = 'none';

        try {
            const payload = new FormData();
            
            // --- GATHER IMAGE ---
            // Logic: Send image if mode is Combined or Image-Only
            if (currentMode !== 'clinical') {
                const imgFile = document.getElementById('imageInput').files[0];
                if (imgFile) {
                    payload.append('image', imgFile);
                } else if (currentMode === 'image') {
                    throw new Error("Please select an image file.");
                }
            }
            
            // --- GATHER CLINICAL DATA ---
            // Logic: Send text if mode is Combined or Clinical-Only
            if (currentMode !== 'image') {
                // Get inputs safely
                const ageInput = document.getElementById('age');
                const shapeInput = document.getElementById('shape');
                const marginInput = document.getElementById('margin');
                const tissueInput = document.getElementById('tissue');
                const haloInput = document.getElementById('halo');

                // Prepare Data Object (New Schema)
                const clinicalData = {
                    'Age': (ageInput && ageInput.value) ? ageInput.value : 53, // Default age
                    'Shape': shapeInput ? shapeInput.value : 'unknown',
                    'Margin': marginInput ? marginInput.value : 'unknown',
                    'Tissue': tissueInput ? tissueInput.value : 'unknown',
                    'Halo': haloInput ? haloInput.value : 'unknown'
                };
                
                payload.append('clinical_data', JSON.stringify(clinicalData));
            }

            // 2. SEND REQUEST
            console.log("Sending request to:", `${API_URL}/predict`);
            
            const response = await fetch(`${API_URL}/predict`, {
                method: 'POST',
                body: payload
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Try to parse JSON for cleaner error
                try {
                    const errJson = JSON.parse(errorText);
                    throw new Error(errJson.detail || `Server Error: ${response.status}`);
                } catch (e) {
                    throw new Error(`Server Error (${response.status}): ${errorText}`);
                }
            }

            const data = await response.json();
            console.log("Result received:", data);

            // 3. DISPLAY RESULT
            resultDiv.className = 'success';
            resultDiv.style.color = 'black'; // Force text color
            resultDiv.innerHTML = `
                <h3 style="color:#065f46; margin-top:0;">${data.prediction}</h3>
                <p>Confidence: <strong>${(data.confidence * 100).toFixed(1)}%</strong></p>
                <div class="confidence-bar">
                    <div class="fill" style="width: ${data.confidence * 100}%"></div>
                </div>
                <small style="display:block; margin-top:10px; color:#555">
                   Mode: ${data.mode || 'Standard'}
                </small>
            `;
            resultDiv.style.display = 'block';

        } catch (error) {
            console.error("Prediction Error:", error);
            
            resultDiv.className = 'error';
            resultDiv.style.color = 'black';
            resultDiv.innerHTML = `<strong>Error:</strong> ${error.message}`;
            resultDiv.style.display = 'block';
            
        } finally {
            btn.disabled = false;
            btn.innerText = "Generate Prediction";
        }
    });
}
