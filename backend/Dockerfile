# Use a lightweight Python version
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
# We use --no-cache-dir to keep the image small
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu torch && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create the results directory so the code doesn't crash
RUN mkdir -p results

# Command to run the app (Hugging Face listens on port 7860)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
