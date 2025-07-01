#!/usr/bin/env python3
"""
SilentSort LangGraph Multi-Agent AI Service
Advanced file organization using LangGraph workflow orchestration
"""

import os
import json
import time
import asyncio
from datetime import datetime
from typing import TypedDict, List, Optional, Dict, Any, Annotated
from enum import Enum

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# LangGraph imports
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableParallel

# Utilities
from dotenv import load_dotenv
from loguru import logger
import sqlite3
import aiosqlite

# Load environment variables
load_dotenv()

# Configure logging
logger.add("silentsort.log", rotation="10 MB", level="INFO")

# FastAPI app setup
app = FastAPI(
    title="SilentSort LangGraph AI Service",
    description="Advanced multi-agent file organization with LangGraph",
    version="2.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,  
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# LANGGRAPH STATE & TYPES
# ============================================================================

class FileProcessingState(TypedDict):
    # File Information
    file_path: str
    original_filename: str
    file_extension: str
    file_size: int
    content_preview: str
    
    # AI Analysis Results
    content_analysis: Optional[Dict[str, Any]]
    naming_suggestions: Optional[List[str]]
    category_analysis: Optional[str]
    confidence_scores: Optional[Dict[str, float]]
    
    # Final Results
    suggested_name: Optional[str]
    final_confidence: Optional[float]
    final_category: Optional[str]
    reasoning: Optional[str]
    alternatives: Optional[List[str]]
    
    # Processing State
    processing_stage: str
    user_decision: Optional[str]
    error_message: Optional[str]
    retry_count: int
    
    # Context & Learning
    folder_context: Optional[Dict[str, Any]]
    user_patterns: Optional[Dict[str, Any]]
    operation_metadata: Dict[str, Any]

class ProcessingStage(Enum):
    INITIALIZED = "initialized"
    CONTENT_ANALYSIS = "content_analysis"
    PARALLEL_PROCESSING = "parallel_processing"
    DECISION_ROUTING = "decision_routing"
    HUMAN_APPROVAL = "human_approval"
    COMPLETED = "completed"
    FAILED = "failed"

# ============================================================================
# PYDANTIC MODELS FOR API
# ============================================================================

class FileAnalysisRequest(BaseModel):
    file_path: str
    original_name: str
    file_size: int
    file_extension: str
    content_preview: Optional[str] = None

class FileAnalysisResponse(BaseModel):
    suggested_name: str
    confidence: float
    category: str
    reasoning: str
    alternatives: List[str] = []
    content_summary: Optional[str] = None
    processing_time_ms: int
    workflow_id: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    openai_configured: bool
    langgraph_enabled: bool
    service_type: str

# ============================================================================
# LANGGRAPH WORKFLOW IMPLEMENTATION
# ============================================================================

class SilentSortWorkflow:
    def __init__(self):
        self.llm = self._initialize_llm()
        self.workflow = self._build_workflow()
        self.checkpointer = MemorySaver()
        
    def _initialize_llm(self) -> ChatOpenAI:
        """Initialize the LangChain LLM"""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not configured")
            
        return ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            temperature=float(os.getenv("OPENAI_TEMPERATURE", "0.3")),
            max_tokens=int(os.getenv("OPENAI_MAX_TOKENS", "1000")),
            openai_api_key=api_key,
        )
    
    def _build_workflow(self) -> StateGraph:
        """Build the complete LangGraph workflow"""
        workflow = StateGraph(FileProcessingState)
        
        # Add nodes
        workflow.add_node("load_state", self.load_state_node)
        workflow.add_node("content_analysis", self.content_analysis_node)
        workflow.add_node("parallel_processing", self.parallel_processing_node)
        workflow.add_node("decision_routing", self.decision_routing_node)
        workflow.add_node("auto_executor", self.auto_executor_node)
        workflow.add_node("human_approval", self.human_approval_node)
        workflow.add_node("error_handler", self.error_handler_node)
        workflow.add_node("finalize_result", self.finalize_result_node)
        
        # Set entry point
        workflow.set_entry_point("load_state")
        
        # Define edges
        workflow.add_edge("load_state", "content_analysis")
        workflow.add_edge("content_analysis", "parallel_processing")
        workflow.add_edge("parallel_processing", "decision_routing")
        
        # Conditional routing from decision_routing
        workflow.add_conditional_edges(
            "decision_routing",
            self.route_by_confidence,
            {
                "auto_execute": "auto_executor",
                "human_approval": "human_approval",
                "error": "error_handler"
            }
        )
        
        # Final edges
        workflow.add_edge("auto_executor", "finalize_result")
        workflow.add_edge("human_approval", "finalize_result")
        workflow.add_edge("error_handler", "finalize_result")
        workflow.add_edge("finalize_result", END)
        
        return workflow.compile(checkpointer=self.checkpointer)
    
    # ========================================================================
    # WORKFLOW NODES
    # ========================================================================
    
    async def load_state_node(self, state: FileProcessingState) -> Dict[str, Any]:
        """Initialize the workflow state"""
        logger.info(f"🚀 Loading state for file: {state['original_filename']}")
        
        return {
            "processing_stage": ProcessingStage.INITIALIZED.value,
            "operation_metadata": {
                "started_at": datetime.now().isoformat(),
                "workflow_version": "2.0.0"
            },
            "retry_count": 0
        }
    
    async def content_analysis_node(self, state: FileProcessingState) -> Dict[str, Any]:
        """Analyze file content using AI"""
        logger.info(f"🔍 Analyzing content for: {state['original_filename']}")
        
        try:
            prompt = f"""Analyze this file and extract key information:

File: {state['original_filename']}
Extension: {state['file_extension']}
Size: {state['file_size']} bytes
Content: {state.get('content_preview', 'No content available')[:500]}

Provide analysis in JSON format:
{{
    "content_type": "document|image|code|other",
    "key_topics": ["topic1", "topic2"],
    "document_purpose": "brief description",
    "business_context": "context if applicable",
    "content_summary": "2-sentence summary"
}}"""

            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            
            try:
                analysis = json.loads(response.content)
            except json.JSONDecodeError:
                # Fallback analysis
                analysis = {
                    "content_type": "document",
                    "key_topics": [state['file_extension'].replace('.', '')],
                    "document_purpose": "File analysis",
                    "business_context": "General file",
                    "content_summary": f"File of type {state['file_extension']}"
                }
            
            return {
                "content_analysis": analysis,
                "processing_stage": ProcessingStage.CONTENT_ANALYSIS.value
            }
            
        except Exception as e:
            logger.error(f"❌ Content analysis failed: {e}")
            return {"error_message": f"Content analysis failed: {str(e)}"}
    
    async def parallel_processing_node(self, state: FileProcessingState) -> Dict[str, Any]:
        """Run parallel AI agents for naming, categorization, and confidence"""
        logger.info(f"⚡ Running parallel processing for: {state['original_filename']}")
        
        try:
            # Run three agents in parallel
            parallel_chain = RunnableParallel({
                "naming": self._naming_agent,
                "categorization": self._categorization_agent,
                "confidence": self._confidence_agent
            })
            
            # Prepare input for parallel processing
            input_data = {
                "content_analysis": state.get("content_analysis", {}),
                "original_filename": state["original_filename"],
                "file_extension": state["file_extension"],
                "content_preview": state.get("content_preview", "")
            }
            
            results = await parallel_chain.ainvoke(input_data)
            
            return {
                "naming_suggestions": results["naming"]["suggestions"],
                "category_analysis": results["categorization"]["category"],
                "confidence_scores": results["confidence"]["scores"],
                "processing_stage": ProcessingStage.PARALLEL_PROCESSING.value
            }
            
        except Exception as e:
            logger.error(f"❌ Parallel processing failed: {e}")
            return {"error_message": f"Parallel processing failed: {str(e)}"}
    
    async def decision_routing_node(self, state: FileProcessingState) -> Dict[str, Any]:
        """Route based on confidence scores and rules"""
        logger.info(f"🎯 Routing decision for: {state['original_filename']}")
        
        confidence_scores = state.get("confidence_scores", {})
        overall_confidence = confidence_scores.get("overall", 0.0)
        
        # Select best suggestion
        suggestions = state.get("naming_suggestions", [])
        if suggestions:
            suggested_name = suggestions[0]  # Take highest ranked
            alternatives = suggestions[1:3]  # Take next 2 as alternatives
        else:
            suggested_name = state["original_filename"]
            alternatives = []
        
        # Create reasoning
        content_analysis = state.get("content_analysis", {})
        reasoning = f"Based on {content_analysis.get('content_type', 'file')} analysis, " \
                   f"suggested name reflects {content_analysis.get('document_purpose', 'file purpose')}"
        
        return {
            "suggested_name": suggested_name,
            "final_confidence": overall_confidence,
            "final_category": state.get("category_analysis", "document"),
            "alternatives": alternatives,
            "reasoning": reasoning,
            "processing_stage": ProcessingStage.DECISION_ROUTING.value
        }
    
    async def auto_executor_node(self, state: FileProcessingState) -> Dict[str, Any]:
        """Auto-execute high confidence suggestions"""
        logger.info(f"✅ Auto-executing for: {state['original_filename']}")
        
        return {
            "user_decision": "auto_approved",
            "operation_metadata": {
                **state.get("operation_metadata", {}),
                "auto_executed": True,
                "execution_time": datetime.now().isoformat()
            }
        }
    
    async def human_approval_node(self, state: FileProcessingState) -> Dict[str, Any]:
        """Handle human-in-the-loop approval"""
        logger.info(f"👤 Human approval required for: {state['original_filename']}")
        
        # In real implementation, this would wait for user input
        # For now, we'll simulate approval based on confidence
        confidence = state.get("final_confidence", 0.0)
        
        if confidence > 0.7:
            decision = "approved"
        else:
            decision = "needs_review"
        
        return {
            "user_decision": decision,
            "processing_stage": ProcessingStage.HUMAN_APPROVAL.value
        }
    
    async def error_handler_node(self, state: FileProcessingState) -> Dict[str, Any]:
        """Handle errors and provide fallbacks"""
        logger.warning(f"⚠️ Error handling for: {state['original_filename']}")
        
        # Provide basic fallback
        timestamp = int(time.time())
        fallback_name = f"processed-{timestamp}{state['file_extension']}"
        
        return {
            "suggested_name": fallback_name,
            "final_confidence": 0.3,
            "final_category": "unknown",
            "reasoning": "Fallback naming due to processing error",
            "alternatives": [],
            "processing_stage": ProcessingStage.FAILED.value
        }
    
    async def finalize_result_node(self, state: FileProcessingState) -> Dict[str, Any]:
        """Finalize the workflow results"""
        logger.info(f"🏁 Finalizing results for: {state['original_filename']}")
        
        return {
            "processing_stage": ProcessingStage.COMPLETED.value,
            "operation_metadata": {
                **state.get("operation_metadata", {}),
                "completed_at": datetime.now().isoformat()
            }
        }
    
    # ========================================================================
    # ROUTING FUNCTIONS
    # ========================================================================
    
    def route_by_confidence(self, state: FileProcessingState) -> str:
        """Route based on confidence scores"""
        confidence = state.get("final_confidence", 0.0)
        
        if state.get("error_message"):
            return "error"
        elif confidence > 0.85:
            return "auto_execute"
        else:
            return "human_approval"
    
    # ========================================================================
    # PARALLEL AGENT IMPLEMENTATIONS
    # ========================================================================
    
    async def _naming_agent(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Specialized agent for generating file names"""
        prompt = f"""You are a file naming expert. Generate 3-5 descriptive filenames:

Original: {input_data['original_filename']}
Analysis: {json.dumps(input_data['content_analysis'], indent=2)}
Content: {input_data['content_preview'][:200]}

Requirements:
- Keep extension: {input_data['file_extension']}
- Use hyphens, not spaces
- Max 80 characters
- Be descriptive and clear

Return JSON: {{"suggestions": ["name1.ext", "name2.ext", "name3.ext"]}}"""

        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        
        try:
            return json.loads(response.content)
        except:
            return {"suggestions": [input_data['original_filename']]}
    
    async def _categorization_agent(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Specialized agent for file categorization"""
        prompt = f"""Categorize this file into one of: document, image, code, data, media, other

File: {input_data['original_filename']}
Analysis: {json.dumps(input_data['content_analysis'], indent=2)}

Return JSON: {{"category": "document", "subcategory": "invoice"}}"""

        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        
        try:
            return json.loads(response.content)
        except:
            return {"category": "document", "subcategory": "general"}
    
    async def _confidence_agent(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Specialized agent for confidence scoring"""
        content_analysis = input_data.get('content_analysis', {})
        
        # Calculate confidence based on available information
        base_confidence = 0.5
        
        if content_analysis.get('content_summary'):
            base_confidence += 0.2
        if content_analysis.get('key_topics'):
            base_confidence += 0.2
        if input_data.get('content_preview'):
            base_confidence += 0.1
            
        overall_confidence = min(base_confidence, 1.0)
        
        return {
            "scores": {
                "overall": overall_confidence,
                "content_analysis": base_confidence,
                "naming": overall_confidence * 0.9
            }
        }

# ============================================================================
# WORKFLOW INSTANCE & API ENDPOINTS
# ============================================================================

# Initialize workflow
try:
    workflow_instance = SilentSortWorkflow()
    logger.info("✅ LangGraph workflow initialized successfully")
except Exception as e:
    logger.error(f"❌ Failed to initialize LangGraph workflow: {e}")
    workflow_instance = None

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        openai_configured=bool(os.getenv("OPENAI_API_KEY")),
        langgraph_enabled=workflow_instance is not None,
        service_type="langgraph-multi-agent"
    )

@app.post("/analyze-file", response_model=FileAnalysisResponse)
async def analyze_file(request: FileAnalysisRequest):
    """Analyze file using LangGraph multi-agent workflow"""
    
    if not workflow_instance:
        raise HTTPException(status_code=500, detail="LangGraph workflow not available")
    
    start_time = time.time()
    workflow_id = f"workflow_{int(time.time())}_{hash(request.file_path) % 10000}"
    
    try:
        # Initialize state
        initial_state: FileProcessingState = {
            "file_path": request.file_path,
            "original_filename": request.original_name,
            "file_extension": request.file_extension,
            "file_size": request.file_size,
            "content_preview": request.content_preview or "",
            "content_analysis": None,
            "naming_suggestions": None,
            "category_analysis": None,
            "confidence_scores": None,
            "suggested_name": None,
            "final_confidence": None,
            "final_category": None,
            "reasoning": None,
            "alternatives": None,
            "processing_stage": ProcessingStage.INITIALIZED.value,
            "user_decision": None,
            "error_message": None,
            "retry_count": 0,
            "folder_context": None,
            "user_patterns": None,
            "operation_metadata": {}
        }
        
        # Run workflow
        config = {"configurable": {"thread_id": workflow_id}}
        final_state = await workflow_instance.workflow.ainvoke(initial_state, config=config)
        
        # Calculate processing time
        processing_time = int((time.time() - start_time) * 1000)
        
        # Return results
        return FileAnalysisResponse(
            suggested_name=final_state.get("suggested_name", request.original_name),
            confidence=final_state.get("final_confidence", 0.0),
            category=final_state.get("final_category", "unknown"),
            reasoning=final_state.get("reasoning", "LangGraph multi-agent analysis"),
            alternatives=final_state.get("alternatives", []),
            content_summary=final_state.get("content_analysis", {}).get("content_summary"),
            processing_time_ms=processing_time,
            workflow_id=workflow_id
        )
        
    except Exception as e:
        logger.error(f"❌ Workflow execution failed: {e}")
        raise HTTPException(status_code=500, detail=f"Workflow failed: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "SilentSort LangGraph AI Service",
        "status": "running",
        "type": "langgraph-multi-agent",
        "version": "2.0.0",
        "features": [
            "Multi-agent workflow",
            "Parallel processing",
            "Content analysis",
            "Confidence scoring",
            "Error recovery"
        ],
        "endpoints": {
            "health": "/health",
            "analyze": "/analyze-file",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    # Development server
    uvicorn.run(
        "langgraph-main:app",
        host="127.0.0.1",
        port=8001,  # Different port for testing
        reload=True,
        log_level="info"
    ) 