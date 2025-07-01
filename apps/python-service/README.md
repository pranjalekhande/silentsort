# SilentSort Python LangGraph Service

A powerful Python-based AI service using LangGraph workflows for intelligent file analysis and renaming.

## 🚀 Quick Start

1. **Setup environment and start service:**
   ```bash
   cd apps/python-service
   python start.py
   ```

2. **Configure your OpenAI API key:**
   - Copy `config.env.template` to `.env`
   - Add your OpenAI API key to the `.env` file

3. **Access the service:**
   - API: http://127.0.0.1:8000
   - Documentation: http://127.0.0.1:8000/docs
   - Health check: http://127.0.0.1:8000/health

## 🏗️ Architecture

### LangGraph Workflow
The service uses a sophisticated LangGraph workflow with the following nodes:

1. **Content Analysis** - Analyzes file metadata and content
2. **Name Generation** - Generates optimal filename suggestions
3. **Confidence Calculation** - Determines confidence scores
4. **Result Finalization** - Packages the final response

### API Endpoints

#### `POST /analyze-file`
Analyzes a file and suggests better names using AI.

**Request:**
```json
{
  "file_path": "/path/to/file.txt",
  "original_name": "file.txt",
  "file_size": 1024,
  "file_extension": ".txt",
  "content_preview": "File content preview..."
}
```

**Response:**
```json
{
  "suggested_name": "meeting-notes-2024-01-15.txt",
  "confidence": 0.85,
  "category": "document",
  "reasoning": "Based on content analysis, this appears to be meeting notes...",
  "alternatives": ["notes-jan-15.txt", "team-meeting-notes.txt"],
  "content_summary": "Meeting notes discussing project timeline",
  "processing_time_ms": 1250
}
```

#### `GET /health`
Health check endpoint for monitoring service status.

## 🔧 Configuration

### Environment Variables
Copy `config.env.template` to `.env` and configure:

```bash
# OpenAI Configuration (Required)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.3
OPENAI_MAX_TOKENS=1000

# LangSmith Configuration (Optional)
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_PROJECT=silentsort-workflows

# Server Configuration
HOST=127.0.0.1
PORT=8000
LOG_LEVEL=info
```

## 🛠️ Manual Setup (Alternative)

If you prefer manual setup:

1. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp config.env.template .env
   # Edit .env with your API keys
   ```

4. **Start the service:**
   ```bash
   python main.py
   ```

## 🔗 Integration with Electron App

To connect the Electron app to this Python service, update the Electron app's AI service to call the Python API:

```typescript
// In apps/desktop/src/services/ai-service.ts
async analyzeFile(filePath: string): Promise<FileAnalysisResult> {
  const response = await fetch('http://127.0.0.1:8000/analyze-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_path: filePath,
      original_name: path.basename(filePath),
      file_size: fs.statSync(filePath).size,
      file_extension: path.extname(filePath),
      content_preview: this.extractContentPreview(filePath)
    })
  });
  
  return await response.json();
}
```

## 📦 Dependencies

### Core Dependencies
- **FastAPI** - Modern web framework for APIs
- **LangChain** - AI application framework
- **LangGraph** - Workflow orchestration for AI agents
- **Pydantic** - Data validation and serialization

### AI Dependencies
- **langchain-openai** - OpenAI integration
- **langsmith** - LangChain monitoring and debugging

### Optional Dependencies
- **python-magic** - File type detection
- **Pillow** - Image processing
- **PyPDF2** - PDF content extraction

## 🧪 Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest

# Test API endpoints
curl http://127.0.0.1:8000/health
```

## 🚀 Production Deployment

For production deployment:

1. **Use environment variables for configuration**
2. **Set up proper logging and monitoring**
3. **Configure CORS for your specific domains**
4. **Use a production ASGI server like Gunicorn**
5. **Set up SSL/TLS certificates**

Example production start:
```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 🔍 Monitoring

The service includes:
- Health check endpoint (`/health`)
- Processing time metrics
- Error handling and logging
- Optional LangSmith integration for AI workflow monitoring

## 📄 License

This service is part of the SilentSort project. 