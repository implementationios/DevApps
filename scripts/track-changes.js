/**

cd scripts
node track-changes.js
git add .build-changed-files
git commit -m "Track changes updated"
git push

 */
const fs = require('fs');
const { execSync } = require('child_process');

const OUTPUT_FILE = '.build-changed-files';

function getCurrentAndPreviousCommit() {
  const current = execSync('git rev-parse HEAD').toString().trim();
  const previous = execSync('git rev-parse HEAD^').toString().trim();
  return { current, previous };
}

function getChangedFiles(prev, current) {
  const out = execSync(`git diff --name-only ${prev} ${current}`).toString();
  return out
    .split('\n')
    .map(f => f.trim())
    //.filter(f => f.endsWith('.js') || f.endsWith('.css'))
    ;
}

function main() {
  const { current, previous } = getCurrentAndPreviousCommit();
  const files = getChangedFiles(previous, current);

  if (files.length === 0) {
    console.log('✅ No hay archivos JS/CSS modificados.');
    return;
  }

  fs.writeFileSync(OUTPUT_FILE, files.join('\n'));
  console.log(`📄 ${files.length} archivo(s) guardado(s) en ${OUTPUT_FILE}`);
}

main();
