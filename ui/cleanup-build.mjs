import {rmSync} from 'node:fs';

rmSync('public/browser', {recursive: true, force: true});
rmSync('public/files.json', {force: true});
