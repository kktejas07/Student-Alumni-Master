# Enterprise Playwright E2E Automation Testing Framework

Comprehensive Page Object Model (POM) testing framework built with Playwright, TypeScript, Allure, Axe-core, and PDF/Excel/CSV reporting for the **Student Alumni / NexusOS** platform.

---

## 📁 Project Structure

```
QA-Automation/
├── tests/
│   ├── Student/          # Student user journeys & onboarding tests
│   ├── Mentor/           # Mentor portal & session tests
│   ├── Alumni/           # Alumni networking & profile tests
│   └── College/          # College/University admin tests
├── pages/
│   ├── BasePage.ts       # Core POM base class with axe-core & log listeners
│   ├── Student/          # Student POM page objects
│   ├── Mentor/           # Mentor POM page objects
│   ├── Alumni/           # Alumni POM page objects
│   └── College/          # College POM page objects
├── utils/
│   ├── DataGenerator.ts  # Dynamic Faker test data generator
│   └── ReportGenerator.ts# PDF, Excel, CSV, and JSON report generator
├── reports/
│   ├── html/             # Playwright HTML report
│   ├── allure-report/    # Allure interactive HTML dashboard
│   ├── pdf/              # PDF Executive Summary Report
│   ├── excel/            # Excel Bug Tracker Workbook
│   ├── csv/              # CSV Bug List
│   └── json/             # Execution results JSON
├── screenshots/          # Action & error screenshots
├── videos/               # Test execution recordings
├── .env                  # Environment variables & test credentials
├── playwright.config.ts  # Playwright runner configuration
└── package.json          # Node dependencies & scripts
```

---

## 🚀 Getting Started

### 1. Install Dependencies & Browsers
```bash
npm install
npx playwright install --with-deps
```

### 2. Configure Environment Variables
Edit `.env`:
```ini
BASE_URL=http://localhost:8081
API_URL=http://localhost:8002
STUDENT_EMAIL=student01@test.com
STUDENT_PASSWORD=TestPass@123
MENTOR_EMAIL=mentor01@test.com
MENTOR_PASSWORD=TestPass@123
ALUMNI_EMAIL=alumni01@test.com
ALUMNI_PASSWORD=TestPass@123
COLLEGE_EMAIL=iitb@university.in
COLLEGE_PASSWORD=TestPass@123
```

---

## 🧪 Test Execution Commands

```bash
# Run all tests on Chromium
npx playwright test --project=chromium

# Run cross-browser tests
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run mobile viewport tests
npx playwright test --project=Mobile-Chrome
npx playwright test --project=Mobile-Safari

# Run role-specific test suites
npm run test:student
npm run test:mentor
npm run test:alumni
npm run test:college

# Execute custom test runner & generate all Executive Reports
npx ts-node run_all_tests.ts
```

---

## 📊 Reports & Artifacts

- **Playwright HTML Report**: `npm run report:html`
- **Allure Interactive Dashboard**: `npm run report:allure`
- **PDF Executive Summary**: `reports/pdf/Executive_QA_Report.pdf`
- **Excel Bug Tracker**: `reports/excel/Bug_Tracker.xlsx`
- **CSV Bug List**: `reports/csv/Bug_List.csv`
- **JSON Execution Results**: `reports/json/Execution_Summary.json`
