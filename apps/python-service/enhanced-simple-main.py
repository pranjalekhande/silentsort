#!/usr/bin/env python3
"""
SilentSort Enhanced AI Service
Advanced content analysis with technical entity extraction and domain-specific categorization
"""

import os
import json
import time
import re
from datetime import datetime
from typing import Optional, List, Dict, Any

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
    title="SilentSort Enhanced AI Service",
    description="Advanced AI-powered file analysis with technical entity extraction",
    version="2.1.0"
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

class ExtractedEntities(BaseModel):
    budget: Optional[str] = None
    team_size: Optional[str] = None
    deadline: Optional[str] = None
    technology: List[str] = []
    product: Optional[str] = None
    company: Optional[str] = None
    invoice_number: Optional[str] = None
    amount: Optional[str] = None
    currency: Optional[str] = None
    po_number: Optional[str] = None

class FileAnalysisResponse(BaseModel):
    suggested_name: str = Field(..., description="AI-suggested filename")
    confidence: float = Field(..., description="Confidence score 0-1")
    category: str = Field(..., description="Domain-specific category")
    subcategory: str = Field(..., description="Specific subcategory")
    reasoning: str = Field(..., description="AI reasoning for the name")
    alternatives: List[str] = Field(default=[], description="Alternative names")
    content_summary: Optional[str] = Field(None, description="Content summary")
    technical_tags: List[str] = Field(default=[], description="Technical, actionable tags")
    extracted_entities: ExtractedEntities = Field(default_factory=ExtractedEntities, description="Extracted business entities")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    openai_configured: bool
    service_type: str
    features: List[str]

# Initialize OpenAI client
openai_client = None
if os.getenv("OPENAI_API_KEY"):
    openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class EntityExtractor:
    """Extract technical entities from file content"""
    
    @staticmethod
    def extract_financial_data(content: str) -> Dict[str, Any]:
        """Extract budget, amounts, currency, invoice numbers"""
        entities = {}
        
        # Budget extraction
        budget_patterns = [
            r'budget[:\s-]*\$?([0-9,]+(?:\.[0-9]{2})?)',
            r'total[:\s-]*\$?([0-9,]+(?:\.[0-9]{2})?)',
            r'\$([0-9,]+(?:\.[0-9]{2})?)',
        ]
        
        for pattern in budget_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                amount = match.group(1).replace(',', '')
                entities['budget'] = f"${amount}"
                entities['amount'] = f"${amount}"
                entities['currency'] = "USD"
                break
        
        # Invoice number extraction
        invoice_patterns = [
            r'invoice[:\s#-]*([A-Z0-9-]+)',
            r'inv[:\s#-]*([A-Z0-9-]+)',
        ]
        
        for pattern in invoice_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                entities['invoice_number'] = match.group(1)
                break
                
        # PO number extraction
        po_patterns = [
            r'(?:purchase order|po)[:\s#-]*([A-Z0-9-]+)',
        ]
        
        for pattern in po_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                entities['po_number'] = match.group(1)
                break
        
        return entities
    
    @staticmethod
    def extract_team_data(content: str) -> Dict[str, Any]:
        """Extract team size, deadlines, project data"""
        entities = {}
        
        # Team size extraction
        team_patterns = [
            r'team[:\s-]*([0-9]+)\s*(?:developers?|people|members?)',
            r'([0-9]+)\s*(?:developers?|people|members?)',
        ]
        
        for pattern in team_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                size = match.group(1)
                entities['team_size'] = f"{size} developers"
                break
        
        # Deadline extraction
        deadline_patterns = [
            r'(?:due|deadline)[:\s-]*([A-Za-z]+ [0-9]{4})',
            r'(?:due|deadline)[:\s-]*([0-9]{1,2}/[0-9]{1,2}/[0-9]{4})',
            r'march 2024',
            r'([A-Za-z]+ [0-9]{4})',
        ]
        
        for pattern in deadline_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                entities['deadline'] = match.group(1)
                break
        
        return entities
    
    @staticmethod
    def extract_technology_data(content: str) -> Dict[str, Any]:
        """Extract technology stack, products, companies"""
        entities = {}
        
        # Technology extraction
        tech_keywords = [
            'ai', 'artificial intelligence', 'machine learning', 'ml',
            'react', 'nodejs', 'python', 'typescript', 'electron',
            'langgraph', 'openai', 'fastapi', 'sqlite', 'supabase'
        ]
        
        found_tech = []
        content_lower = content.lower()
        for tech in tech_keywords:
            if tech in content_lower:
                found_tech.append(tech.upper() if len(tech) <= 3 else tech.title())
        
        if found_tech:
            entities['technology'] = found_tech
        
        # Company extraction
        company_patterns = [
            r'apple inc\.?',
            r'microsoft',
            r'google',
            r'amazon',
        ]
        
        for pattern in company_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                entities['company'] = match.group(0).title()
                break
        
        # Product extraction
        product_patterns = [
            r'macbook pro',
            r'file management system',
            r'ai.powered.+system',
            r'silentsort',
        ]
        
        for pattern in product_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                entities['product'] = match.group(0).title()
                break
        
        return entities

def generate_technical_tags(content: str, entities: Dict[str, Any]) -> List[str]:
    """Generate technical, actionable tags from content and entities"""
    tags = []
    
    # Budget-based tags
    if entities.get('budget'):
        amount = entities['budget'].replace('$', '').replace(',', '')
        if float(amount) > 10000:
            tags.append(f"budget-{int(float(amount)/1000)}k")
        else:
            tags.append(f"budget-{amount}")
    
    # Team-based tags
    if entities.get('team_size'):
        size = re.search(r'(\d+)', entities['team_size'])
        if size:
            tags.append(f"team-{size.group(1)}-developers")
    
    # Deadline-based tags
    if entities.get('deadline'):
        deadline = entities['deadline'].lower()
        if 'march 2024' in deadline:
            tags.append("deadline-march-2024")
        elif '2024' in deadline:
            tags.append("deadline-2024")
    
    # Technology tags
    if entities.get('technology'):
        for tech in entities['technology']:
            tags.append(f"tech-{tech.lower().replace(' ', '-')}")
    
    # Document type tags
    content_lower = content.lower()
    if 'proposal' in content_lower:
        tags.append("document-type-proposal")
    if 'invoice' in content_lower:
        tags.append("document-type-invoice")
    if 'contract' in content_lower:
        tags.append("document-type-contract")
    if 'budget' in content_lower:
        tags.append("contains-financial-data")
    
    # Company tags
    if entities.get('company'):
        company = entities['company'].lower().replace(' ', '-')
        tags.append(f"vendor-{company}")
    
    # Currency tags
    if entities.get('currency'):
        tags.append(f"currency-{entities['currency'].lower()}")
    
    # Invoice-specific tags
    if entities.get('invoice_number'):
        tags.append("has-invoice-number")
        tags.append("requires-accounting-review")
    
    # PO tags
    if entities.get('po_number'):
        tags.append("has-purchase-order")
        tags.append("vendor-transaction")
    
    return tags

def determine_category_and_subcategory(content: str, entities: Dict[str, Any]) -> tuple[str, str]:
    """Determine domain-specific category and subcategory"""
    content_lower = content.lower()
    
    # Invoice detection
    if entities.get('invoice_number') or 'invoice' in content_lower:
        if entities.get('company'):
            return "invoice", "vendor-invoice"
        return "invoice", "general-invoice"
    
    # Project proposal detection
    if 'proposal' in content_lower and entities.get('budget'):
        if entities.get('technology') and any('ai' in tech.lower() for tech in entities['technology']):
            return "project-proposal", "ai-development"
        return "project-proposal", "software-development"
    
    # Contract detection
    if 'contract' in content_lower or 'agreement' in content_lower:
        return "contract", "vendor-agreement"
    
    # Financial report detection
    if 'report' in content_lower and entities.get('budget'):
        return "financial-report", "budget-analysis"
    
    # Meeting notes detection
    if 'meeting' in content_lower or 'notes' in content_lower:
        return "meeting-notes", "project-planning"
    
    # Technical documentation
    if entities.get('technology') and ('spec' in content_lower or 'documentation' in content_lower):
        return "technical-document", "software-specification"
    
    # Default to document
    return "document", "general"

async def analyze_file_with_enhanced_ai(request: FileAnalysisRequest) -> FileAnalysisResponse:
    """Analyze file using enhanced AI with entity extraction"""
    
    if not openai_client:
        raise HTTPException(status_code=500, detail="OpenAI not configured")
    
    content = request.content_preview or ""
    
    # Extract entities using our custom extractors
    financial_entities = EntityExtractor.extract_financial_data(content)
    team_entities = EntityExtractor.extract_team_data(content)
    tech_entities = EntityExtractor.extract_technology_data(content)
    
    # Combine all entities
    all_entities = {**financial_entities, **team_entities, **tech_entities}
    
    # Generate technical tags
    technical_tags = generate_technical_tags(content, all_entities)
    
    # Determine category and subcategory
    category, subcategory = determine_category_and_subcategory(content, all_entities)
    
    # Build enhanced analysis prompt
    prompt = f"""You are an expert file organizer with advanced entity extraction capabilities. Analyze this file and suggest a better, descriptive filename.

File Information:
- Current name: {request.original_name}
- Extension: {request.file_extension}
- Size: {request.file_size} bytes
- Content preview: {content[:800]}

Extracted Entities:
{json.dumps(all_entities, indent=2)}

Detected Category: {category}
Detected Subcategory: {subcategory}
Technical Tags: {technical_tags}

Requirements:
1. Suggest a clear, descriptive filename that incorporates key entities
2. Use only alphanumeric characters, hyphens, and underscores
3. Keep filename under 100 characters
4. Include relevant extracted data (budget, company, date) in filename
5. Provide confidence score (0.0-1.0) based on entity richness
6. Suggest 2-3 alternative names
7. Explain your reasoning

Respond in this exact JSON format:
{{
  "suggestedName": "descriptive-filename-with-entities{request.file_extension}",
  "confidence": 0.92,
  "reasoning": "Enhanced reasoning including extracted entities",
  "alternatives": ["alt-name-1{request.file_extension}", "alt-name-2{request.file_extension}"],
  "contentSummary": "Brief summary highlighting key extracted data"
}}

Only respond with valid JSON, no additional text."""

    try:
        # Call OpenAI with enhanced prompt
        response = openai_client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=int(os.getenv("OPENAI_MAX_TOKENS", "500")),
            temperature=float(os.getenv("OPENAI_TEMPERATURE", "0.3")),
        )
        
        content_response = response.choices[0].message.content
        if not content_response:
            raise Exception("No response from OpenAI")
        
        # Parse JSON response
        result = json.loads(content_response.strip())
        
        # Create extracted entities object
        extracted_entities = ExtractedEntities(**all_entities)
        
        return FileAnalysisResponse(
            suggested_name=result.get("suggestedName", request.original_name),
            confidence=float(result.get("confidence", 0.0)),
            category=category,
            subcategory=subcategory,
            reasoning=result.get("reasoning", "Enhanced AI analysis completed"),
            alternatives=result.get("alternatives", []),
            content_summary=result.get("contentSummary"),
            technical_tags=technical_tags,
            extracted_entities=extracted_entities,
            processing_time_ms=0  # Will be set by endpoint
        )
        
    except json.JSONDecodeError as e:
        # Fallback if JSON parsing fails
        return FileAnalysisResponse(
            suggested_name=f"enhanced-processed-{int(time.time())}{request.file_extension}",
            confidence=0.7,
            category=category,
            subcategory=subcategory,
            reasoning="Enhanced AI analysis with entity extraction (JSON parsing fallback)",
            alternatives=[],
            technical_tags=technical_tags,
            extracted_entities=ExtractedEntities(**all_entities),
            processing_time_ms=0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhanced AI analysis failed: {str(e)}")

# API Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        openai_configured=bool(os.getenv("OPENAI_API_KEY")),
        service_type="enhanced-ai-with-entity-extraction",
        features=[
            "Entity extraction",
            "Technical tagging", 
            "Domain-specific categorization",
            "Financial data extraction",
            "Team and project analysis",
            "Technology stack detection",
            "Advanced naming algorithms"
        ]
    )

@app.post("/analyze-file", response_model=FileAnalysisResponse)
async def analyze_file(request: FileAnalysisRequest):
    """Analyze a file using enhanced AI with entity extraction"""
    
    start_time = time.time()
    
    try:
        result = await analyze_file_with_enhanced_ai(request)
        
        # Calculate processing time
        processing_time = int((time.time() - start_time) * 1000)
        result.processing_time_ms = processing_time
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhanced analysis failed: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "SilentSort Enhanced AI Service",
        "status": "running",
        "type": "enhanced-ai-with-entity-extraction",
        "version": "2.1.0",
        "features": [
            "Advanced entity extraction",
            "Technical tag generation",
            "Domain-specific categorization",
            "Financial data analysis",
            "Project and team detection",
            "Technology stack identification",
            "Business context analysis"
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
        "enhanced-simple-main:app",
        host="127.0.0.1",
        port=8002,  # Different port for testing
        reload=True,
        log_level="info"
    ) 