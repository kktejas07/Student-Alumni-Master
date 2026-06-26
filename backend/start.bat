@echo off
REM Start the backend using the project's virtual environment Python
REM This ensures all dependencies (including slowapi) are available.

set "VENV_PYTHON=%~dp0venv\Scripts\python.exe"

if not exist "%VENV_PYTHON%" (
    echo ERROR: Virtual environment not found at %VENV_PYTHON%
    echo Run: python -m venv %~dp0venv
    echo Then: %VENV_PYTHON% -m pip install -r %~dp0requirements.txt
    exit /b 1
)

echo Using: %VENV_PYTHON%
%VENV_PYTHON% --version

echo Starting uvicorn on http://127.0.0.1:8000 ...
%VENV_PYTHON% -m uvicorn server:app --reload
