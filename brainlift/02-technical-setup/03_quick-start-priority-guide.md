# SilentSort - Quick Start Priority Guide
## Get Up and Running Fast - Essential Setup First

This guide prioritizes the **essential setup tasks** to get you coding as quickly as possible. Complete these in order, then tackle the remaining tasks from the full TODO list.

---

## 🚀 PHASE 1: IMMEDIATE ESSENTIALS (30-45 minutes)
*Get basic development environment working*

### **1. Development Environment (15 minutes)**
```bash
# Install basic requirements
xcode-select --install
brew install node@18 git

# Configure Git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### **2. GitHub Repository (10 minutes)**
1. Create GitHub repo: `silentsort`
2. Clone locally: `git clone https://github.com/yourusername/silentsort.git`
3. Create basic structure:
```bash
cd silentsort
mkdir -p apps/desktop packages/shared
```

### **3. Basic API Keys (15 minutes)**
- **OpenAI API Key** (required for AI features)
  - Go to: https://platform.openai.com/api-keys
  - Create key, set $20 billing limit
  - Save key securely (NOT in code yet)

### **4. Simple .env Setup (5 minutes)**
```bash
# Create .env file in project root
echo "OPENAI_API_KEY=your_key_here" > .env
echo ".env" >> .gitignore
```

---

## 🏗️ PHASE 2: PROJECT FOUNDATION (45-60 minutes)
*Get basic Electron app skeleton working*

### **5. Initialize Desktop App (15 minutes)**
```bash
cd apps/desktop
npm init -y
npm install electron react react-dom
npm install -D @types/react @types/react-dom typescript
```

### **6. Basic Electron Setup (20 minutes)**
Create these essential files:
- `apps/desktop/src/main.ts` (Electron main process)
- `apps/desktop/src/renderer.tsx` (React app)
- `apps/desktop/tsconfig.json` (TypeScript config)
- `apps/desktop/package.json` scripts

### **7. Test Basic App (10 minutes)**
```bash
npm run dev  # Should open basic Electron window
```

### **8. File Watcher Foundation (15 minutes)**
```bash
npm install chokidar  # File watching library
```
Create basic file watcher in main process

---

## 🤖 PHASE 3: AI INTEGRATION (30-45 minutes)
*Get basic AI functionality working*

### **9. OpenAI Integration (20 minutes)**
```bash
npm install openai
```
Test basic OpenAI API call from renderer process

### **10. Basic Content Analysis (15 minutes)**
Create simple function that:
- Reads file content
- Sends to OpenAI for filename suggestion
- Returns suggested name

**Test with a single file manually**

### **11. Simple UI (10 minutes)**
Create basic React interface showing:
- File being processed
- Suggested new name
- Accept/Reject buttons

---

## 📦 PHASE 4: CORE FEATURES (60-90 minutes)
*Make it actually useful*

### **12. File Processing Pipeline (30 minutes)**
- Detect file changes
- Extract content based on file type
- Generate intelligent filenames
- Show user suggestions

### **13. File Operations (20 minutes)**
- Rename files safely
- Move files to organized folders
- Undo functionality

### **14. Basic Organization Rules (20 minutes)**
```
Downloads/Invoice_*.pdf → Documents/Invoices/
Downloads/Screenshot_*.png → Pictures/Screenshots/
Downloads/*_resume.pdf → Documents/Resumes/
```

### **15. System Tray Integration (10 minutes)**
- Basic tray icon
- Show/hide main window
- Status indicators

---

## ⚡ PHASE 5: POLISH & DEPLOY (30-45 minutes)
*Make it production ready*

### **16. Error Handling (15 minutes)**
- Try/catch around API calls
- User-friendly error messages
- Graceful failures

### **17. Basic Build Process (15 minutes)**
```bash
npm install -D electron-builder
```
Configure basic build for macOS

### **18. Final Testing (15 minutes)**
- Test with real files
- Test error scenarios
- Performance check

---

## 🎯 PRIORITY DECISION TREE

**If you have limited time, focus on:**

### **2 Hours Available:**
- Complete Phase 1 + Phase 2
- **Result:** Basic Electron app that can watch files

### **4 Hours Available:**  
- Complete Phase 1-3
- **Result:** Working AI file processor with basic UI

### **6+ Hours Available:**
- Complete all phases
- **Result:** Functional SilentSort ready for daily use

---

## 🚨 CRITICAL SUCCESS FACTORS

### **Must Have Working First:**
1. **File Watcher** - Detect when files are added/changed
2. **OpenAI Integration** - Basic API call working
3. **File Rename** - Actually rename files safely
4. **Basic UI** - Show what's happening

### **Can Add Later:**
- Supabase database
- n8n workflows  
- LangGraph complex workflows
- Advanced UI polish
- Code signing
- Auto-updater

---

## 🔍 VALIDATION CHECKPOINTS

### **After Phase 1:**
- [ ] Can create new files in project
- [ ] Git commits work
- [ ] OpenAI API responds to test call

### **After Phase 2:**
- [ ] Electron app opens
- [ ] Basic React UI displays
- [ ] File watcher detects new files

### **After Phase 3:**
- [ ] Can send file content to OpenAI
- [ ] Receives filename suggestions
- [ ] UI shows suggestions to user

### **After Phase 4:**
- [ ] Can rename files automatically
- [ ] Files organized into folders
- [ ] System tray shows status

### **After Phase 5:**
- [ ] Handles errors gracefully
- [ ] Can build .app file for distribution
- [ ] Works reliably with test files

---

## 🛟 TROUBLESHOOTING SHORTCUTS

### **Common Issues & Quick Fixes:**

**Electron won't start:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors:**
```bash
npx tsc --noEmit  # Check for errors
```

**OpenAI API not working:**
- Check API key is correct
- Verify billing is set up
- Test with curl first

**File watcher not triggering:**
- Check file path permissions
- Test with console.log first
- Verify chokidar configuration

---

## 📈 SUCCESS METRICS

**You're ready to start advanced features when:**
- [ ] App opens reliably
- [ ] Can process at least 3 different file types
- [ ] Suggested filenames are reasonably good
- [ ] Can rename files without breaking anything
- [ ] Basic error handling works

**After completing this guide, you should have:**
- Working SilentSort prototype (80% of core functionality)
- Solid foundation for advanced features
- Clear understanding of technical architecture
- Confidence to tackle the full TODO list

---

*Focus on getting something working quickly rather than perfect setup. You can always refactor and improve once the core functionality is proven.* 