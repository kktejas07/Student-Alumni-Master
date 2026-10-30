# Start the backend using the project's virtual environment Python
# This ensures all dependencies (including slowapi) are available.

$VENV_PYTHON = "$PSScriptRoot\venv\Scripts\python.exe"

if (-not (Test-Path $VENV_PYTHON)) {
    Write-Error "Virtual environment not found at $VENV_PYTHON"
    Write-Error "Run: python -m venv $PSScriptRoot\venv"
    Write-Error "Then: & `"$VENV_PYTHON`" -m pip install -r $PSScriptRoot\requirements.txt"
    exit 1
}

Write-Host "Using: $VENV_PYTHON"
& $VENV_PYTHON --version

Write-Host "Starting uvicorn on http://127.0.0.1:8002 ..."
& $VENV_PYTHON -m uvicorn server:app --reload --port 8002
