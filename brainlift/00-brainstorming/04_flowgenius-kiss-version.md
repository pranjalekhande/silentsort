# FlowGenius - KISS Version
## Keep It Simple, Stupid

### The Problem (One Sentence)
**People waste time searching for files because they're disorganized and have meaningless names.**

### The Solution (One Sentence)  
**AI watches your files, reads what's inside, and automatically renames + organizes them.**

---

## What FlowGenius Does

1. **Watches** your Downloads and Documents folders
2. **Reads** the content of new files (PDFs, docs, images)
3. **Renames** them with descriptive names
4. **Moves** them to the right folders
5. **Done** - you never think about file organization again

**That's it.**

---

## Example in Action

**Before FlowGenius:**
```
Downloads/
├── Document1.pdf
├── Screenshot 2024-12-16 at 2.34.51 PM.png  
├── untitled.docx
└── IMG_5847.jpg
```

**After FlowGenius (automatically):**
```
Documents/
├── Contracts/
│   └── Software_License_Agreement_Adobe_2024.pdf
├── Screenshots/
│   └── Dashboard_Analytics_Dec16.png
├── Reports/
│   └── Q4_Sales_Analysis_Draft.docx
└── Photos/
    └── Team_Meeting_Whiteboard_Notes.jpg
```

**Finding Files (Smart Search):**
- Press `Cmd+Shift+F` anywhere
- Type *"Adobe contract"* 
- FlowGenius instantly shows: `Software_License_Agreement_Adobe_2024.pdf`
- Click to open or reveal in folder

---

## Core Features (Only 4)

### 1. Auto-Rename
- AI reads file content
- Creates descriptive filename
- `Document1.pdf` → `Software_License_Agreement_Adobe_2024.pdf`

### 2. Auto-Organize  
- Creates folders based on file type/content
- Moves files to logical locations
- Learns from your existing folder structure

### 3. Smart Search
- **Global hotkey** (Cmd+Shift+F) opens instant search
- Search by **what you remember** - not filename or location
- *"Find that Adobe contract"* → Shows `Software_License_Agreement_Adobe_2024.pdf`
- **AI understands** your search terms and file content

### 4. Background Processing
- Runs silently in system tray
- No popups or interruptions
- Just works automatically

---

## Technical Stack (Simple)

**Desktop App:** Electron
**AI:** OpenAI API for content analysis  
**File Processing:** Node.js file system APIs
**UI:** Simple tray icon + settings panel

**That's all you need.**

---

## MVP Features (Day 1-4)

### Day 1: File Watcher
- Monitor Downloads folder
- Detect new files
- Basic file reading

### Day 2: AI Renaming
- Send file content to OpenAI
- Get descriptive filename back
- Rename file automatically

### Day 3: Auto-Organization + Smart Search
- Create basic folder structure
- Move files to appropriate folders
- **Global hotkey search** (Cmd+Shift+F)
- **AI-powered file search** by content/description

### Day 4: Polish
- System tray integration
- Simple settings panel
- Search result UI refinement
- Error handling

---

## Success Metric (One Number)

**Users stop manually organizing files within 1 week.**

---

## Why This Works

✅ **Solves real pain** - Everyone has messy downloads  
✅ **Immediate value** - See results in first 5 minutes  
✅ **Zero learning curve** - Install and forget  
✅ **Desktop advantage** - Can't do this in browser  
✅ **AI differentiator** - Understands content, not just filenames  

---

## What We're NOT Building

❌ Multiple user personas  
❌ Complex rule engines  
❌ Relationship mapping  
❌ Version control  
❌ Integration with 15 different tools  
❌ Dashboard with analytics  
❌ Role-based presets  
❌ Custom workflows  

**Just auto-rename, auto-organize, and smart search. Period.**

---

## The Pitch (30 seconds)

*"Your Downloads folder is a mess. FlowGenius fixes that. It reads your files, gives them proper names, and puts them in the right folders. Automatically. In the background. Then when you need to find something, just hit Cmd+Shift+F and search by what you remember - not where you think you saved it. You'll never organize files again."*

---

*Simple problems need simple solutions. FlowGenius does one thing perfectly: makes your files organized without you thinking about it.* 