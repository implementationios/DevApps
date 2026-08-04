/**
 * For simple compilation (this will compile only the staged files, i.e. files added but pending of commit):
 * npm run build
 * 
 * For compile all files in dist folder:
 * npm run build -- --all
 * 
 * For compile with specific version tag:
 * npm run build -- --version=0
 */
const fs = require('fs');
const path = require('path');
const { minify } = require('uglify-js');
const CleanCSS = require('clean-css');

const { execSync } = require('child_process');

const BUILD_MARKER = '.build-last-commit';
const DIST_DIR = 'dist';
const inputBase = path.join(__dirname, '../public');
const outputBase = path.join(__dirname, '../dist');
const htmlInput = path.join(inputBase, 'index.html');
const htmlOutput = path.join(outputBase, 'index.html');
const CHANGED_FILE_LIST = 'scripts/.build-changed-files';
const replacements = {};

// prepare files/folders data to ignore or skip
let ignore = { js: [], css: [], skip: [], folders: [] };
try {
  const ignoreFilePath = path.join(__dirname, '.buildignore.json');
  const raw = fs.readFileSync(ignoreFilePath, 'utf-8');
  ignore = JSON.parse(raw);
  if (!ignore.js) ignore.js = [];
  if (!ignore.css) ignore.css = [];
  if (!ignore.skip) ignore.skip = [];
  if (!ignore.folders) ignore.folders = [];
} catch (e) {
  console.log('📄 .buildignore.json not found or empty.');
}

function convertHex8ToRgba(cssContent) {
  return cssContent.replace(/#([0-9a-fA-F]{8})\b/g, (_, hex) => {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = +(parseInt(hex.slice(6, 8), 16) / 255).toFixed(2);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  });
}


function getAllFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFilesRecursively(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

function processFile(filePath) {
  const relativePath = path.relative(inputBase, filePath);
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const dirName = path.dirname(relativePath);
  let outputFilePath = '';

  outputFilePath = path.join(outputBase, relativePath);

  if (ignore.skip.includes(filePath) || ignore.skip.includes(relativePath)) {
    return;
  }

  if (ignore.js.includes(filePath) || ignore.js.includes(relativePath) || isInIgnoredFolder(relativePath)) {
    copyFile(filePath, outputFilePath);
    return;
  }
  
  if (ext === '.js' && !baseName.endsWith(".min")) {
    const newFileName = `${baseName}${ext}`;
    outputFilePath = path.join(outputBase, dirName, newFileName);

    console.log(`🔧 Minifying ${filePath}...`);
    execSync(`npx terser "${filePath}" -o "${outputFilePath}" --compress --mangle`);

    console.log(`🕵️ Obfuscating ${filePath}...`);
    execSync(`npx javascript-obfuscator "${outputFilePath}" --output "${outputFilePath}"  --compact true --control-flow-flattening false --self-defending false --disable-console-output true`);
  } else if (ext === '.css' && !baseName.endsWith(".min")) {
    const newFileName = `${baseName}${ext}`;
    outputFilePath = path.join(outputBase, dirName, newFileName);
    let code = fs.readFileSync(filePath, 'utf8');
    code = convertHex8ToRgba(code);
    const result = new CleanCSS().minify(code).styles;
    replacements[path.posix.join(dirName, `${baseName}${ext}`).replace(/\\/g, '/')] = path.posix.join(dirName, newFileName).replace(/\\/g, '/');
    writeFile(outputFilePath, result);
  } else {
    copyFile(filePath, outputFilePath);
  }
}

function writeFile(filepath, content) {
  ensureDirExists(path.dirname(filepath));
  fs.writeFileSync(filepath, content);
  console.log(`✅ Generated: ${path.relative(outputBase, filepath)}`);
}

function copyFile(filePath, outputFilePath) {
    const outputDir = path.dirname(outputFilePath);
    
    ensureDirExists(outputDir);
    fs.copyFileSync(filePath, outputFilePath);
    console.log(`📁 Copied: ${filePath}`);
}

function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function isInIgnoredFolder(filePath) {
  return ignore.folders.some(folder => filePath.startsWith(folder + '/'));
}

function updateHTML(filesToProcess, versionTag) {
  if (!fs.existsSync(htmlInput)) return;

  let version;
  
  if (versionTag && versionTag.length != "") {
    version = versionTag;
  } else {
    version = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // e.g. 20250524
  }

  let html;
  const currentOutputHtml = path.join(outputBase, 'index.html');
  if (fs.existsSync(currentOutputHtml)) {
    html = fs.readFileSync(currentOutputHtml, 'utf8');
  } else {
    html = fs.readFileSync(htmlInput, 'utf8');
  }
  
  filesToProcess = filesToProcess.map(file => path.relative(inputBase, file));

  html = html.replace(
    /(href|src)=["'](?!https?:\/\/)([^"'\?\s]+?\.(?:css|js|png|jpg|jpeg|gif|webp|svg))(\?[^"']*)?["']/gi,
    (match, fullPath, filePath, params) => {
      
      if (filesToProcess.includes(filePath.replace(/\?.*$/, ''))) {
        const oldPath = filePath + ((params && params != "") ? params : "");
        console.log("Should be updated ", filePath);
        const newPath = updateVParameter(oldPath, version);
        console.log("FilePath updated: ", oldPath);
        return match.replace(oldPath, newPath);
      } else {
        console.log("Should be skipped ", filePath);
        return match;
      }

    }
  );

  fs.writeFileSync(htmlOutput, html, 'utf8');
  console.log('✅ index.html updated with version parameters in assets');
}

function updateVParameter(path, newValue) {
  const [base, queryString = ""] = path.split("?");
  const params = new URLSearchParams(queryString);

  params.set("v", newValue); // Add or update 'v'

  const newQuery = params.toString();
  return newQuery ? `${base}?${newQuery}` : base;
}

// Get the current hash of the HEAD
function getCurrentCommitHash() {
  return execSync('git rev-parse HEAD').toString().trim();
}

// Get the last saved hash (if it exists)
function getLastBuildHash() {
  if (!fs.existsSync(BUILD_MARKER)) return null;
  return fs.readFileSync(BUILD_MARKER, 'utf8').trim();
}

// Save new hash at the end of the build
function saveCurrentCommitHash(hash) {
  fs.writeFileSync(BUILD_MARKER, hash);
}

// Get files modified since the last build
function getChangedFilesSince(lastHash) {
  const output = execSync(`git diff --name-only ${lastHash} HEAD`).toString();
  return output
    .split('\n')
    //.filter(file => file.endsWith('.js') || file.endsWith('.css'))
    .filter(file => file.length > 0)
    .map(file => path.resolve(file));
}

function getChangedFilesFromFile() {
  if (!fs.existsSync(CHANGED_FILE_LIST)) {
    console.warn(`⚠️ File ${CHANGED_FILE_LIST} not found.`);
    return null;
  }

  const raw = fs.readFileSync(CHANGED_FILE_LIST, 'utf8');
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    return output
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);
  } catch (err) {
    console.error('Error al obtener archivos en staging:', err.message);
    return [];
  }
}

function main(buildAll, version) {
  const isHeroku = process.env.DYNO !== undefined;
  let filesToProcess;


  if (isHeroku) {
    console.log("Heroku detected. Nothing to compile.");
    return;
  }

  if (buildAll) {
    filesToProcess = getAllFilesRecursively(inputBase);
  } else { //get only files staged (pending of commit)
    filesToProcess = getStagedFiles();
  }

  //filesToProcess = ["public/assets/css/nbplayer.css"];
  //filesToProcess = ["public/config.js"];

  filesToProcess = filesToProcess.filter(file => file.replace(/\\/g, '/').indexOf("public/") >= 0); //filter only files from public folder
  //filesToProcess = filesToProcess.filter(file => file.indexOf(".css") >= 0); //filter only files from public folder
  
  // filesToProcess = [
  //   "public/js/scene/home.js",
  //   "public/js/module/Ads.js"
  // ];

  if (filesToProcess.length === 0) {
    console.log('✅ No files modified. No necessary to update the build folder');
  } else {
    filesToProcess.forEach(processFile);
    updateHTML(filesToProcess, version);

    console.log('✅ build finished, files processed: ' + filesToProcess.length);
    console.log('💡 Next step: make sure to add the build folder, commit and push');
  }

}

function containsArg(name) {
  const args = process.argv.slice(2);
  return args.includes('--' + name);
}

function getArgValue(name) {
  const args = process.argv.slice(2);
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
}

const buildAll = containsArg("all");
const versionTag = getArgValue("version");
main(buildAll, versionTag);