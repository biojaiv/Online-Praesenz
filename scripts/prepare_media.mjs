import { createHash } from 'node:crypto';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

// Derived files are committed. Unchanged builds need no local conversion tools.
const recordsPath = 'scripts/media-assets.json';
const records = JSON.parse(await readFile(recordsPath, 'utf8').catch(() => '{}'));
const jobs = [];
for (const language of ['de', 'en']) {
  for (const format of ['desktop', 'mobile']) jobs.push({ source: `public/example/preview-${format}-${language}.jpg`, type: 'webp' });
  jobs.push({ source: `public/recovery/preview-${language}.jpg`, type: 'webp' });
}
for (const sound of ['combeep1', 'tdrtra00', 'tdrtra01', 'ppbwht00', 'ppwrdown', 'dronemachine3', 'pulsemachine', 't2b00tad', 'ppywht00', 'warn1', 'Menue_Knöpfe_rechts_oben']) jobs.push({ source: `sounds/${sound}.wav`, type: 'flac' });
for (const { source, type } of jobs) {
  const output = source.replace(/\.[^.]+$/, `.${type}`);
  const digest = createHash('sha256').update(await readFile(source)).update(type === 'webp' ? 'webp-q92-m6' : 'flac-12').digest('hex');
  if (records[source]?.digest === digest && await stat(output).then(() => true, () => false)) continue;
  if (type === 'webp') execFileSync('magick', [source, '-quality', '92', '-define', 'webp:method=6', output]);
  else execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', source, '-c:a', 'flac', '-compression_level', '12', output]);
  records[source] = { digest, output };
}
const json = JSON.stringify(records, null, 2) + '\n';
if (await readFile(recordsPath, 'utf8').catch(() => '') !== json) await writeFile(recordsPath, json);
console.log('Delivery assets are up to date.');
