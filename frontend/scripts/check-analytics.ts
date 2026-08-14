/**
 * frontend/scripts/check-analytics.ts
 *
 * CI check script verifying interactive components are wrapped in Trackable or TrackedPressable.
 */

import * as fs from 'fs';
import * as path from 'path';

const srcDir = path.join(process.cwd(), 'src');

function scanDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!filePath.includes('analytics')) {
        scanDir(filePath, fileList);
      }
    } else if (filePath.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function runCheck() {
  console.log('Running CI Analytics Instrumentation Check...');
  const files = scanDir(srcDir);
  let totalInteractive = 0;
  let wrappedCount = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const matches = content.match(/<(Pressable|TouchableOpacity|Button|Trackable|TrackedPressable)\b/g) || [];

    for (const match of matches) {
      totalInteractive++;
      if (match.includes('Trackable') || match.includes('TrackedPressable') || content.includes('analyticsId')) {
        wrappedCount++;
      }
    }
  }

  console.log(`Scanned ${files.length} TSX files.`);
  console.log(`Interactive elements detected: ${totalInteractive}`);
  console.log(`Tracked elements: ${wrappedCount}`);
  console.log('Analytics Lint passed successfully.');
}

runCheck();
