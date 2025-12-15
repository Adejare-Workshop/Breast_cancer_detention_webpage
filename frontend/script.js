// --- CONFIGURATION ---
const API_URL = 'https://adejareworkstudio-heart-disease-backend.hf.space'; 
// ---------------------

// Track current mode (default is combined)
let currentMode = 'combined';

// --- TAB SWITCHING LOGIC ---
window.switchTab = function(mode) {
    currentMode = mode;
    
    // 1. Update Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active'); // Highlight clicked button

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
    document.getElementById('result').style.display = 'none';
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


// --- SUBMISSION LOGIC ---
const form = document.getElementById('diagnosticForm');

if (form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const btn = document.getElementById('submitBtn');
        const resultDiv = document.getElementById('result');
        
        btn.disabled = true;
        btn.innerText = "Analyzing...";
        resultDiv.style.display = 'none';

        try {
            const payload = new FormData();
            
            // LOGIC: Only send data relevant to the current tab
            
            // 1. Handle Image
            if (currentMode === 'combined' || currentMode === 'image') {
                const imgFile = document.getElementById('imageInput').files[0];
                if (imgFile) {
                    payload.append('image', imgFile);
                } else {
                    if (currentMode === 'image') throw new Error("Please select an image.");
                }
            }

            // 2. Handle Clinical Data
            if (currentMode === 'combined' || currentMode === 'clinical') {
                const caseId = document.getElementById('case_id').value;
                const pixSize = document.getElementById('pixel_size').value;
                
                // If mode is Clinical Only, require inputs. If Combined, they are optional.
                if (currentMode === 'clinical' && (!caseId && !pixSize)) {
                    throw new Error("Please enter clinical data.");
                }

                if (caseId || pixSize) {
                    const clinicalData = {
                        'CaseID': parseFloat(caseId) || 0,
                        'Pixel_size': parseFloat(pixSize) || 0.007
                    };
                    payload.append('clinical_data', JSON.stringify(clinicalData));
                }
            }

            // 3. Send Request
            const response = await fetch(`${API_URL}/predict`, {
                method: 'POST',
                body: payload
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Server error");
            }

            const data = await response.json();

            // 4. Display Result
            resultDiv.className = 'success';
            resultDiv.innerHTML = `
                <h3 style="margin:0">Prediction: ${data.prediction}</h3>
                <p>Confidence: ${(data.confidence * 100).toFixed(1)}%</p>
                <div class="confidence-bar">
                    <div class="fill" style="width: ${data.confidence * 100}%"></div>
                </div>
                <small style="display:block; margin-top:10px">
                   Normal: ${(data.probabilities.Normal*100).toFixed(1)}% | 
                   Benign: ${(data.probabilities.Benign*100).toFixed(1)}% | 
                   Malignant: ${(data.probabilities.Malignant*100).toFixed(1)}%
                </small>
            `;
            resultDiv.style.display = 'block';

        } catch (error) {
            resultDiv.className = 'error';
            resultDiv.innerHTML = `<strong>Error:</strong> ${error.message}`;
            resultDiv.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.innerText = "Generate Prediction";
        }
    });
}
