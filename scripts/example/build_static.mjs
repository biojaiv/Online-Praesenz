import { writeFile } from 'node:fs/promises';
import { staticMarkup } from '../../src/example/reading.js';

// Pre-rendered, bilingual HTML is also usable when JavaScript cannot run.
await writeFile(new URL('../../beispiel/index.html',import.meta.url),`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Tiefgang: one workplace, seven layers. An interactive systems integration story by Vladimir Leicht.">
  <title>Tiefgang — Vladimir Leicht</title>
  <link rel="stylesheet" href="/src/example/style.css">
</head>
<body>
  <div id="example">${staticMarkup().replace(/[\t ]+$/gm,'')}</div>
  <script type="module" src="/src/example/main.js"></script>
</body>
</html>\n`);
console.log('Tiefgang: English and German reading views generated.');
