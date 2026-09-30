import { writeFile, mkdir } from 'node:fs/promises';
import { staticMarkup } from '../../src/example/reading.js';
import { explainedMarkup, explainedPath } from '../../src/example/explained.js';
import { navigationMarkup } from '../../src/example/navigation.js';

// Pre-rendered, bilingual HTML is also usable when JavaScript cannot run.
await writeFile(new URL('../../beispiel/index.html',import.meta.url),`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Tiefgang: one workplace, seven steps. An interactive systems integration story by Vladimir Leicht.">
  <title>Tiefgang — Vladimir Leicht</title>
  <link rel="stylesheet" href="/src/example/style.css">
</head>
<body>
  ${navigationMarkup()}
  <div id="example">${staticMarkup().replace(/[\t ]+$/gm,'')}</div>
  <script type="module" src="/src/example/main.js"></script>
</body>
</html>\n`);
for(const language of ['de','en']) {
  const directory=new URL(`../..${explainedPath(language)}`,import.meta.url);
  await mkdir(directory,{recursive:true});
  await writeFile(new URL('index.html',directory),explainedMarkup(language).replace(/[\t ]+$/gm,''));
}
console.log('Tiefgang: bilingual reading views and beginner information pages generated.');
