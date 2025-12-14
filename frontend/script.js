// --- CONFIGURATION ---
// Change this to your Render URL after deployment (e.g. 'https://my-app.onrender.com')
// Keep as http://127.0.0.1:8000 for local testing
const API_URL = 'http://127.0.0.1:8000'; 
// ---------------------

// Image Preview Logic
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

// Form Submission Logic
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
            // 1. Gather Clinical Data
            const clinicalData = {};
            // IMPORTANT: The keys here ('age', 'tumor_size') MUST match 
            // the column order your scaler_clinical expects!
            clinicalData['age'] = parseFloat(document.getElementById('age').value) || 0;
            clinicalData['tumor_size'] = parseFloat(document.getElementById('tumor_size').value) || 0;
            
            // 2. Prepare Payload
            const payload = new FormData();
            payload.append('image', document.getElementById('imageInput').files[0]);
            payload.append('clinical_data', JSON.stringify(clinicalData));

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
