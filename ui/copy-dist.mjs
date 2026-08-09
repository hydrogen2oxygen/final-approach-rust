import {cpSync, rmSync} from 'node:fs';

rmSync('public/browser', {recursive: true, force: true});
cpSync('dist/ui/browser', 'public/browser', {recursive: true});
