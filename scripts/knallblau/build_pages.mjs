import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { routes } from '../../src/knallblau/content.js';
import { render } from '../../src/knallblau/render.js';
import { illustration } from '../../src/knallblau/artwork.js';
const repo = fileURLToPath(new URL('../../', import.meta.url));
for (const route of routes) {
 const path = resolve(repo, route.path.slice(1), 'index.html');
 await mkdir(dirname(path), {recursive:true}); await writeFile(path, render(route));
}
for (const id of ['tischlerei','praxis','kanzlei']) await writeFile(resolve(repo,'public/knallblau',id+'.svg'), illustration(id));
for (let i=0;i<3;i++) await writeFile(resolve(repo,`public/knallblau/wood-${i}.svg`), illustration('tischlerei',i));
await writeFile(resolve(repo,'public/knallblau/facet.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M8 6 45 4 58 22 32 52 6 25Z" fill="#ed1c24"/><path d="M8 6 26 4 32 52 6 25Z" fill="#85222a"/><ellipse cx="32" cy="60" rx="6" ry="2" fill="#ed1c24"/></svg>');
console.log(`Knallblau: ${routes.length} static DE/EN pages generated.`);
