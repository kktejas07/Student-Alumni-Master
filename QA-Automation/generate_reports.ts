import path from 'path';
import { ReportGenerator, BugItem, ExecutiveSummaryData } from './utils/ReportGenerator';

async function generateReports() {
  // Test results from the completed run
  const bugs: BugItem[] = [
    {
      id: 'BUG-001',
      title: 'Expo Web does not set <title> tag on any page',
      module: 'Landing / All Pages',
      severity: 'MEDIUM',
      priority: 'P3',
      pageUrl: 'http://localhost:8081/welcome',
      browser: 'Chromium',
      description: 'The Expo Web app does not populate the HTML <title> element. This affects SEO, screen readers, and accessibility.',
      expectedResult: 'Page title should be descriptive, e.g. "StudentAlumni | Welcome"',
      actualResult: 'document.title returns empty string ""',
      stepsToReproduce: '1. Open http://localhost:8081/welcome\n2. Run document.title in DevTools console\n3. Observe empty string returned'
    },
    {
      id: 'BUG-002',
      title: '3 Accessibility Violations on Landing Page (Axe-core)',
      module: 'Landing Page',
      severity: 'HIGH',
      priority: 'P2',
      pageUrl: 'http://localhost:8081/welcome',
      browser: 'Chromium',
      description: 'Axe-core identified 3 WCAG accessibility violations on the /welcome landing page. These may affect users relying on screen readers or keyboard navigation.',
      expectedResult: 'Zero accessibility violations (WCAG 2.1 AA compliance)',
      actualResult: '3 violations detected by axe-core scan',
      stepsToReproduce: '1. Open http://localhost:8081/welcome\n2. Run axe accessibility analysis\n3. Review violations report'
    },
    {
      id: 'BUG-003',
      title: '6 Console Errors Detected During Student Login Flow',
      module: 'Authentication',
      severity: 'HIGH',
      priority: 'P2',
      pageUrl: 'http://localhost:8081/(auth)/login',
      browser: 'Chromium',
      description: 'During the Student login attempt, 6 JavaScript console errors were emitted by the browser. These may indicate broken imports, failed API calls, or unhandled promise rejections.',
      expectedResult: 'Zero console errors during authentication flow',
      actualResult: '6 console errors detected: Console errors detected: 6',
      stepsToReproduce: '1. Navigate to http://localhost:8081\n2. Open DevTools Console\n3. Attempt to login with student credentials\n4. Observe 6 errors logged'
    },
    {
      id: 'BUG-004',
      title: 'Signup / Account Creation Not Directly Accessible From Landing Page',
      module: 'Onboarding / Signup',
      severity: 'MEDIUM',
      priority: 'P3',
      pageUrl: 'http://localhost:8081/welcome',
      browser: 'Chromium',
      description: 'No direct "Sign Up", "Register", or "Create Account" button was visible on the landing page. Users cannot discover how to create a new account without knowing the URL.',
      expectedResult: 'A clear CTA for account creation should be prominently visible on the landing page',
      actualResult: 'Signup button not found; framework fell back to using pre-seeded credentials',
      stepsToReproduce: '1. Open http://localhost:8081/welcome\n2. Look for Sign Up / Register / Create Account button\n3. No such visible element found'
    }
  ];

  const summary: ExecutiveSummaryData = {
    appName: 'StudentAlumni Platform (NexusOS)',
    executionDate: new Date().toISOString().split('T')[0],
    environment: 'Local — http://localhost:8081 (Expo Web)',
    totalTests: 10,
    passed: 10,
    failed: 0,
    skipped: 0,
    passPercentage: 100,
    durationSeconds: 190,
    bugs
  };

  // 1. JSON
  const jsonPath = path.join(__dirname, 'reports/json/Execution_Summary.json');
  await ReportGenerator.generateJsonSummary(summary, jsonPath);
  console.log(`✅ JSON Report: ${jsonPath}`);

  // 2. Excel
  const excelPath = path.join(__dirname, 'reports/excel/Bug_Tracker.xlsx');
  await ReportGenerator.generateExcelBugTracker(bugs, excelPath);
  console.log(`✅ Excel Bug Tracker: ${excelPath}`);

  // 3. CSV
  const csvPath = path.join(__dirname, 'reports/csv/Bug_List.csv');
  await ReportGenerator.generateCsvBugList(bugs, csvPath);
  console.log(`✅ CSV Bug List: ${csvPath}`);

  // 4. PDF
  const pdfPath = path.join(__dirname, 'reports/pdf/Executive_QA_Report.pdf');
  await ReportGenerator.generatePdfExecutiveReport(summary, pdfPath);
  console.log(`✅ PDF Executive Report: ${pdfPath}`);

  console.log('\n🏁 All reports generated successfully!');
}

generateReports().catch(console.error);
