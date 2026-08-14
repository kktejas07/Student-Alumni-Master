/**
 * frontend/scripts/gen-taxonomy.ts
 *
 * Generates docs/analytics-taxonomy.md from constants/ids.ts and constants/events.ts.
 */

import * as fs from 'fs';
import * as path from 'path';

const rootDir = process.cwd();
const idsFilePath = path.join(rootDir, 'src/analytics/constants/ids.ts');
const outputDocPath = path.join(rootDir, '../docs/analytics-taxonomy.md');

function extractStringLiterals(content: string): string[] {
  const matches = content.match(/'sa\.[a-z0-9.-]+'/g) || [];
  return Array.from(new Set(matches.map((m) => m.replace(/'/g, ''))));
}

function run() {
  console.log('Generating Analytics Taxonomy Documentation...');

  const idsContent = fs.readFileSync(idsFilePath, 'utf-8');
  const allIds = extractStringLiterals(idsContent);

  let markdown = `# StudentAlumni.ai — Analytics Taxonomy & Element ID Registry\n\n`;
  markdown += `*Auto-generated from \`src/analytics/constants/ids.ts\` and \`constants/events.ts\`.*\n\n`;
  markdown += `Total Registered Elements: **${allIds.length}**\n\n`;

  markdown += `## Registered Element IDs\n\n`;
  markdown += `| Element ID | Surface | Area | Type |\n`;
  markdown += `|---|---|---|---|\n`;

  for (const id of allIds) {
    const parts = id.split('.');
    const surface = parts[1] || 'global';
    const area = parts[2] || 'general';
    const type = parts[3] || 'btn';
    markdown += `| \`${id}\` | ${surface} | ${area} | \`${type}\` |\n`;
  }

  markdown += `\n## Standard Property Envelope (Auto-attached)\n\n`;
  markdown += `| Property | Example | Notes |\n`;
  markdown += `|---|---|---|\n`;
  markdown += `| \`element_id\` | \`sa.echo.register.btn.submit\` | Click/Impression element ID |\n`;
  markdown += `| \`element_type\` | \`btn\` | Derived from ID |\n`;
  markdown += `| \`element_label\` | \`Register Now\` | Sanitized string (max 100) |\n`;
  markdown += `| \`screen\` | \`echo_registration\` | Active screen |\n`;
  markdown += `| \`session_id\` | \`uuid-v4\` | Shared session identifier |\n`;
  markdown += `| \`platform\` | \`web\` / \`ios\` / \`android\` | Target platform |\n`;
  markdown += `| \`user_role\` | \`student\` | Role, never identity |\n`;

  fs.mkdirSync(path.dirname(outputDocPath), { recursive: true });
  fs.writeFileSync(outputDocPath, markdown, 'utf-8');
  console.log(`Taxonomy document written to ${outputDocPath}`);
}

run();
