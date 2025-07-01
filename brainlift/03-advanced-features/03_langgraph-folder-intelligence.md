# LangGraph Folder Intelligence Implementation
## Context-Aware Project Analysis + Relationship Detection

This document details the **LangGraph workflow implementation** for advanced folder analysis and contextual intelligence.

---

## 🧠 **CORE CONCEPT: PROJECT UNDERSTANDING**

### **From Individual Files → Project Context**

**Current**: `invoice.pdf` → `abc_company_invoice_INV-2024-001.pdf`

**Target**: Folder analysis reveals this is a "Legal Case" project, so:
- `invoice.pdf` → `03-evidence/financial-records/abc-consulting-invoice-2024-001.pdf`
- Missing: `case-timeline.md`, `evidence-index.md`  
- Suggested: Create `01-case-overview/` folder structure

---

## 🏗️ **ENHANCED PYTHON SERVICE ARCHITECTURE**

### **1. Advanced Folder Analysis Workflow**

```python
# apps/python-service/workflows/folder_analysis.py

from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI
from typing import Dict, List, Any
import os
import json
from pathlib import Path

class FolderAnalysisState:
    """State for folder analysis workflow"""
    folder_path: str
    files_scanned: List[Dict[str, Any]]
    project_type: str
    confidence: float
    file_relationships: List[Dict[str, Any]]
    missing_components: List[str]
    suggested_structure: Dict[str, Any]
    context_insights: Dict[str, Any]

class FolderIntelligenceWorkflow:
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
        self.workflow = self.build_workflow()
    
    def build_workflow(self) -> StateGraph:
        """Build the folder analysis workflow"""
        workflow = StateGraph(FolderAnalysisState)
        
        # Add nodes
        workflow.add_node("scan_folder_tree", self.scan_folder_tree)
        workflow.add_node("detect_project_type", self.detect_project_type)
        workflow.add_node("analyze_file_relationships", self.analyze_file_relationships)
        workflow.add_node("identify_missing_components", self.identify_missing_components)
        workflow.add_node("suggest_folder_structure", self.suggest_folder_structure)
        workflow.add_node("generate_context_insights", self.generate_context_insights)
        
        # Define flow
        workflow.add_edge(START, "scan_folder_tree")
        workflow.add_edge("scan_folder_tree", "detect_project_type")
        workflow.add_edge("detect_project_type", "analyze_file_relationships")
        workflow.add_edge("analyze_file_relationships", "identify_missing_components")
        workflow.add_edge("identify_missing_components", "suggest_folder_structure")
        workflow.add_edge("suggest_folder_structure", "generate_context_insights")
        workflow.add_edge("generate_context_insights", END)
        
        return workflow.compile()

    async def scan_folder_tree(self, state: FolderAnalysisState) -> FolderAnalysisState:
        """Scan entire folder structure and file contents"""
        files_info = []
        
        for root, dirs, files in os.walk(state.folder_path):
            # Skip hidden directories
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            
            for file in files:
                if file.startswith('.'):
                    continue
                    
                file_path = os.path.join(root, file)
                file_info = await self.extract_file_info(file_path)
                files_info.append(file_info)
        
        state.files_scanned = files_info
        print(f"📁 Scanned {len(files_info)} files in folder tree")
        return state

    async def extract_file_info(self, file_path: str) -> Dict[str, Any]:
        """Extract comprehensive file information"""
        try:
            stat = os.stat(file_path)
            file_info = {
                "path": file_path,
                "name": os.path.basename(file_path),
                "extension": os.path.splitext(file_path)[1].lower(),
                "size": stat.st_size,
                "modified": stat.st_mtime,
                "relative_path": os.path.relpath(file_path, start=os.path.dirname(file_path))
            }
            
            # Extract content preview for text files
            if self.is_text_file(file_path):
                content_preview = await self.extract_content_preview(file_path)
                file_info["content_preview"] = content_preview
                file_info["content_hash"] = self.calculate_content_hash(content_preview)
            
            return file_info
            
        except Exception as e:
            print(f"Error extracting file info for {file_path}: {e}")
            return {"path": file_path, "error": str(e)}

    async def detect_project_type(self, state: FolderAnalysisState) -> FolderAnalysisState:
        """Detect the type of project/folder using AI analysis"""
        
        # Prepare file analysis for AI
        file_summary = self.prepare_file_summary(state.files_scanned)
        
        prompt = f"""
        Analyze this folder structure and determine the project type with confidence.
        
        Files found:
        {file_summary}
        
        Determine the most likely project type from these categories:
        - web-development (React, Vue, Angular, HTML/CSS/JS projects)
        - mobile-development (iOS, Android, React Native projects)  
        - legal-case (contracts, pleadings, evidence, correspondence)
        - design-project (Figma, Photoshop, mockups, brand assets)
        - research-paper (academic papers, data, references, analysis)
        - business-documents (invoices, proposals, contracts, reports)
        - software-project (code repositories, documentation, configs)
        - content-creation (videos, images, scripts, storyboards)
        - personal-documents (photos, personal files, misc documents)
        - data-analysis (datasets, notebooks, reports, visualizations)
        
        Respond with JSON:
        {{
            "project_type": "category",
            "confidence": 0.95,
            "reasoning": "explanation of detection",
            "key_indicators": ["file1.js", "package.json", "src/ folder"],
            "secondary_types": ["might also be X"]
        }}
        """
        
        response = await self.llm.ainvoke(prompt)
        result = json.loads(response.content)
        
        state.project_type = result["project_type"]
        state.confidence = result["confidence"]
        state.context_insights = {"detection_reasoning": result["reasoning"]}
        
        print(f"🎯 Detected project type: {state.project_type} ({state.confidence:.0%} confidence)")
        return state

    async def analyze_file_relationships(self, state: FolderAnalysisState) -> FolderAnalysisState:
        """Find relationships between files"""
        
        relationships = []
        files = state.files_scanned
        
        # Content-based relationships
        relationships.extend(await self.find_content_references(files))
        
        # Name pattern relationships  
        relationships.extend(await self.find_naming_patterns(files))
        
        # Date/time relationships
        relationships.extend(await self.find_temporal_relationships(files))
        
        # Project-specific relationships
        relationships.extend(await self.find_project_specific_relationships(files, state.project_type))
        
        state.file_relationships = relationships
        print(f"🔗 Found {len(relationships)} file relationships")
        return state

    async def find_content_references(self, files: List[Dict]) -> List[Dict]:
        """Find files that reference each other in content"""
        relationships = []
        
        text_files = [f for f in files if f.get("content_preview")]
        
        for file1 in text_files:
            for file2 in files:
                if file1["path"] == file2["path"]:
                    continue
                    
                # Check if file1 content mentions file2 name
                if file2["name"].lower() in file1.get("content_preview", "").lower():
                    relationships.append({
                        "type": "content_reference",
                        "source": file1["path"],
                        "target": file2["path"],
                        "confidence": 0.8,
                        "description": f"{file1['name']} references {file2['name']}"
                    })
        
        return relationships

    async def find_project_specific_relationships(self, files: List[Dict], project_type: str) -> List[Dict]:
        """Find relationships specific to project type"""
        relationships = []
        
        if project_type == "web-development":
            relationships.extend(await self.find_web_dev_relationships(files))
        elif project_type == "legal-case":
            relationships.extend(await self.find_legal_relationships(files))
        elif project_type == "design-project":
            relationships.extend(await self.find_design_relationships(files))
        
        return relationships

    async def find_web_dev_relationships(self, files: List[Dict]) -> List[Dict]:
        """Find web development specific relationships"""
        relationships = []
        
        # Find package.json and related files
        package_json = next((f for f in files if f["name"] == "package.json"), None)
        if package_json:
            # All JS/TS files are related to package.json
            for file in files:
                if file["extension"] in [".js", ".ts", ".jsx", ".tsx"]:
                    relationships.append({
                        "type": "dependency_relationship",
                        "source": package_json["path"],
                        "target": file["path"],
                        "confidence": 0.9,
                        "description": "Part of Node.js project"
                    })
        
        # Find HTML → CSS/JS relationships
        html_files = [f for f in files if f["extension"] == ".html"]
        for html_file in html_files:
            if html_file.get("content_preview"):
                content = html_file["content_preview"]
                for file in files:
                    if (file["extension"] in [".css", ".js"] and 
                        file["name"] in content):
                        relationships.append({
                            "type": "web_asset_reference",
                            "source": html_file["path"],
                            "target": file["path"],
                            "confidence": 0.95,
                            "description": f"HTML references {file['extension']} asset"
                        })
        
        return relationships

    async def identify_missing_components(self, state: FolderAnalysisState) -> FolderAnalysisState:
        """Identify missing files/folders based on project type"""
        
        missing = []
        existing_files = [f["name"] for f in state.files_scanned]
        existing_dirs = set()
        
        # Extract directory names
        for file_info in state.files_scanned:
            path_parts = Path(file_info["path"]).parts
            for i in range(1, len(path_parts)):
                existing_dirs.add("/".join(path_parts[:i+1]))
        
        # Check project-specific missing components
        if state.project_type == "web-development":
            missing.extend(self.check_missing_web_dev_components(existing_files, existing_dirs))
        elif state.project_type == "legal-case":
            missing.extend(self.check_missing_legal_components(existing_files, existing_dirs))
        elif state.project_type == "design-project":
            missing.extend(self.check_missing_design_components(existing_files, existing_dirs))
        
        state.missing_components = missing
        print(f"🔍 Identified {len(missing)} missing components")
        return state

    def check_missing_web_dev_components(self, files: List[str], dirs: set) -> List[str]:
        """Check for missing web development components"""
        missing = []
        
        essential_files = ["README.md", "package.json", ".gitignore"]
        essential_dirs = ["src/", "docs/", "tests/"]
        
        for file in essential_files:
            if file not in files:
                missing.append(f"📄 {file} - Essential project file")
        
        for dir_name in essential_dirs:
            if not any(d.endswith(dir_name.rstrip('/')) for d in dirs):
                missing.append(f"📁 {dir_name} - Recommended directory")
        
        # Check for specific patterns
        if "package.json" in files and "node_modules/" not in str(dirs):
            missing.append("📦 node_modules/ - Run 'npm install'")
        
        return missing

    async def suggest_folder_structure(self, state: FolderAnalysisState) -> FolderAnalysisState:
        """Suggest optimal folder organization"""
        
        structure_templates = {
            "web-development": {
                "src/": ["components/", "pages/", "styles/", "utils/"],
                "public/": ["images/", "icons/"],
                "docs/": ["README.md", "API.md"],
                "tests/": ["unit/", "integration/"],
                "config/": ["webpack.config.js", "tsconfig.json"]
            },
            "legal-case": {
                "00-case-overview/": ["case-summary.md", "timeline.md", "key-dates.md"],
                "01-pleadings/": ["complaint.pdf", "answer.pdf", "motions/"],
                "02-discovery/": ["requests/", "responses/", "depositions/"],
                "03-evidence/": ["exhibits/", "witness-statements/", "expert-reports/"],
                "04-correspondence/": ["opposing-counsel/", "client/", "court/"],
                "05-research/": ["case-law/", "statutes/", "secondary-sources/"]
            },
            "design-project": {
                "01-research/": ["inspiration/", "competitors/", "user-research/"],
                "02-wireframes/": ["low-fi/", "high-fi/", "user-flows/"],
                "03-designs/": ["desktop/", "mobile/", "components/"],
                "04-assets/": ["images/", "icons/", "fonts/", "colors/"],
                "05-prototypes/": ["interactive/", "static/"],
                "06-final/": ["deliverables/", "style-guide/"]
            }
        }
        
        template = structure_templates.get(state.project_type, {})
        
        # Customize based on existing files
        customized_structure = await self.customize_structure_for_files(
            template, state.files_scanned, state.file_relationships
        )
        
        state.suggested_structure = customized_structure
        print(f"📋 Generated folder structure with {len(customized_structure)} top-level folders")
        return state

    async def generate_context_insights(self, state: FolderAnalysisState) -> FolderAnalysisState:
        """Generate final insights and recommendations"""
        
        insights = {
            "project_summary": f"Detected {state.project_type} project with {len(state.files_scanned)} files",
            "organization_score": self.calculate_organization_score(state),
            "priority_actions": self.suggest_priority_actions(state),
            "naming_consistency": self.analyze_naming_consistency(state.files_scanned),
            "structure_recommendations": self.generate_structure_recommendations(state)
        }
        
        state.context_insights.update(insights)
        return state

    async def analyze_folder(self, folder_path: str) -> Dict[str, Any]:
        """Main entry point for folder analysis"""
        
        initial_state = FolderAnalysisState(
            folder_path=folder_path,
            files_scanned=[],
            project_type="",
            confidence=0.0,
            file_relationships=[],
            missing_components=[],
            suggested_structure={},
            context_insights={}
        )
        
        # Run the workflow
        final_state = await self.workflow.ainvoke(initial_state)
        
        return {
            "project_type": final_state.project_type,
            "confidence": final_state.confidence,
            "files_analyzed": len(final_state.files_scanned),
            "relationships_found": len(final_state.file_relationships),
            "missing_components": final_state.missing_components,
            "suggested_structure": final_state.suggested_structure,
            "insights": final_state.context_insights,
            "recommendations": self.generate_final_recommendations(final_state)
        }
```

---

## 🔗 **FILE RELATIONSHIP ANALYSIS**

### **2. Relationship Detection Engine**

```python
# apps/python-service/services/relationship_analyzer.py

class FileRelationshipAnalyzer:
    """Advanced file relationship detection"""
    
    relationship_types = [
        "content_reference",      # File A mentions File B
        "version_chain",         # v1, v2, v3 sequence
        "dependency",            # File A requires File B
        "temporal_correlation",  # Created/modified at same time
        "naming_pattern",        # Similar naming conventions
        "project_component",     # Part of same logical component
        "master_supporting",     # Main doc + attachments
        "cross_reference"        # Mutual references
    ]
    
    async def analyze_all_relationships(self, files: List[Dict]) -> List[Dict]:
        """Comprehensive relationship analysis"""
        relationships = []
        
        # Content-based analysis
        relationships.extend(await self.analyze_content_relationships(files))
        
        # Temporal analysis
        relationships.extend(await self.analyze_temporal_relationships(files))
        
        # Structural analysis
        relationships.extend(await self.analyze_structural_relationships(files))
        
        # Semantic analysis (using AI)
        relationships.extend(await self.analyze_semantic_relationships(files))
        
        return self.deduplicate_relationships(relationships)
    
    async def analyze_semantic_relationships(self, files: List[Dict]) -> List[Dict]:
        """Use AI to find semantic relationships between files"""
        
        # Group files for analysis
        file_descriptions = []
        for file in files[:20]:  # Limit for API efficiency
            desc = {
                "path": file["path"],
                "name": file["name"],
                "type": file["extension"],
                "content_preview": file.get("content_preview", "")[:500]
            }
            file_descriptions.append(desc)
        
        prompt = f"""
        Analyze these files and identify semantic relationships between them.
        
        Files:
        {json.dumps(file_descriptions, indent=2)}
        
        Find relationships like:
        - Documents that discuss the same topic
        - Files that are part of the same workflow
        - Supporting documents for main files
        - Version chains or iterations
        
        Return JSON array of relationships:
        [
            {{
                "source": "file1.pdf",
                "target": "file2.pdf", 
                "type": "topic_correlation",
                "confidence": 0.85,
                "description": "Both discuss Q4 budget planning"
            }}
        ]
        """
        
        response = await self.llm.ainvoke(prompt)
        try:
            relationships = json.loads(response.content)
            return relationships
        except:
            return []
```

---

## 🎯 **CONTEXT-AWARE RENAMING**

### **3. Contextual File Naming**

```python
# apps/python-service/services/contextual_renamer.py

class ContextualRenamer:
    """Rename files based on project context and relationships"""
    
    async def rename_with_context(
        self, 
        file_path: str, 
        project_context: Dict[str, Any],
        file_relationships: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate context-aware filename"""
        
        # Extract current file info
        file_info = await self.extract_file_info(file_path)
        
        # Determine naming strategy based on project type
        strategy = self.get_naming_strategy(project_context["project_type"])
        
        # Apply contextual naming rules
        suggested_name = await self.apply_naming_strategy(
            file_info, project_context, file_relationships, strategy
        )
        
        # Generate folder placement suggestion
        suggested_folder = await self.suggest_folder_placement(
            file_info, project_context, suggested_name
        )
        
        return {
            "original_name": file_info["name"],
            "suggested_name": suggested_name,
            "suggested_folder": suggested_folder,
            "full_suggested_path": os.path.join(suggested_folder, suggested_name),
            "confidence": self.calculate_naming_confidence(file_info, project_context),
            "reasoning": self.explain_naming_decision(file_info, project_context, suggested_name),
            "alternatives": await self.generate_alternative_names(file_info, project_context)
        }
    
    def get_naming_strategy(self, project_type: str) -> Dict[str, Any]:
        """Get naming conventions for project type"""
        
        strategies = {
            "web-development": {
                "pattern": "{component}-{type}-{version}.{ext}",
                "conventions": ["kebab-case", "descriptive", "component-based"],
                "prefixes": {"component": "comp-", "page": "page-", "util": "util-"}
            },
            "legal-case": {
                "pattern": "{category}-{document-type}-{date}.{ext}",
                "conventions": ["formal", "dated", "categorized"],
                "categories": {"pleading": "01", "evidence": "03", "correspondence": "04"}
            },
            "design-project": {
                "pattern": "{screen}-{device}-{version}.{ext}",
                "conventions": ["descriptive", "device-specific", "versioned"],
                "devices": ["desktop", "mobile", "tablet"]
            }
        }
        
        return strategies.get(project_type, {
            "pattern": "{descriptive-name}.{ext}",
            "conventions": ["descriptive", "clear"]
        })
    
    async def apply_naming_strategy(
        self, 
        file_info: Dict, 
        context: Dict, 
        relationships: List[Dict],
        strategy: Dict
    ) -> str:
        """Apply the naming strategy using AI"""
        
        # Find related files for context
        related_files = self.find_related_files(file_info["path"], relationships)
        
        prompt = f"""
        Generate an optimal filename based on the project context and naming strategy.
        
        File to rename: {file_info["name"]}
        Content preview: {file_info.get("content_preview", "")[:300]}
        
        Project context:
        - Type: {context["project_type"]}
        - Confidence: {context["confidence"]}
        
        Naming strategy: {strategy}
        
        Related files: {[f["name"] for f in related_files]}
        
        Generate a filename that:
        1. Follows the project naming conventions
        2. Is descriptive and clear
        3. Fits with related files
        4. Uses appropriate categorization
        
        Return just the filename with extension.
        """
        
        response = await self.llm.ainvoke(prompt)
        suggested_name = response.content.strip()
        
        # Sanitize filename
        return self.sanitize_filename(suggested_name)
```

This LangGraph implementation provides **true contextual intelligence** - understanding entire projects, not just individual files! 🌟 