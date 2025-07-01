#!/usr/bin/env python3
"""
SilentSort Simple Python AI Service
Basic OpenAI-powered file analysis (without LangGraph for now)
"""

import os
import json
import time
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
import openai

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# FastAPI app setup
app = FastAPI(
    title="SilentSort Simple AI Service",
    description="Basic OpenAI-powered file analysis",
    version="1.0.0"
)

# Enable CORS for Electron frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class FileAnalysisRequest(BaseModel):
    file_path: str = Field(..., description="Path to the file to analyze")
    original_name: str = Field(..., description="Original filename")
    file_size: int = Field(..., description="File size in bytes")
    file_extension: str = Field(..., description="File extension")
    content_preview: Optional[str] = Field(None, description="Text content preview")

class FileAnalysisResponse(BaseModel):
    suggested_name: str = Field(..., description="AI-suggested filename")
    confidence: float = Field(..., description="Confidence score 0-1")
    category: str = Field(..., description="File category")
    reasoning: str = Field(..., description="AI reasoning for the name")
    alternatives: List[str] = Field(default=[], description="Alternative names")
    content_summary: Optional[str] = Field(None, description="Content summary")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    openai_configured: bool
    service_type: str

# Initialize OpenAI client
openai_client = None
if os.getenv("OPENAI_API_KEY"):
    openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def analyze_file_with_openai(request: FileAnalysisRequest) -> FileAnalysisResponse:
    """Analyze file using OpenAI directly"""
    
    if not openai_client:
        raise HTTPException(status_code=500, detail="OpenAI not configured")
    
    # Build analysis prompt
    prompt = f"""You are an expert file organizer. Analyze this file and suggest a better, descriptive filename.

File Information:
- Current name: {request.original_name}
- Extension: {request.file_extension}
- Size: {request.file_size} bytes
- Content preview: {request.content_preview or "No content available"}

Requirements:
1. Suggest a clear, descriptive filename (keep the original extension)
2. Use only alphanumeric characters, hyphens, and underscores
3. Keep filename under 100 characters
4. Categorize the file (document, image, code, data, etc.)
5. Provide confidence score (0.0-1.0)
6. Suggest 2-3 alternative names
7. Explain your reasoning

Respond ONLY with valid JSON in this exact format:
{{
  "suggested_name": "descriptive-filename{request.file_extension}",
  "confidence": 0.85,
  "category": "document",
  "reasoning": "Brief explanation of why this name was chosen",
  "alternatives": ["alt-name-1{request.file_extension}", "alt-name-2{request.file_extension}"],
  "content_summary": "Brief summary of file content"
}}"""

    try:
        # Call OpenAI
        response = openai_client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=int(os.getenv("OPENAI_MAX_TOKENS", "500")),
            temperature=float(os.getenv("OPENAI_TEMPERATURE", "0.3")),
        )
        
        content = response.choices[0].message.content
        if not content:
            raise Exception("No response from OpenAI")
        
        # Parse JSON response
        result = json.loads(content.strip())
        
        return FileAnalysisResponse(
            suggested_name=result.get("suggested_name", request.original_name),
            confidence=float(result.get("confidence", 0.0)),
            category=result.get("category", "unknown"),
            reasoning=result.get("reasoning", "AI analysis completed"),
            alternatives=result.get("alternatives", []),
            content_summary=result.get("content_summary"),
            processing_time_ms=0  # Will be set by endpoint
        )
        
    except json.JSONDecodeError as e:
        # Fallback if JSON parsing fails
        return FileAnalysisResponse(
            suggested_name=f"ai-processed-{int(time.time())}{request.file_extension}",
            confidence=0.5,
            category="document",
            reasoning="AI provided response but JSON parsing failed",
            alternatives=[],
            processing_time_ms=0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI analysis failed: {str(e)}")

# API Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        openai_configured=bool(os.getenv("OPENAI_API_KEY")),
        service_type="simple-openai"
    )

@app.post("/analyze-file", response_model=FileAnalysisResponse)
async def analyze_file(request: FileAnalysisRequest):
    """Analyze a file and suggest a better name using OpenAI"""
    
    start_time = time.time()
    
    try:
        result = await analyze_file_with_openai(request)
        
        # Calculate processing time
        processing_time = int((time.time() - start_time) * 1000)
        result.processing_time_ms = processing_time
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "SilentSort Simple AI Service",
        "status": "running",
        "type": "openai-direct",
        "endpoints": {
            "health": "/health",
            "analyze": "/analyze-file",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    # Development server
    uvicorn.run(
        "simple-main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    ) 