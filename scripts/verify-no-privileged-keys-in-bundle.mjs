#!/usr/bin/env node
// Fails if the client-side Next.js build output references privileged, server-only secrets.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CLIENT_BUNDLE_DIR = join(process.cwd(), '.next', 'static');
const FORBIDDEN_TOKENS = ['SUPABASE_SERVICE_ROLE_KEY'];

function collectJsFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return collectJsFiles(fullPath);
    return entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

function main() {
  if (!statSync(CLIENT_BUNDLE_DIR, { throwIfNoEntry: false })) {
    console.error(`Build output not found at ${CLIENT_BUNDLE_DIR}. Run "pnpm build" first.`);
    process.exit(1);
  }

  const files = collectJsFiles(CLIENT_BUNDLE_DIR);
  const offenders = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    for (const token of FORBIDDEN_TOKENS) {
      if (content.includes(token)) offenders.push({ file, token });
    }
  }

  if (offenders.length > 0) {
    console.error('Privileged secrets found in client bundle:');
    for (const { file, token } of offenders) console.error(`  ${token} in ${file}`);
    process.exit(1);
  }

  console.log(`Checked ${files.length} client bundle file(s); no privileged secrets found.`);
}

main();
