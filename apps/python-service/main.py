#!/usr/bin/env python3
"""
SilentSort Python LangGraph Service
AI-powered file analysis and renaming using LangGraph workflows
"""

import os
import json
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# LangGraph and LangChain imports
from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# FastAPI app setup
app = FastAPI(
    title="SilentSort LangGraph Service",
    description="AI-powered file analysis and renaming workflows",
    version="1.0.0"
)

# Enable CORS for Electron frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
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
    langraph_version: str

# LangGraph Workflow State
class FileProcessingState(BaseModel):
    # Input
    file_path: str
    original_name: str
    file_extension: str
    file_size: int
    content_preview: Optional[str] = None
    
    # Processing stages
    content_analysis: Optional[Dict[str, Any]] = None
    name_suggestions: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = None
    
    # Output
    final_result: Optional[FileAnalysisResponse] = None
    error: Optional[str] = None

class LangGraphFileProcessor:
    """LangGraph-based file processing workflow"""
    
    def __init__(self):
        self.llm = ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            temperature=float(os.getenv("OPENAI_TEMPERATURE", "0.3")),
            max_tokens=int(os.getenv("OPENAI_MAX_TOKENS", "1000"))
        )
        self.graph = self._build_workflow()
    
    def _build_workflow(self) -> StateGraph:
        """Build the LangGraph workflow for file processing"""
        
        workflow = StateGraph(FileProcessingState)
        
        # Add nodes
        workflow.add_node("analyze_content", self._analyze_content)
        workflow.add_node("generate_names", self._generate_names)
        workflow.add_node("calculate_confidence", self._calculate_confidence)
        workflow.add_node("finalize_result", self._finalize_result)
        
        # Add edges
        workflow.add_edge(START, "analyze_content")
        workflow.add_edge("analyze_content", "generate_names")
        workflow.add_edge("generate_names", "calculate_confidence")
        workflow.add_edge("calculate_confidence", "finalize_result")
        workflow.add_edge("finalize_result", END)
        
        return workflow.compile()
    
    async def _analyze_content(self, state: FileProcessingState) -> FileProcessingState:
        """Analyze file content and metadata"""
        
        analysis_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert file analyzer. Analyze the given file information and provide insights about its content, purpose, and type.
            
            Respond with a JSON object containing:
            - file_type: technical file type classification
            - content_summary: brief summary of what the file contains
            - document_category: one of [document, code, data, image, video, audio, archive, other]
            - key_topics: array of main topics/keywords
            - business_context: likely business or personal use context
            """),
            ("human", """File Information:
            - Original name: {original_name}
            - Extension: {file_extension}
            - Size: {file_size} bytes
            - Content preview: {content_preview}
            
            Provide detailed analysis as JSON only.""")
        ])
        
        try:
            response = await self.llm.ainvoke(
                analysis_prompt.format_messages(
                    original_name=state.original_name,
                    file_extension=state.file_extension,
                    file_size=state.file_size,
                    content_preview=state.content_preview or "No content preview available"
                )
            )
            
            # Parse JSON response
            analysis = json.loads(response.content)
            state.content_analysis = analysis
            
        except Exception as e:
            state.error = f"Content analysis failed: {str(e)}"
            
        return state
    
    async def _generate_names(self, state: FileProcessingState) -> FileProcessingState:
        """Generate filename suggestions based on content analysis"""
        
        if state.error or not state.content_analysis:
            return state
            
        naming_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert at creating descriptive, organized filenames. Based on the content analysis, suggest optimal filenames that are:
            1. Descriptive and clear
            2. Follow good naming conventions (no spaces, use hyphens/underscores)
            3. Include relevant context
            4. Keep original extension
            5. Under 100 characters
            
            Respond with JSON containing:
            - primary_suggestion: best filename suggestion
            - alternatives: array of 3-5 alternative names
            - reasoning: explanation for the primary choice
            - category: organizational category for the file
            """),
            ("human", """Content Analysis:
            {content_analysis}
            
            Original filename: {original_name}
            Extension: {file_extension}
            
            Generate optimized filename suggestions as JSON only.""")
        ])
        
        try:
            response = await self.llm.ainvoke(
                naming_prompt.format_messages(
                    content_analysis=json.dumps(state.content_analysis, indent=2),
                    original_name=state.original_name,
                    file_extension=state.file_extension
                )
            )
            
            # Parse JSON response
            suggestions = json.loads(response.content)
            state.name_suggestions = suggestions
            
        except Exception as e:
            state.error = f"Name generation failed: {str(e)}"
            
        return state
    
    async def _calculate_confidence(self, state: FileProcessingState) -> FileProcessingState:
        """Calculate confidence score based on analysis quality"""
        
        if state.error or not state.name_suggestions:
            state.confidence_score = 0.0
            return state
        
        # Simple confidence calculation based on available information
        confidence = 0.5  # Base confidence
        
        # Increase confidence based on available data
        if state.content_preview:
            confidence += 0.2
        if state.content_analysis and len(state.content_analysis.get("key_topics", [])) > 0:
            confidence += 0.2
        if state.file_size > 1024:  # Non-empty file
            confidence += 0.1
        
        state.confidence_score = min(confidence, 1.0)
        return state
    
    async def _finalize_result(self, state: FileProcessingState) -> FileProcessingState:
        """Create final response object"""
        
        if state.error:
            state.final_result = FileAnalysisResponse(
                suggested_name=state.original_name,
                confidence=0.0,
                category="error",
                reasoning=f"Processing failed: {state.error}",
                processing_time_ms=0
            )
        else:
            suggestions = state.name_suggestions or {}
            analysis = state.content_analysis or {}
            
            state.final_result = FileAnalysisResponse(
                suggested_name=suggestions.get("primary_suggestion", state.original_name),
                confidence=state.confidence_score or 0.0,
                category=suggestions.get("category", "unknown"),
                reasoning=suggestions.get("reasoning", "AI analysis completed"),
                alternatives=suggestions.get("alternatives", []),
                content_summary=analysis.get("content_summary"),
                processing_time_ms=0  # Will be set by the endpoint
            )
        
        return state
    
    async def process_file(self, request: FileAnalysisRequest) -> FileAnalysisResponse:
        """Process a file through the LangGraph workflow"""
        
        # Initialize state
        initial_state = FileProcessingState(
            file_path=request.file_path,
            original_name=request.original_name,
            file_extension=request.file_extension,
            file_size=request.file_size,
            content_preview=request.content_preview
        )
        
        # Run the workflow
        result = await self.graph.ainvoke(initial_state)
        
        return result.final_result

# Global processor instance
processor = LangGraphFileProcessor()

# API Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        openai_configured=bool(os.getenv("OPENAI_API_KEY")),
        langraph_version="0.3.5"
    )

@app.post("/analyze-file", response_model=FileAnalysisResponse)
async def analyze_file(request: FileAnalysisRequest):
    """Analyze a file and suggest a better name using LangGraph workflow"""
    
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500, 
            detail="OpenAI API key not configured"
        )
    
    start_time = datetime.now()
    
    try:
        result = await processor.process_file(request)
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        result.processing_time_ms = int(processing_time)
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"File analysis failed: {str(e)}"
        )

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "SilentSort LangGraph Service",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "analyze": "/analyze-file",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    # Development server
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    ) 