# 🤖 SilentSort
## Intelligent File Organization That Just Works

**SilentSort** is your AI-powered file organization assistant that automatically analyzes, renames, and organizes your files while you work. No more manually sorting through messy Downloads folders or trying to remember what "Document1.pdf" actually contains.

---

## ✨ Why SilentSort?

### 🧠 **Smart Content Analysis**
- AI reads your PDFs, documents, and images to understand what they actually are
- Extracts key information like names, companies, amounts, and technologies
- Creates meaningful filenames that you'll actually remember

### ⚡ **Effortless Automation**
- Monitors your chosen folders in the background
- Processes new files automatically as they arrive
- Gives you clear suggestions with confidence scores

### ✅ **You Stay in Control**
- Review all AI suggestions before they're applied
- Approve/reject changes with a single click
- Search globally with ⌘⇧F from anywhere on your Mac

---

## 🎯 **Perfect For**

- **Knowledge Workers**: Organize research papers, reports, and presentations automatically
- **Freelancers**: Keep client documents, invoices, and contracts properly named and sorted
- **Students**: Automatically categorize course materials, assignments, and resources
- **Anyone**: Who's tired of messy Downloads folders and meaningless filenames

---

## 🚀 **Getting Started**

### **System Requirements**
- macOS 12.0 or later
- 4GB RAM minimum
- Internet connection for AI processing

### **Quick Setup**

1. **Download SilentSort** (or clone this repository)
   ```bash
   git clone https://github.com/pranjalekhande/silentsort.git
   cd silentsort
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure AI Services**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your API keys (see [Configuration](#configuration) below)

4. **Launch SilentSort**
   ```bash
   npm run dev
   ```

5. **Choose Your Folder**
   - On first launch, select a folder to monitor (Downloads, Documents, etc.)
   - SilentSort will watch for new files and suggest improvements

---

## ⚙️ **Configuration**

### **Required API Keys**

SilentSort uses AI services to analyze your files. You'll need:

- **OpenAI API Key**: For content analysis and intelligent naming
  - Get yours at [platform.openai.com](https://platform.openai.com/api-keys)
  - Cost: ~$0.01-0.05 per file (very affordable)

### **Optional Services**

- **LangSmith**: For AI workflow monitoring (optional)
- **Supabase**: For cloud backup and sync (optional)

---

## 🎨 **How It Works**

1. **📁 File Detection**: SilentSort notices when new files appear in your monitored folder
2. **🧠 AI Analysis**: Content is analyzed to understand what the file contains
3. **✏️ Smart Naming**: AI suggests a clear, descriptive filename
4. **👀 Your Review**: You see the suggestion with confidence score and reasoning
5. **✅ One-Click Apply**: Approve good suggestions instantly, reject poor ones

### **Example Transformations**

```
❌ Before: "document.pdf"
✅ After:  "Microsoft Azure Invoice December 2024.pdf"

❌ Before: "IMG_1234.png"  
✅ After:  "Login Screen Wireframe Mockup.png"

❌ Before: "file (1).docx"
✅ After:  "Project Proposal TechCorp Q1 2024.docx"
```

---

## 📱 **Features**

### **Core Functionality**
- 🔍 **Content Analysis**: Reads PDFs, images, documents, and code files
- 🏷️ **Smart Tagging**: Extracts companies, amounts, technologies, and key terms
- 📂 **Folder Organization**: Creates logical folder structures based on content
- 🔄 **Batch Operations**: Process multiple files at once
- 🔎 **Global Search**: Find files instantly with ⌘⇧F

### **User Experience**
- 🎛️ **System Tray Integration**: Runs quietly in your menu bar
- 📊 **Confidence Scores**: Know how certain the AI is about each suggestion
- ⏪ **Undo Support**: Rollback any changes you don't like
- 📱 **Responsive Design**: Clean, professional interface

---

## 🛠️ **Development**

### **Tech Stack**
- **Frontend**: Electron + React + TypeScript
- **AI Services**: OpenAI API + LangGraph workflows
- **File Processing**: Node.js with native file system APIs
- **Database**: SQLite (local) + optional Supabase (cloud)

### **Project Structure**
```
silentsort/
├── apps/
│   ├── desktop/           # Main Electron application
│   └── python-service/    # AI processing backend
├── packages/shared/       # Shared utilities and types
├── brainlift/            # Product planning and docs
└── tools/scripts/        # Development utilities
```

### **Development Commands**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run test suite
npm run lint         # Check code quality
```

---

## 🔒 **Privacy & Security**

- **Local Processing**: Files are analyzed locally when possible
- **Secure Transmission**: All API calls use HTTPS encryption
- **No File Storage**: Your files never leave your machine permanently
- **Transparent AI**: See exactly what the AI analyzed and why
- **Full Control**: Approve or reject every change

---

## 🐛 **Support**

Having issues? We're here to help:

1. **Check the logs**: Look for error messages in the console
2. **Test AI connection**: Use the "Test AI Connection" button in settings
3. **Restart the app**: Sometimes a fresh start helps
4. **File an issue**: [Create a GitHub issue](https://github.com/pranjalekhande/silentsort/issues) with details

---

## 🚀 **Roadmap**

- [ ] **Image OCR**: Extract text from screenshots and scanned documents
- [ ] **Smart Folders**: AI-driven folder creation and organization
- [ ] **Learning System**: Improve suggestions based on your preferences
- [ ] **Team Features**: Share organization rules across teams
- [ ] **Windows Support**: Expand beyond macOS

---

## 📄 **License**

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 **Credits**

Built with ❤️ by [Pranjal Ekhande](https://github.com/pranjalekhande) as part of an intensive 4-day development sprint focused on solving real productivity problems through intelligent automation.

---

**Ready to organize your digital life?** [Get started](#getting-started) in under 5 minutes! 