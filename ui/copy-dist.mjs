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

writeFileSync(
  'public/files.json',
  JSON.stringify(files, null, 2)
);
