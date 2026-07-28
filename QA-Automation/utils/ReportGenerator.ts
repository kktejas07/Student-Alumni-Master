import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { createObjectCsvWriter } from 'csv-writer';

export interface BugItem {
  id: string;
  title: string;
  module: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  pageUrl: string;
  browser: string;
  description: string;
  expectedResult: string;
  actualResult: string;
  stepsToReproduce: string;
}

export interface ExecutiveSummaryData {
  appName: string;
  executionDate: string;
  environment: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  passPercentage: number;
  durationSeconds: number;
  bugs: BugItem[];
}

export class ReportGenerator {
  static async generateExcelBugTracker(bugs: BugItem[], outputPath: string) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Bug Tracker');

    sheet.columns = [
      { header: 'Bug ID', key: 'id', width: 12 },
      { header: 'Title', key: 'title', width: 35 },
      { header: 'Module', key: 'module', width: 18 },
      { header: 'Severity', key: 'severity', width: 14 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Page URL', key: 'pageUrl', width: 35 },
      { header: 'Browser', key: 'browser', width: 15 },
      { header: 'Expected Result', key: 'expectedResult', width: 35 },
      { header: 'Actual Result', key: 'actualResult', width: 35 },
      { header: 'Steps to Reproduce', key: 'stepsToReproduce', width: 45 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };

    bugs.forEach(bug => {
      const row = sheet.addRow(bug);
      if (bug.severity === 'CRITICAL' || bug.severity === 'HIGH') {
        row.getCell('severity').font = { color: { argb: 'DC2626' }, bold: true };
      }
    });

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await workbook.xlsx.writeFile(outputPath);
  }

  static async generateCsvBugList(bugs: BugItem[], outputPath: string) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: [
        { id: 'id', title: 'Bug ID' },
        { id: 'title', title: 'Title' },
        { id: 'module', title: 'Module' },
        { id: 'severity', title: 'Severity' },
        { id: 'priority', title: 'Priority' },
        { id: 'pageUrl', title: 'Page URL' },
        { id: 'browser', title: 'Browser' },
        { id: 'description', title: 'Description' },
        { id: 'expectedResult', title: 'Expected Result' },
        { id: 'actualResult', title: 'Actual Result' },
        { id: 'stepsToReproduce', title: 'Steps to Reproduce' },
      ]
    });

    await csvWriter.writeRecords(bugs);
  }

  static async generateJsonSummary(data: ExecutiveSummaryData, outputPath: string) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  static async generatePdfExecutiveReport(data: ExecutiveSummaryData, outputPath: string) {
    const PDFDocument = require('pdfkit');
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Title / Header
    doc.fontSize(22).fillColor('#4F46E5').text('QA Executive Summary & Quality Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#6B7280').text(`App: ${data.appName} | Date: ${data.executionDate} | Env: ${data.environment}`, { align: 'center' });
    doc.moveDown(1.5);

    // Key Metrics Box
    doc.fontSize(14).fillColor('#111827').text('Execution Metrics Overview', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#374151');
    doc.text(`Total Test Cases Executed: ${data.totalTests}`);
    doc.text(`Passed: ${data.passed} (${data.passPercentage.toFixed(1)}%)`);
    doc.text(`Failed: ${data.failed}`);
    doc.text(`Skipped: ${data.skipped}`);
    doc.text(`Total Execution Duration: ${data.durationSeconds.toFixed(1)} seconds`);
    doc.moveDown(1.5);

    // Defect Summary
    doc.fontSize(14).fillColor('#111827').text('Defect & Bug Breakdown', { underline: true });
    doc.moveDown(0.5);
    const criticalCount = data.bugs.filter(b => b.severity === 'CRITICAL').length;
    const highCount = data.bugs.filter(b => b.severity === 'HIGH').length;
    const medCount = data.bugs.filter(b => b.severity === 'MEDIUM').length;
    const lowCount = data.bugs.filter(b => b.severity === 'LOW').length;

    doc.fontSize(11).fillColor('#DC2626').text(`Critical Severity Bugs: ${criticalCount}`);
    doc.fillColor('#EA580C').text(`High Severity Bugs: ${highCount}`);
    doc.fillColor('#D97706').text(`Medium Severity Bugs: ${medCount}`);
    doc.fillColor('#2563EB').text(`Low Severity Bugs: ${lowCount}`);
    doc.moveDown(1.5);

    // Release Readiness Recommendation
    doc.fontSize(14).fillColor('#111827').text('Release Readiness Assessment', { underline: true });
    doc.moveDown(0.5);
    if (criticalCount === 0 && highCount === 0 && data.passPercentage >= 90) {
      doc.fontSize(12).fillColor('#16A34A').text('RECOMMENDATION: PASSED FOR RELEASE (STABLE QUALITY GATE)');
    } else {
      doc.fontSize(12).fillColor('#DC2626').text('RECOMMENDATION: CONDITIONAL HOLD (BLOCKING BUGS IDENTIFIED)');
    }
    doc.moveDown(1.5);

    // Bug Details Table
    doc.fontSize(14).fillColor('#111827').text('Top Defect Log', { underline: true });
    doc.moveDown(0.5);
    data.bugs.slice(0, 10).forEach(b => {
      doc.fontSize(10).fillColor('#111827').text(`[${b.id}] ${b.title} (${b.severity})`, { bold: true });
      doc.fontSize(9).fillColor('#4B5563').text(`Module: ${b.module} | URL: ${b.pageUrl}`);
      doc.fontSize(9).fillColor('#6B7280').text(`Expected: ${b.expectedResult}`);
      doc.fontSize(9).fillColor('#DC2626').text(`Actual: ${b.actualResult}`);
      doc.moveDown(0.5);
    });

    doc.end();
  }
}
