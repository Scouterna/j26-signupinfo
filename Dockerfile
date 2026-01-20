# --- Stage 1: Build the React client ---
# Use a Node.js image to build the static files
FROM node:24-alpine AS client-builder

# Set the working directory
WORKDIR /app/client

# Copy package.json and package-lock.json and install dependencies
COPY client/package*.json ./
RUN npm install

# Copy the rest of the client source code
COPY client/ ./

# Build the production-ready static files
RUN npm run build

# --- Stage 2: Build the Python Backend ---
# Use a Python image for the final application
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app/pyapp

# Set environment variables to prevent Python from writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install Python dependencies
COPY pyapp/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the backend source code into the container
COPY pyapp/ ./

# --- Stage 3: Combine client and Backend ---
# Copy the built static files from the 'client-builder' stage
# The destination 'static' folder is what our FastAPI app serves
COPY --from=client-builder /app/client/dist ./static

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application using Uvicorn
# Use 0.0.0.0 to be accessible from outside the container
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
