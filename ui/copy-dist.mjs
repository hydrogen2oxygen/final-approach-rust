import {cpSync, rmSync, readdirSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';

rmSync('public/browser', {recursive: true, force: true});
cpSync('dist/ui/browser', 'public/browser', {recursive: true});
rmSync('public/browser/API.php', {force: true});

function getFiles(dir, base = dir) {
  return readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const full = join(dir, entry.name);

    return entry.isDirectory()
      ? getFiles(full, base)
      : [relative(base, full).replaceAll('\\', '/')];
  });
}

const files = getFiles('public');
const filesJson = JSON.stringify(files, null, 2);

writeFileSync(
  'public/files.json',
  filesJson
);

// The Rust sidecar and Tauri both serve dist/ui/browser as their web root.
// Keep the upload manifest there as well as in Angular's public directory.
writeFileSync('dist/ui/browser/files.json', filesJson);
