import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const outputDirectory = join(projectRoot, 'dist');

// Only the generated dist directory is cleaned; game assets keep their relative paths.
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const path of ['index.html', 'src', 'public']) {
  await cp(join(projectRoot, path), join(outputDirectory, path), { recursive: true });
}

await writeFile(join(outputDirectory, '.nojekyll'), '');
console.log('GitHub Pages build ready: dist/');
