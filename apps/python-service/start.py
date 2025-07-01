#!/usr/bin/env python3
"""
SilentSort Python Service Startup Script
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        sys.exit(1)
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")

def setup_environment():
    """Setup environment and install dependencies"""
    print("🔧 Setting up Python environment...")
    
    # Check if virtual environment exists
    venv_path = Path("venv")
    if not venv_path.exists():
        print("📦 Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)
    
    # Determine activation script path
    if os.name == 'nt':  # Windows
        pip_path = venv_path / "Scripts" / "pip"
        python_path = venv_path / "Scripts" / "python"
    else:  # Unix/macOS
        pip_path = venv_path / "bin" / "pip"
        python_path = venv_path / "bin" / "python"
    
    # Install dependencies
    print("📦 Installing dependencies...")
    subprocess.run([str(pip_path), "install", "-r", "requirements.txt"], check=True)
    
    return str(python_path)

def check_env_file():
    """Check if environment file exists"""
    env_files = [".env", "config.env"]
    for env_file in env_files:
        if Path(env_file).exists():
            print(f"✅ Environment file found: {env_file}")
            return True
    
    print("⚠️  No environment file found. Please create .env from config.env.template")
    print("   Copy your OpenAI API key to the .env file")
    return False

def start_service(python_path: str):
    """Start the FastAPI service"""
    print("🚀 Starting SilentSort LangGraph Service...")
    print("   Service will be available at: http://127.0.0.1:8000")
    print("   API documentation: http://127.0.0.1:8000/docs")
    print("   Press Ctrl+C to stop")
    
    try:
        subprocess.run([python_path, "main.py"], check=True)
    except KeyboardInterrupt:
        print("\n👋 Service stopped")

def main():
    print("🔥 SilentSort Python LangGraph Service")
    print("=====================================")
    
    # Check Python version
    check_python_version()
    
    # Setup environment
    python_path = setup_environment()
    
    # Check environment configuration
    if not check_env_file():
        print("\n📝 Quick setup:")
        print("   1. Copy config.env.template to .env")
        print("   2. Add your OpenAI API key")
        print("   3. Run this script again")
        return
    
    # Start the service
    start_service(python_path)

if __name__ == "__main__":
    main() 