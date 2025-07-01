# SilentSort
## AI-Powered File Organization for macOS

SilentSort is an intelligent desktop application that automatically organizes and renames your files using AI-powered content analysis. It runs silently in the background, analyzing your downloads and documents to give them meaningful names and organize them into logical folder structures.

## Features

- **Auto-Rename**: AI reads file content and creates descriptive filenames
- **Auto-Organize**: Creates folders and moves files based on content analysis
- **Smart Search**: Global hotkey (Cmd+Shift+F) for AI-powered file finding
- **Background Processing**: Runs silently in system tray with minimal resource usage

## Quick Start

### Prerequisites
- macOS 12.0 or later
- Node.js 18+ 
- OpenAI API key

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/silentsort.git
cd silentsort

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development
npm run dev
```

## Project Structure

```
silentsort/
├── apps/
│   └── desktop/           # Electron desktop application
├── packages/
│   └── shared/            # Shared TypeScript types and utilities
├── tools/
│   └── scripts/           # Development and build scripts
└── brainlift/            # Project planning and documentation
```

## Development

This project was built as part of a 4-day intensive development challenge, focusing on solving real productivity problems through intelligent automation.

## Technology Stack

- **Desktop**: Electron + React + TypeScript
- **AI**: OpenAI API for content analysis
- **File System**: Node.js chokidar for file monitoring
- **Database**: Hybrid SQLite (local) + Supabase (cloud)

## License

MIT License - see LICENSE file for details 