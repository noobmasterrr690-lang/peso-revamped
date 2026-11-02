/**
 * PESO — 1-Command GitHub Commit & Push Helper
 * Usage:
 *   npm run github:push -- --repo https://github.com/USERNAME/REPO.git
 *   npm run github:push -- "Updated student cash budget features"
 */

import { execSync } from 'node:child_process';

function run(cmd, ignoreError = false) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (err) {
    if (ignoreError) return '';
    throw err;
  }
}

const args = process.argv.slice(2);
let repoUrl = '';
let commitMsg = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--repo' && args[i + 1]) {
    repoUrl = args[i + 1];
    i++;
  } else if (!args[i].startsWith('--')) {
    commitMsg = args[i];
  }
}

if (!commitMsg) {
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
  commitMsg = `update: PESO app changes (${nowStr})`;
}

console.log('1. Rebuilding production bundle...');
run('node build-bundle.mjs');

if (repoUrl) {
  const existingOrigin = run('git remote get-url origin', true);
  if (existingOrigin) {
    console.log(`Updating GitHub remote origin to: ${repoUrl}`);
    run(`git remote set-url origin "${repoUrl}"`);
  } else {
    console.log(`Adding GitHub remote origin: ${repoUrl}`);
    run(`git remote add origin "${repoUrl}"`);
  }
}

console.log('2. Staging all changes...');
run('git add -A');

const status = run('git status --porcelain');
if (status) {
  console.log(`3. Creating commit: "${commitMsg}"`);
  run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
} else {
  console.log('3. Working tree is already clean (no uncommitted file changes).');
}

const originUrl = run('git remote get-url origin', true);
if (!originUrl) {
  console.log('\n============================================================');
  console.log('LOCAL GIT COMMIT COMPLETE (Branch: main)');
  console.log('To connect your GitHub repository and push, run:');
  console.log('  npm run github:push -- --repo https://github.com/YOUR_USERNAME/YOUR_REPO.git');
  console.log('============================================================\n');
  process.exit(0);
}

console.log(`4. Pushing to GitHub (${originUrl})...`);
try {
  run('git push -u origin main');
  console.log('\nSuccessfully pushed updates to GitHub (origin/main)!');
} catch (err) {
  console.error('\nCould not push to remote yet:', err.message);
  console.log('Verify your GitHub repository URL and credentials, then re-run: npm run github:push');
}
