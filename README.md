# SilentSort

> **AI-Powered Desktop File Organization System**

## **What is SilentSort?**

SilentSort is a desktop application that automatically analyzes, renames, and organizes your files using AI. Instead of manually dealing with poorly named files like `document.pdf` or `IMG_1234.png`, SilentSort reads the actual content and suggests meaningful names like `Microsoft Azure Invoice December 2024.pdf` while organizing them into logical folder structures.

**Key Benefits:**
- **Intelligent Analysis**: AI reads file content, not just filenames
- **Smart Organization**: Suggests both names AND folder locations  
- **User Control**: You review and approve all suggestions
- **Background Processing**: Works silently without interrupting your workflow

## **What Does This Project Include?**

This repository contains a complete desktop file organization system:

```
docFlow/
├── apps/desktop/              # Electron + React desktop app
│   ├── src/components/        # UI components (file cards, modals)
│   ├── src/services/         # Core business logic
│   │   ├── ai-service.ts                    # AI integration
│   │   ├── folder-intelligence-service.ts   # Smart folder suggestions
│   │   └── file-state-manager.ts           # File processing
│   └── src/main.ts           # File monitoring & IPC
├── apps/python-service/      # AI processing backend
│   ├── enhanced-main.py      # Advanced AI analysis
│   └── langgraph-main.py     # Multi-agent workflows
└── brainlift/               # Project documentation & planning
```

**Project Status**: **Production Ready** - Core functionality complete and tested

## **How to Use This Repository**

### **Prerequisites**
- Node.js 18+
- Python 3.8+
- OpenAI API key

### **Quick Start**

**1. Clone and Install**
```bash
git clone [repository-url]
cd docFlow
npm install
```

**2. Setup Environment**
```bash
# Desktop app setup
cd apps/desktop
npm install
cp .env.example .env
# Edit .env with your OpenAI API key

# Python service setup  
cd ../python-service
pip install -r requirements.txt
```

**3. Run the Application**
```bash
# Terminal 1: Start AI service
cd apps/python-service
python enhanced-main.py

# Terminal 2: Start desktop app
cd apps/desktop
npm start
```

### **How It Works**

1. **Monitor**: App watches specified folders for new files
2. **Analyze**: AI reads file content and extracts meaning
3. **Detect Duplicates**: Checks for exact and similar content matches
4. **Generate Tags**: Creates smart tags from content, filename, and folder patterns
5. **Suggest Organization**: Proposes new names and folder locations
6. **Trigger Automation**: Executes workflows for financial documents (optional)
7. **Review**: You approve or modify suggestions in the UI
8. **Organize**: Files are renamed and moved to optimal locations

### **Example Results**

```
Before: document.pdf
After:  Microsoft Azure Invoice December 2024.pdf
Location: Finance/Invoices/Microsoft/
Confidence: 95%
Tags: #invoice, #microsoft, #2024, #finance
Automation: ✅ Email sent, 📅 Calendar reminder created

Before: resume.pdf  
After:  Resume Pranjal Ekhande Software Engineer React AI.pdf
Location: Career/Resume/
Confidence: 92%
Tags: #resume, #software-engineer, #react, #ai
Duplicates: ⚠️ Found 2 similar files (old-resume.pdf, resume-backup.pdf)
```

## **Core Features**

### **File Processing**
- **PDF Content Analysis**: Extracts and analyzes 3000+ characters
- **Entity Extraction**: Companies, amounts, technologies, people
- **Smart Categorization**: Detects invoices, resumes, reports, contracts
- **Confidence Scoring**: 85-95% accuracy on real content

### **Duplicate Detection & Smart Tagging**
- **Exact Content Duplicate Detection**: SHA-256 content hashing for 100% accuracy
- **Similar File Detection**: Levenshtein distance algorithm for related files
- **Better Version Analysis**: Intelligent scoring to identify optimal file versions
- **Smart Tagging System**: Multi-source tag generation from content, filename, and folder patterns
- **Automatic Categorization**: Content-based tags like `#invoice`, `#q4-2024`, `#microsoft`

### **Folder Intelligence**
- **AI Folder Suggestions**: Recommends optimal folder structures
- **Auto Folder Creation**: Creates directory hierarchies when needed
- **One-Click Organization**: Move files with single button click
- **Secure Operations**: Permission-based folder access control
- **Pattern Learning**: Learns from existing folder organization

### **Workflow Automation**
- **N8N Integration**: Webhook-based automation workflows
- **Finance Automation**: Email notifications, calendar reminders, Google Drive backup
- **Invoice Processing**: Auto-create payment reminders and organize by vendor/date
- **Email Notifications**: "New invoice: Microsoft $1,234 due Jan 15"
- **Calendar Integration**: Automated payment due date events
- **Cloud Backup**: Organized upload to Google Drive with proper folder structure

### **User Experience**
- **Professional UI**: Clean desktop interface with file review cards
- **Batch Processing**: Handle multiple files simultaneously
- **Real-time Processing**: Background monitoring and analysis
- **Smart Search**: Find files by content, entities, categories, and tags
- **Duplicate Management**: Clear indicators and actions for duplicate files

## **Technical Details**

### **Tech Stack**
- **Frontend**: Electron + React 18+ + TypeScript
- **AI Services**: OpenAI API + LangGraph + LangChain
- **File Processing**: Chokidar + pdf-parse + Node.js
- **Database**: SQLite (local storage)
- **Python Services**: FastAPI + LangGraph workflows

### **Performance**
- **Processing Speed**: ~2-3 seconds per file
- **Confidence Accuracy**: 85-95% on real content
- **File Support**: PDF (complete), images (planned), documents (planned)
- **Memory Usage**: ~100MB typical, ~200MB peak

## **Development**

### **Development Commands**
```bash
# Start development environment
npm run dev                    # Desktop app
python enhanced-main.py        # AI service

# Build for production
npm run build                  # Production build
npm run lint                   # Code linting
```

### **Configuration**
```bash
# apps/desktop/.env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
WATCHED_FOLDER_PATH=/path/to/monitor

# Optional: Automation Features
N8N_WEBHOOK_URL=https://your-n8n.com/webhook
N8N_WEBHOOK_KEY=your-api-key
AUTOMATION_ENABLED=true
EMAIL_NOTIFICATIONS_ENABLED=true
CALENDAR_REMINDERS_ENABLED=true
```

### **Testing**
```bash
# Create test directory
mkdir -p ~/Downloads/silentsort-test/

# Add test files and start app
npm run dev
```

## **Project Roadmap**

### **Recently Completed**
- **Folder Intelligence System** - AI-powered folder suggestions
- **Smart File Organization** - One-click move to suggested folders
- **Auto Folder Creation** - Creates folder structures when needed
- **Enhanced User Experience** - Professional UI with feedback
- **Duplicate Detection System** - Exact content matching and similar file detection
- **Smart Tagging System** - Multi-source tag generation and categorization
- **Workflow Automation** - N8N integration for email/calendar/backup workflows

### **Next Priority**
- User onboarding with folder selection
- Image OCR for screenshots and scanned documents
- System tray integration for background operation
- Performance optimization for large files

### **Future Enhancements**
- Advanced workflow automation and custom rules
- Team collaboration features
- Windows and Linux support
- Integration with cloud storage providers

## **Contributing**

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Follow TypeScript strict mode
4. Test your changes with real files
5. Submit pull request

## **License**

MIT License - see [LICENSE](LICENSE) for details.

---

**Ready to organize your digital life intelligently?**

*Built by Pranjal Ekhande | Last updated: December 2024* 