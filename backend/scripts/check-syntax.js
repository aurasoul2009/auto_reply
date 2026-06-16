const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function collectJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectJavaScriptFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

const roots = ["src", "scripts", "test"]
  .map((directory) => path.resolve(process.cwd(), directory))
  .filter(fs.existsSync);

const files = roots.flatMap(collectJavaScriptFiles);

for (const file of files) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);
