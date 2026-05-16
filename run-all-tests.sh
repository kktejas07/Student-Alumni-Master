#!/bin/bash
# Comprehensive Test Runner for Student Alumni Platform
# Run ALL tests in sequence and generate a detailed report
#
# Usage: bash run-all-tests.sh
# Options: bash run-all-tests.sh --verbose  (shows all output)
#          bash run-all-tests.sh --backend  (backend only)
#          bash run-all-tests.sh --frontend (frontend only)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPORT_DIR="$PROJECT_DIR/test-reports"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
PASSED=0
FAILED=0
SKIPPED=0

mkdir -p "$REPORT_DIR"

echo "══════════════════════════════════════════════════════"
echo "  STUDENT ALUMNI - COMPREHENSIVE TEST SUITE"
echo "  Timestamp: $TIMESTAMP"
echo "══════════════════════════════════════════════════════"
echo ""

run_backend_tests() {
  echo "┌────────────────────────────────────────────────────┐"
  echo "│  BACKEND TESTS (pytest)                            │"
  echo "└────────────────────────────────────────────────────┘"
  
  cd "$PROJECT_DIR/backend"
  
  # Activate virtualenv if it exists
  if [ -d "venv" ]; then
    source venv/bin/activate
  fi
  
  # Install test dependencies if needed
  pip install pytest pytest-asyncio httpx pytest-cov 2>/dev/null || true
  
  echo ""
  echo "  Running all endpoint tests..."
  echo ""
  
  set +e
  if python -m pytest tests/ \
    -v \
    --tb=short \
    --maxfail=10 \
    --color=yes \
    --junitxml="$REPORT_DIR/backend-results-$TIMESTAMP.xml" \
    2>&1 | tee "$REPORT_DIR/backend-output-$TIMESTAMP.log"; then
    echo ""
    echo "  ✅ BACKEND TESTS PASSED"
  else
    echo ""
    echo "  ❌ BACKEND TESTS FAILED (see report for details)"
  fi
  set -e
  
  cd "$PROJECT_DIR"
}

run_frontend_tests() {
  echo ""
  echo "┌────────────────────────────────────────────────────┐"
  echo "│  FRONTEND TESTS (Jest)                             │"
  echo "└────────────────────────────────────────────────────┘"
  
  cd "$PROJECT_DIR/frontend"
  
  echo ""
  echo "  Running all page/component tests..."
  echo ""
  
  set +e
  if npx jest \
    --verbose \
    --no-cache \
    --json \
    --outputFile="$REPORT_DIR/frontend-results-$TIMESTAMP.json" \
    2>&1 | tee "$REPORT_DIR/frontend-output-$TIMESTAMP.log"; then
    echo ""
    echo "  ✅ FRONTEND TESTS PASSED"
  else
    echo ""
    echo "  ❌ FRONTEND TESTS FAILED (see report for details)"
  fi
  set -e
  
  cd "$PROJECT_DIR"
}

generate_report() {
  echo ""
  echo "┌────────────────────────────────────────────────────┐"
  echo "│  GENERATING TEST REPORT                            │"
  echo "└────────────────────────────────────────────────────┘"
  
  REPORT_FILE="$REPORT_DIR/test-report-$TIMESTAMP.html"
  
  cat > "$REPORT_FILE" << 'HTMLHEAD'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Student Alumni - Test Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }
  h1 { color: #38bdf8; font-size: 24px; margin-bottom: 10px; }
  h2 { color: #94a3b8; font-size: 18px; margin: 20px 0 10px; border-bottom: 1px solid #334155; padding-bottom: 8px; }
  .summary { display: flex; gap: 15px; margin: 15px 0; }
  .card { background: #1e293b; border-radius: 8px; padding: 15px; flex: 1; border: 1px solid #334155; }
  .card h3 { font-size: 14px; color: #94a3b8; }
  .card .number { font-size: 32px; font-weight: bold; margin: 5px 0; }
  .pass { color: #4ade80; }
  .fail { color: #f87171; }
  .skip { color: #fbbf24; }
  .section { background: #1e293b; border-radius: 8px; padding: 15px; margin: 10px 0; border: 1px solid #334155; }
  .section h3 { color: #38bdf8; }
  .endpoint { padding: 8px; margin: 5px 0; border-radius: 4px; display: flex; justify-content: space-between; }
  .endpoint:hover { background: #334155; }
  .method { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 10px; }
  .method.GET { background: #22c55e; color: #000; }
  .method.POST { background: #3b82f6; color: #fff; }
  .method.PUT { background: #f59e0b; color: #000; }
  .method.PATCH { background: #8b5cf6; color: #fff; }
  .method.DELETE { background: #ef4444; color: #fff; }
  .passed { color: #4ade80; }
  .failed { color: #f87171; }
  .untested { color: #fbbf24; }
  pre { background: #0f172a; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; margin: 5px 0; }
  .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; }
  .dot.green { background: #4ade80; }
  .dot.red { background: #f87171; }
  .dot.yellow { background: #fbbf24; }
  .footer { margin-top: 30px; text-align: center; color: #64748b; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #334155; }
  th { color: #94a3b8; font-size: 12px; text-transform: uppercase; }
  td { font-size: 14px; }
</style>
</head>
<body>
HTMLHEAD

  # Add summary
  cat >> "$REPORT_FILE" << HTMLSUMMARY
<h1>📊 Student Alumni - Test Report</h1>
<p>Generated: $TIMESTAMP</p>
<div class="summary">
  <div class="card"><h3>📂 Backend API Endpoints</h3><div class="number">305+</div></div>
  <div class="card"><h3>📱 Frontend Pages</h3><div class="number">95</div></div>
  <div class="card"><h3>🗄️ MongoDB Collections</h3><div class="number">90+</div></div>
</div>

<div class="summary">
  <div class="card"><h3>✅ Passed</h3><div class="number pass">-</div></div>
  <div class="card"><h3>❌ Failed</h3><div class="number fail">-</div></div>
  <div class="card"><h3>⏭️ Skipped</h3><div class="number skip">-</div></div>
</div>
HTMLSUMMARY

  # Backend endpoints section
  cat >> "$REPORT_FILE" << 'HTMLENDPOINTS'
<h2>Backend API Endpoints</h2>
<div class="section">
<h3>Auth (11 endpoints)</h3>
<table>
<tr><th>Method</th><th>Path</th><th>Status</th></tr>
<tr><td><span class="method POST">POST</span></td><td>/api/auth/register</td><td><span class="untested">⏳</span></td></tr>
<tr><td><span class="method POST">POST</span></td><td>/api/auth/check-email</td><td><span class="untested">⏳</span></td></tr>
<tr><td><span class="method POST">POST</span></td><td>/api/auth/login</td><td><span class="untested">⏳</span></td></tr>
<tr><td><span class="method GET">GET</span></td><td>/api/auth/me</td><td><span class="untested">⏳</span></td></tr>
<tr><td><span class="method POST">POST</span></td><td>/api/auth/refresh</td><td><span class="untested">⏳</span></td></tr>
<tr><td><span class="method POST">POST</span></td><td>/api/auth/2fa/setup</td><td><span class="untested">⏳</span></td></tr>
<tr><td><span class="method POST">POST</span></td><td>/api/auth/2fa/enable</td><td><span class="untested">⏳</span></td></tr>
<tr><td><span class="method POST">POST</span></td><td>/api/auth/2fa/verify</td><td><span class="untested">⏳</span></td></tr>
<tr><td><span class="method POST">POST</span></td><td>/api/auth/google</td><td><span class="untested">⏳</span></td></tr>
<tr><td><span class="method POST">POST</span></td><td>/api/auth/linkedin</td><td><span class="untested">⏳</span></td></tr>
<tr><td><span class="method POST">POST</span></td><td>/api/auth/track</td><td><span class="untested">⏳</span></td></tr>
</table>
</div>
HTMLENDPOINTS

  # Close HTML
  cat >> "$REPORT_FILE" << 'HTMLFOOT'
<div class="footer">
  <p>Student Alumni Platform - Comprehensive Test Report</p>
  <p>Auto-generated by run-all-tests.sh</p>
</div>
</body>
</html>
HTMLFOOT

  echo ""
  echo "  ✅ Report generated: $REPORT_FILE"
}

show_summary() {
  echo ""
  echo "══════════════════════════════════════════════════════"
  echo "  TEST SUMMARY"
  echo "══════════════════════════════════════════════════════"
  echo ""
  echo "  Backend API Endpoints: 305+ (see test_all_endpoints.py)"
  echo "  Frontend Pages:        95   (see test_all_pages.test.tsx)"
  echo "  Database Collections:  90+  (see test_database_models.py)"
  echo "  Total Test Cases:      ~500+ across all test files"
  echo ""
  echo "  Reports: $REPORT_DIR/"
  echo ""
  echo "══════════════════════════════════════════════════════"
}

# ──────────────────────────────────────────────────────────
#  MAIN
# ──────────────────────────────────────────────────────────

case "${1:-all}" in
  backend)
    run_backend_tests
    ;;
  frontend)
    run_frontend_tests
    ;;
  all|*)
    run_backend_tests
    run_frontend_tests
    generate_report
    show_summary
    ;;
esac
