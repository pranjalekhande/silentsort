#!/usr/bin/env python3
"""
SilentSort Enhanced AI Service v2.1
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
    description="Advanced AI with technical entity extraction",
    version="2.1.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class ExtractedEntities(BaseModel):
    budget: Optional[str] = None
    team_size: Optional[str] = None
    deadline: Optional[str] = None
    technology: List[str] = []
    company: Optional[str] = None
    invoice_number: Optional[str] = None
    amount: Optional[str] = None

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
    subcategory: str
    reasoning: str
    alternatives: List[str] = []
    content_summary: Optional[str] = None
    technical_tags: List[str] = []
    extracted_entities: ExtractedEntities
    processing_time_ms: int

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    openai_configured: bool
    service_type: str

# Initialize OpenAI
openai_client = None
if os.getenv("OPENAI_API_KEY"):
    openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def extract_entities(content: str) -> Dict[str, Any]:
    """Extract technical entities from content dynamically"""
    entities = {}
    content_lower = content.lower()
    
    # Budget extraction - multiple patterns
    budget_patterns = [
        r'budget[:\s-]*\$?([0-9,]+)',
        r'project budget[:\s-]*\$?([0-9,]+)',
        r'total[:\s-]*\$?([0-9,]+)',
        r'\$([0-9,]+)',
    ]
    for pattern in budget_patterns:
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            amount = match.group(1).replace(',', '')
            if amount.isdigit() and int(amount) >= 1000:  # Only meaningful amounts
                entities['budget'] = f"${amount}"
                entities['amount'] = f"${amount}"
                break
    
    # Team size extraction
    team_patterns = [
        r'team[:\s-]*([0-9]+)\s*developers?',
        r'([0-9]+)\s*developers?',
        r'team size[:\s-]*([0-9]+)',
    ]
    for pattern in team_patterns:
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            size = int(match.group(1))
            if 1 <= size <= 100:  # Reasonable team size
                entities['team_size'] = f"{size} developers"
                break
    
    # Dynamic deadline extraction
    deadline_patterns = [
        r'deadline[:\s-]*([A-Za-z]+ \d{4})',
        r'due[:\s-]*([A-Za-z]+ \d{4})',
        r'completion[:\s-]*([A-Za-z]+ \d{4})',
    ]
    for pattern in deadline_patterns:
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            entities['deadline'] = match.group(1)
            break
    
    # Dynamic technology extraction
    tech_keywords = ['ai', 'artificial intelligence', 'machine learning', 'ml', 'react', 'python', 
                     'javascript', 'typescript', 'node', 'angular', 'vue', 'docker', 'kubernetes',
                     'aws', 'azure', 'gcp', 'blockchain', 'data science', 'analytics']
    found_tech = []
    for tech in tech_keywords:
        if tech in content_lower:
            tech_name = tech.upper() if len(tech) <= 3 else tech.title()
            if tech_name not in found_tech:
                found_tech.append(tech_name)
    
    if found_tech:
        entities['technology'] = found_tech[:4]  # Limit to most relevant
    
    # Dynamic company extraction (from content, not hard-coded)
    # Look for company patterns
    company_patterns = [
        r'client[:\s-]*([A-Z][a-zA-Z\s]+(?:Inc|Corp|Corporation|Ltd|LLC)?)',
        r'company[:\s-]*([A-Z][a-zA-Z\s]+(?:Inc|Corp|Corporation|Ltd|LLC)?)',
        r'vendor[:\s-]*([A-Z][a-zA-Z\s]+(?:Inc|Corp|Corporation|Ltd|LLC)?)',
    ]
    for pattern in company_patterns:
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            company_name = match.group(1).strip()
            if len(company_name) <= 20:  # Reasonable company name length
                entities['company'] = company_name
                break
    
    # Invoice number extraction
    invoice_patterns = [
        r'invoice[:\s#-]*([A-Z0-9-]+)',
        r'inv[:\s#-]*([A-Z0-9-]+)',
        r'#([A-Z0-9-]{3,})',
    ]
    for pattern in invoice_patterns:
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            inv_num = match.group(1)
            if len(inv_num) >= 3:
                entities['invoice_number'] = inv_num
                break
    
    return entities

def generate_technical_tags(content: str, entities: Dict[str, Any]) -> List[str]:
    """Generate technical, actionable tags"""
    tags = []
    
    # Budget-based tags
    if entities.get('budget'):
        amount = entities['budget'].replace('$', '').replace(',', '')
        if amount.isdigit() and int(amount) >= 1000:
            tags.append(f"budget-{int(amount)//1000}k")
    
    # Team tags
    if entities.get('team_size'):
        size = re.search(r'(\d+)', entities['team_size'])
        if size:
            tags.append(f"team-{size.group(1)}-developers")
    
    # Deadline tags
    if entities.get('deadline'):
        if 'march 2024' in entities['deadline'].lower():
            tags.append("deadline-march-2024")
    
    # Technology tags
    for tech in entities.get('technology', []):
        tags.append(f"tech-{tech.lower()}")
    
    # Document type tags
    content_lower = content.lower()
    if 'proposal' in content_lower:
        tags.append("document-type-proposal")
    if 'invoice' in content_lower:
        tags.append("document-type-invoice")
    if 'budget' in content_lower:
        tags.append("contains-financial-data")
    
    # Company tags
    if entities.get('company'):
        tags.append(f"vendor-{entities['company'].lower()}")
    
    return tags

def determine_category(content: str, entities: Dict[str, Any]) -> tuple[str, str]:
    """Determine domain-specific category and subcategory with content-first analysis"""
    content_lower = content.lower()
    
    # RESUME DETECTION (HIGHEST PRIORITY - should override misleading filenames)
    resume_indicators = [
        'professional summary', 'work experience', 'education', 'technical skills',
        'employment history', 'career objective', 'achievements', 'certifications',
        'software engineer', 'years of experience', 'bachelor', 'master', 'degree',
        'programming languages', 'frameworks', 'databases', 'contact information'
    ]
    resume_score = sum(1 for indicator in resume_indicators if indicator in content_lower)
    
    # Strong resume detection (3+ indicators = definitely a resume)
    if resume_score >= 3:
        if any('software' in tech.lower() or 'engineer' in content_lower for tech in entities.get('technology', [])):
            return "resume", "software-engineer"
        return "resume", "professional"
    
    # Medium resume detection (2 indicators = likely resume, especially if filename is misleading)
    if resume_score >= 2:
        return "resume", "professional"
    
    # Project proposal detection (high priority)
    if 'project proposal' in content_lower or 'proposal:' in content_lower:
        if any('ai' in tech.lower() for tech in entities.get('technology', [])):
            return "project-proposal", "ai-development"
        return "project-proposal", "software-development"
    
    # REAL Invoice detection (check for actual invoice content, not just filename)
    invoice_content_indicators = [
        'bill to', 'amount due', 'payment terms', 'invoice date', 'due date',
        'subtotal', 'tax amount', 'total amount', 'payment method', 'vendor',
        'line items', 'quantity', 'unit price', 'description'
    ]
    invoice_score = sum(1 for indicator in invoice_content_indicators if indicator in content_lower)
    
    # Only classify as invoice if content actually looks like an invoice (2+ indicators)
    if invoice_score >= 2:
        return "invoice", "vendor-invoice"
    
    # Meeting notes detection
    if 'meeting' in content_lower or 'standup' in content_lower or 'agenda' in content_lower:
        return "meeting-notes", "team-meeting"
    
    # Report detection
    if ('report' in content_lower and 'executive summary' in content_lower) or 'findings' in content_lower:
        if 'quarterly' in content_lower:
            return "report", "quarterly-report"
        return "report", "business-report"
    
    # Contract/Legal document detection
    if any(term in content_lower for term in ['contract', 'agreement', 'terms and conditions', 'legal']):
        return "contract", "legal-document"
    
    # Code documentation detection
    if any(term in content_lower for term in ['function', 'class', 'import', 'def ', 'const ', 'var ']):
        return "code", "documentation"
    
    # Default fallback (when content doesn't clearly indicate specific type)
    return "document", "general"

def generate_smart_filename(content: str, entities: Dict[str, Any], category: str, original_extension: str) -> str:
    """Generate semantic filenames based on actual content analysis"""
    
    parts = []
    content_lower = content.lower()
    
    # Start with document type based on content analysis (IGNORE MISLEADING FILENAMES)
    if category == "resume":
        parts.append("resume")
        
        # Extract person's name from content
        name_patterns = [
            r'\b([A-Z][a-z]+ [A-Z][a-z]+)\b',  # First Last
            r'\b([A-Z][A-Z]+ [A-Z][a-z]+)\b',  # FIRST Last  
            r'^([A-Z][a-z]+ [A-Z][a-z]+)',     # At start of content
        ]
        
        person_name = None
        for pattern in name_patterns:
            match = re.search(pattern, content)
            if match:
                name = match.group(1)
                # Avoid common false positives
                if not any(word in name.lower() for word in ['professional', 'technical', 'work', 'experience', 'software']):
                    person_name = name.lower().replace(' ', '-')
                    break
        
        if person_name:
            parts.append(person_name)
        
        # Add profession/role
        if 'software engineer' in content_lower:
            parts.append('software-engineer')
        elif 'data scientist' in content_lower:
            parts.append('data-scientist')
        elif 'developer' in content_lower:
            parts.append('developer')
        elif 'engineer' in content_lower:
            parts.append('engineer')
        
        # Add key technology
        if entities.get('technology'):
            main_tech = entities['technology'][0].lower().replace(' ', '-').replace('machine-learning', 'ml')
            parts.append(main_tech)
        
        # Add experience level if found
        experience_patterns = [
            r'(\d+)\+?\s*years?\s*of\s*experience',
            r'(\d+)\+?\s*years?\s*experience',
            r'(\d+)\+?\s*yrs?\s*experience'
        ]
        for pattern in experience_patterns:
            match = re.search(pattern, content_lower)
            if match:
                years = int(match.group(1))
                if 1 <= years <= 20:  # Reasonable range
                    parts.append(f"{years}yrs")
                break
    
    elif category == "project-proposal":
        parts.append("project-proposal")
        
        # Add main technology focus
        if entities.get('technology'):
            # Use most relevant tech (first 2)
            tech_terms = [t.lower().replace(' ', '-').replace('machine-learning', 'ml') 
                         for t in entities['technology'][:2]]
            parts.extend(tech_terms)
        
        # Add company name if found
        if entities.get('company'):
            company_clean = entities['company'].lower().replace(' ', '-').replace('corporation', 'corp')
            parts.append(company_clean)
        
        # Add budget context
        if entities.get('budget'):
            budget_clean = entities['budget'].replace('$', '').replace(',', '')
            if budget_clean.isdigit():
                budget_k = int(budget_clean) // 1000
                if budget_k > 0:
                    parts.append(f"{budget_k}k")
    
    elif category == "invoice":
        parts.append("invoice")
        
        # Add company if available
        if entities.get('company'):
            company_clean = entities['company'].lower().replace(' ', '-')
            parts.append(company_clean)
        
        # Detect product/service from content
        product_terms = []
        if 'macbook' in content_lower:
            product_terms.append('macbook')
        elif 'software' in content_lower and 'license' in content_lower:
            product_terms.append('software-license')
        elif 'consulting' in content_lower:
            product_terms.append('consulting')
        elif 'development' in content_lower:
            product_terms.append('development')
        
        if product_terms:
            parts.extend(product_terms)
        
        # Add invoice number if meaningful
        if entities.get('invoice_number') and len(entities['invoice_number']) <= 10:
            parts.append(entities['invoice_number'].lower())
    
    elif category == "meeting-notes":
        parts.append("meeting-notes")
        
        # Add meeting type from content
        if 'standup' in content_lower:
            parts.append('standup')
        elif 'planning' in content_lower:
            parts.append('planning')
        elif 'review' in content_lower:
            parts.append('review')
        elif 'kickoff' in content_lower:
            parts.append('kickoff')
        
        # Add technology context
        if entities.get('technology'):
            tech = entities['technology'][0].lower().replace(' ', '-')
            parts.append(tech)
    
    elif category == "report":
        # Add report type
        if 'quarterly' in content_lower:
            parts.append('quarterly-report')
        elif 'annual' in content_lower:
            parts.append('annual-report')
        elif 'status' in content_lower:
            parts.append('status-report')
        else:
            parts.append('report')
        
        # Add subject matter
        if entities.get('technology'):
            tech = entities['technology'][0].lower().replace(' ', '-')
            parts.append(tech)
    
    else:
        # Generic document - extract key terms from content
        parts.append("document")
        
        # Extract meaningful terms from content
        important_words = []
        
        # Look for key business terms
        business_terms = ['budget', 'proposal', 'agreement', 'contract', 'specification', 
                         'requirements', 'analysis', 'strategy', 'plan', 'guide']
        for term in business_terms:
            if term in content_lower:
                important_words.append(term)
                break
        
        # Add technology if present
        if entities.get('technology'):
            tech = entities['technology'][0].lower().replace(' ', '-')
            important_words.append(tech)
        
        parts.extend(important_words[:2])
    
    # If we still don't have enough meaningful parts, extract from content
    if len(parts) <= 2:
        # Extract key nouns and meaningful terms
        content_words = re.findall(r'\b[A-Z][a-zA-Z]{3,}\b', content)  # Capitalized words
        meaningful_words = [w.lower() for w in content_words[:3] 
                           if w.lower() not in ['this', 'that', 'with', 'from', 'they', 'have', 'will', 'the']]
        parts.extend(meaningful_words[:2])
    
    # Add time context for time-sensitive documents
    if any(word in content_lower for word in ['2024', '2025', 'q1', 'q2', 'q3', 'q4']):
        if '2024' in content_lower:
            parts.append('2024')
        elif '2025' in content_lower:
            parts.append('2025')
    
    # Clean up and join parts
    if not parts:
        # Last resort: use category + descriptive term
        parts = [category, "document"]
    
    # Remove empty parts and clean
    parts = [p for p in parts if p and len(p) > 1]
    filename = "-".join(parts)
    
    # Clean filename
    filename = re.sub(r'[^a-zA-Z0-9-]', '', filename)  # Remove special chars
    filename = re.sub(r'-+', '-', filename)  # Remove multiple dashes
    filename = filename.strip('-')  # Remove leading/trailing dashes
    
    # Ensure reasonable length
    if len(filename) > 60:
        filename = filename[:60].rstrip('-')
    
    # Ensure minimum length
    if len(filename) < 8:
        filename = f"{category}-document"
    
    return f"{filename}{original_extension}"

async def analyze_file_enhanced(request: FileAnalysisRequest) -> FileAnalysisResponse:
    """Enhanced file analysis with entity extraction"""
    
    if not openai_client:
        raise HTTPException(status_code=500, detail="OpenAI not configured")
    
    content = request.content_preview or ""
    
    # Extract entities
    entities = extract_entities(content)
    
    # Generate technical tags
    technical_tags = generate_technical_tags(content, entities)
    
    # Determine category
    category, subcategory = determine_category(content, entities)
    
    # Enhanced prompt with entity context and naming examples
    prompt = f"""You are a file naming expert. Create semantic, user-friendly filenames based on content analysis.

CONTENT ANALYSIS:
File: {request.original_name}
Category: {category}
Content preview: {content[:400]}
Extracted entities: {json.dumps(entities, indent=2)}

NAMING RULES:
- Use descriptive terms from actual content
- Include company names, technologies, amounts when relevant
- NO timestamps or generic numbers
- Max 80 characters, use hyphens
- Keep extension: {request.file_extension}

EXAMPLES:
- Project proposal → "project-proposal-ai-microsoft-95k-2024{request.file_extension}"
- Invoice → "invoice-apple-macbook-software-license{request.file_extension}"
- Meeting notes → "meeting-notes-standup-ai-team{request.file_extension}"

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{{
  "suggestedName": "semantic-filename{request.file_extension}",
  "confidence": 0.90,
  "reasoning": "Used specific content elements for naming",
  "alternatives": ["alt1{request.file_extension}", "alt2{request.file_extension}"],
  "contentSummary": "Brief content description"
}}"""

    try:
        print(f"🔍 DEBUG: Calling OpenAI for {request.original_name}")
        print(f"🔍 DEBUG: Category: {category}, Entities: {entities}")
        
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a file naming expert. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.3,
        )
        
        response_content = response.choices[0].message.content.strip()
        print(f"🔍 DEBUG: OpenAI raw response: {response_content[:200]}")
        
        # Clean response if it has markdown formatting
        if response_content.startswith('```json'):
            response_content = response_content.replace('```json', '').replace('```', '').strip()
        
        result = json.loads(response_content)
        print(f"✅ DEBUG: OpenAI succeeded with: {result.get('suggestedName')}")
        
        return FileAnalysisResponse(
            suggested_name=result.get("suggestedName", request.original_name),
            confidence=float(result.get("confidence", 0.85)),
            category=category,
            subcategory=subcategory,
            reasoning=result.get("reasoning", "AI-generated semantic naming"),
            alternatives=result.get("alternatives", []),
            content_summary=result.get("contentSummary"),
            technical_tags=technical_tags,
            extracted_entities=ExtractedEntities(**entities),
            processing_time_ms=0
        )
        
    except json.JSONDecodeError as e:
        print(f"❌ DEBUG: JSON parsing failed: {str(e)}")
        print(f"❌ DEBUG: Raw response was: {response.choices[0].message.content if 'response' in locals() else 'No response'}")
        # Smart fallback using extracted entities
        smart_filename = generate_smart_filename(content, entities, category, request.file_extension)
        print(f"🔄 DEBUG: Using smart fallback: {smart_filename}")
        
        return FileAnalysisResponse(
            suggested_name=smart_filename,
            confidence=0.85,  # Higher confidence for smart fallback
            category=category,
            subcategory=subcategory,
            reasoning=f"Smart semantic naming based on content analysis",
            alternatives=[],
            technical_tags=technical_tags,
            extracted_entities=ExtractedEntities(**entities),
            processing_time_ms=0
        )
        
    except Exception as e:
        print(f"❌ DEBUG: OpenAI call failed: {str(e)}")
        # Smart fallback using extracted entities
        smart_filename = generate_smart_filename(content, entities, category, request.file_extension)
        print(f"🔄 DEBUG: Using smart fallback: {smart_filename}")
        
        return FileAnalysisResponse(
            suggested_name=smart_filename,
            confidence=0.85,  # Higher confidence for smart fallback
            category=category,
            subcategory=subcategory,
            reasoning=f"Smart semantic naming: {', '.join(f'{k}={v}' for k, v in entities.items() if v)}",
            alternatives=[],
            technical_tags=technical_tags,
            extracted_entities=ExtractedEntities(**entities),
            processing_time_ms=0
        )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        openai_configured=bool(os.getenv("OPENAI_API_KEY")),
        service_type="enhanced-ai-entity-extraction"
    )

@app.post("/analyze-file", response_model=FileAnalysisResponse)
async def analyze_file(request: FileAnalysisRequest):
    start_time = time.time()
    
    try:
        result = await analyze_file_enhanced(request)
        result.processing_time_ms = int((time.time() - start_time) * 1000)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/")
async def root():
    return {
        "service": "SilentSort Enhanced AI Service",
        "version": "2.1.0",
        "type": "enhanced-entity-extraction",
        "features": [
            "Technical entity extraction",
            "Domain-specific categorization", 
            "Financial data detection",
            "Team and project analysis",
            "Technical tagging system",
            "Advanced naming algorithms"
        ]
    }

if __name__ == "__main__":
    uvicorn.run("enhanced-main:app", host="127.0.0.1", port=8002, reload=True)
