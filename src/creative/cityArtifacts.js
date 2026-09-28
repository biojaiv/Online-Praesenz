/** Small museum illustrations, drawn for the paper city rather than an icon font.
 * Filled silhouettes keep them readable at 80 px; fine marks reward a closer look.
 * No SVG filters, external images, animation, or additional WebGL work.
 */
const ink='#736450';
const path=(d,fill='none',extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
const shadow=(x=100,y=140,rx=65,ry=10)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#ART-shadow)" stroke="none"/>`;
const line=(d,extra='')=>path(d,'none',extra);
const tree=(x,y,scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})">
 ${shadow(0,3,11,3)}${line('M0 3v-26m0 15-6-7m6 1 7-7','stroke="#867459" stroke-width="1.4"')}
 <path d="M-2-36c-6-5-15 4-12 10-7 10 5 17 11 13 6 5 17-2 14-8 6-8-6-19-13-15Z" fill="#b4b698" stroke="#8d9178" stroke-width=".65"/>
 <path d="M-8-32c-7 5-3 13 4 11 3-7 8-6 10-11-5-5-10-4-14 0Z" fill="#d0ceae" stroke="none"/>
 ${line('M0-6v-13m0 2-5-6','stroke="#8c9075" stroke-width=".75"')}
 </g>`;
const drawings={
 museum:()=>`${shadow(103,134,86,13)}
  ${path('m12 106 76-39 102 37-80 43Z','#ddd5bf','stroke="#c1b8a0"')}
  ${path('m27 78 46-18 66 23v18l-47 22-65-23Z','#c3bba5')}
  ${path('m70 58 39-15 57 20v27l-40 18-56-21Z','url(#ART-stone)')}
  ${path('m70 58 56 19 40-14v5l-40 15-56-21Z','#eee6d1')}
  ${path('m73 63 50 17v20L73 83Z','url(#ART-glass)')}
  ${path('m128 83 34-13v18l-34 15Z','#84938a')}
  ${line('M81 67v20m9-17v20m9-16v20m9-18v20m9-17v20m22-18v17m10-21v17m10-21v17','stroke="#c3c4b2" stroke-width="1.5"')}
  ${path('m72 52 36-14 62 21-44 17-59-19Z','#ddd8c4')}
  ${path('m81 52 27-10 49 17-31 12Z','#b5b4a3','stroke="#bfbdaa"')}
  ${path('m21 86 40-19 53 18v29l-35 20-58-25Z','url(#ART-stone)')}
  ${path('m80 96 30-17v30l-30 18Z','#b3aa8f')}
  ${path('m20 80 40-17 57 19-37 20-60-21Z','#eae2ca')}
  ${path('m26 79 34-12 45 16-26 15Z','#c7c4ad','stroke="#c1baa3"')}
  ${path('m26 87 49 18v21l-49-20Z','url(#ART-glass)')}
  ${line('M32 90v19m9-16v19m9-15v19m9-16v19m9-16v19','stroke="#eee4cc" stroke-width="1.8"')}
  ${path('m121 102 27-14 28 10v19l-27 16-28-11Z','#c1b69b')}
  ${path('m149 113 27-15v19l-27 16Z','#a69e89')}
  ${path('m119 98 29-14 31 11-30 18-30-11Z','#f0e6cd')}
  ${path('m124 99 24-11 23 8-22 13Z','#bfc0ab','stroke="#c3baa3"')}
  ${path('m126 112 17 6v8l-17-6Z','#6f8076','stroke="none"')}
  ${tree(176,89,.62)}${tree(19,119,.58)}
  ${line('m93 133 18 6 13-7m-29-2 16 5 10-5','stroke="#b0a88e" stroke-width=".6"')}`,
 memory:()=>`${shadow(102,140,73,10)}
  ${path('m30 127 16-8 114 3 9 12-20 8-113-3Z','#d2c3a7','stroke="#b7a78b"')}
  ${path('M41 126V69l23-36 28 24 6-5v78Z','url(#ART-stone)')}
  ${path('m41 69 7 5 17-26 23 19 4-10-28-24Z','#afa28a','stroke-width=".7"')}
  ${path('M100 130V58l13-3 3 11 13-5 25 21v45Z','url(#ART-stone)')}
  ${path('m100 58 10 3 3-6 3 11 13-5 25 21-9-1-19-12-14 7-5-9-7 2Z','#ab997c','stroke-width=".6"')}
  ${path('M60 116V86q12-22 24 0v36Z','#756d5b')}
  ${path('M64 113V86q8-14 16 0v32Z','#ece5d3','stroke="#a99b7d"')}
  ${path('M118 113V92h20v23Z','#9a8e76')}
  ${path('M122 110V96h12v15Z','#eee5cf','stroke="#b7a88a"')}
  ${line('M43 82h13m-13 11h12m-13 12h12m-8-23v11m-2 12v11m55-26h14m25 19h11m-11-8h10m-28-23 11 1m4 8v12M87 71l4 9-4 7 4 10','stroke="#ab9b7e" stroke-width=".7"')}
  ${path('M41 126V69l23-36 28 24 6-5v78Z','url(#ART-grain)','stroke="none"')}
  ${path('M100 130V58l13-3 3 11 13-5 25 21v45Z','url(#ART-grain)','stroke="none"')}
  ${path('m88 132 7-10 12 2 2 10-13 3Zm53 2 9-6 8 4-1 6Z','#e0d2b6','stroke-width=".6"')}
  ${line('M72 140q19-11 36-3 21-12 41-19','stroke="#879079" stroke-width="1.2"')}
  ${path('m101 135-9-6 11 1Zm14-3 3-8 4 6Z','#9aa083','stroke="none"')}
  <g fill="#ab5744" stroke="#8f4e3e" stroke-width=".45"><ellipse cx="148" cy="117" rx="4" ry="6" transform="rotate(30 148 117)"/><ellipse cx="154" cy="117" rx="5" ry="4"/><ellipse cx="150" cy="123" rx="5" ry="3"/></g>
  <circle cx="151" cy="120" r="1.6" fill="#67573e" stroke="none"/>`,
 river:()=>`${shadow(104,139,85,11)}
  ${path('m20 59 79-27 84 58-64 53-98-50Z','#c9c3a9','stroke="#ada991"')}
  ${path('m20 59 79-27 84 51-64 51-98-47Z','#e3ddc5','stroke="#c1bda4"')}
  ${path('m20 59 32-10 15 7q6 11 23 16t31 6q21 0 30 14l-22 19q-4-11-25-13t-28-11Q69 72 52 71L20 67Z','#8ba9a0','stroke="#809b93"')}
  ${path('m20 59 32-10 15 7q6 11 23 16t31 6q21 0 30 14l-22 19q-4-11-25-13t-28-11Q69 72 52 71L20 67Z','url(#ART-hatch)','stroke="none" opacity=".5"')}
  ${line('m23 61 22-5m8 4 10 3m14 14 17 7m11 3 18 2m-3-6 13 5m-12 11 10 5','stroke="#e2e8d2" stroke-width=".8"')}
  ${line('m31 76 19 5q15 4 16 14t24 20l23 8m-14-81 24 14 15 3 27 16','stroke="#f8efd7" stroke-width="4"')}
  ${line('m31 76 19 5q15 4 16 14t24 20l23 8','stroke="#cbbfa1" stroke-width=".6"')}
  ${path('m75 82 13-23 12 4-13 25Z','#b99d76')}
  ${line('m78 80 13-19m-9 22 12-20m-8 22 12-21','stroke="#e5d6b5" stroke-width=".8"')}
  ${line('M76 81v-8l13-22v8m-1 29v-8l12-25v8m-17 5 1 7m11-17 1 7','stroke="#8e8567" stroke-width="1"')}
  ${tree(131,63,.88)}${tree(51,100,.72)}${tree(157,82,.58)}
  ${line('m116 108 1-9m2 8 4-9m-1 9 5-5M40 67l-2-7m5 8 1-8','stroke="#8c9976" stroke-width=".9"')}
  ${path('m125 119 15-10 5 3-15 10Z','#a89977','stroke-width=".65"')}
  ${line('m129 122 1-3m10-8 2 3','stroke="#7c8069"')}`,
 map:()=>{
  const roofs=[[52,67,10,12],[66,65,9,13],[80,72,10,9],[93,62,8,16],[103,73,10,11],[119,69,8,13],[132,74,9,10],[147,68,8,13]];
  return `${shadow(101,135,84,10)}
   ${path('m19 40 52-14 39 9 58-11 14 99-59 18-42-13-52 8Z','url(#ART-paper)')}
   ${path('m71 26 39 9 13 106-42-13Z','#c3af86','opacity=".25" stroke="none"')}
   ${path('m22 42 48-12 38 9 57-10 12 90-54 17-41-13-50 8Z','none','stroke="#b3a07c" stroke-width=".6"')}
   ${path('m30 52 32-8 40 5 53-9 3 14-55 11-40-5-33 10Z','#e5dbbf','stroke="none"')}
   ${line('m32 70 8-8 6 2 11-10 12 6 11-5 8 8 15-7 9 5 12-10 11 4 9-9 11 6','stroke="#b4a07a" stroke-width=".65"')}
   <g fill="#ddd0ae" stroke="#8e7d5d" stroke-width=".7">
    ${roofs.map(([x,y,w,h])=>`${path(`M${x} ${y+h}v-${h}l${w/2}-6 ${w/2} 6v${h}Z`,'#e8dcbd')}${path(`m${x-2} ${y} ${w/2+2}-7 ${w/2+2} 7Z`,'#b5a17d')}${line(`m${x+3} ${y+4}v3m${w-6}-3v3`)}`).join('')}
   </g>
   ${path('M111 70V50l4-7 4 7v20Z','#d6c4a1','stroke-width=".6"')}
   ${path('m109 50 6-10 6 10Z','#a6906d','stroke-width=".5"')}
   ${line('m34 95 11-7 18 1 13-1 17 11 14-1 19 7 14-1 23-12m-128 8 11-7 16 1 15-1 16 12 14-1 18 6 16-1 22-11','stroke="#9fa59a" stroke-width=".9"')}
   ${line('m38 84 20 0 13 7m17-2 15-3m24 6 19-3m-69 21 21 6m30 5 28-9','stroke="#b0a07e" stroke-width=".6"')}
   ${line('m71 28 10 97m29-89 12 101','stroke="#fff8e0" stroke-width="1"')}
   <g transform="translate(152 48)" stroke="#8a7757" stroke-width=".6">${path('M0-8 2-2 7 0 2 2 0 8-2 2-7 0-2-2Z','#d3c09a')}${path('M0-8V0h7L2-2Z','#827358')}</g>
   <text x="60" y="116" fill="#978365" stroke="none" font-family="Georgia,serif" font-size="5" letter-spacing="1.1" transform="rotate(-10 60 116)">PFORZHEIM</text>`;
 },
 church:()=>`${shadow(102,141,85,10)}
  ${path('m22 116 88-24 77 30-69 28-96-20Z','#d9cdb0','stroke="#bfb294"')}
  ${path('m60 82 59-30 54 38v37l-53 18-60-23Z','url(#ART-stone)')}
  ${path('m119 74 54 16v37l-53 18Z','#c7b89a')}
  ${path('m58 80 61-34 58 41-57-13Z','#99988a')}
  ${path('m58 80 61-34 1 28Z','#b5b19d')}
  ${line('m80 69 39-22m-27 29 30-20m14 8 30 22m-36-14 21 19','stroke="#d2cab2" stroke-width=".6"')}
  ${path('M32 59 56 47l24 14v66l-25 12-23-13Z','url(#ART-stone)')}
  ${path('m56 47 24 14v66l-25 12Z','#b0a184')}
  ${path('m29 61 10-29 17-14 5 28 21 17-27-7Z','#8c8e80')}
  ${path('m29 61 10-29 17-14-1 38Z','#b4b29f')}
  ${line('M55 16v-7m-4 4h8','stroke="#7e7c67" stroke-width="1"')}
  ${path('M41 78v-9q4-8 8-4v9Zm20-2v-9q5-4 9 5v10Z','#656b5f','stroke="#968b72"')}
  ${path('M40 121v-14q5-10 10-3v22Zm23 7v-15q6-7 10 3v8Z','#717568')}
  ${[91,111,137,156].map((x,i)=>path(`M${x} ${i<2?109:119}v-16q4-13 8-9v23Z`,'#7f897b','stroke="#a79b80"')).join('')}
  ${line('M36 86 54 90l21-9m-39 19 18 4 22-8M88 117V93m37 39V101m24 23V99m18 19V99','stroke="#e7d8b9" stroke-width="1.6"')}
  ${line('M35 117h5m-5-23 6 1m20 10 9-4m16 25 10 3m35-9 5-2','stroke="#9b8c70" stroke-width=".6"')}
  ${path('m44 132 6-1 6 6-5 2-7-2Z','#e8dac0','stroke-width=".5"')}`,
 foundations:()=>{
  // Each block has three lit faces; the cutaway reads like the city model above.
  const block=(x,y,w=16)=>`${path(`m${x} ${y} 11-5 ${w} 7-11 6Z`,'#e4d6b8')}${path(`m${x} ${y} ${w} 8v10l-${w}-8Z`,'#c6b491')}${path(`m${x+w} ${y+8} 11-6v10l-11 6Z`,'#a99a7b')}`;
  const pieces=[[37,68],[48,62],[59,56],[70,50],[87,55],[104,62],[121,69],[138,76],[138,92],[127,98],[116,104],[105,110],[88,104],[71,97],[54,90],[37,83],[73,73],[84,67],[90,80],[107,87],[96,94]];
  return `${shadow(103,141,84,10)}
   ${path('m16 82 73-39 96 46-76 57-92-43Z','#b8a788','stroke="#a6997e"')}
   ${path('m16 76 73-39 96 46-76 57-92-43Z','#ded0b2','stroke="#c5b693"')}
   ${path('m16 76 73-39 96 46-76 57-92-43Z','url(#ART-grain)','stroke="none"')}
   ${path('m39 81 48-24 64 29-45 32Z','#c7b893','stroke="none"')}
   <g stroke-width=".55">${pieces.map(([x,y])=>block(x,y)).join('')}${block(87,45,15)}${block(103,51,15)}${block(120,58,15)}</g>
   ${path('m63 87 14-7 18 9-13 8Z','#ad8d67','stroke-width=".5"')}
   ${line('m64 86 16 8m-9-11 16 8m-9-7-11 6m17-3-12 7','stroke="#e0ccaa" stroke-width=".7"')}
   ${path('m39 109 5-3 6 4-2 5-8-1Zm100 14 6-4 6 4-4 5-7-2Zm19-16 5-2 7 4-6 4Z','#e8dabc','stroke-width=".5"')}
   ${line('m29 115 22 11m-19-14-6 6m28 4-6 7','stroke="#8e8064" stroke-width=".7"')}`;
 },
 watch:()=>{
  const ticks=Array.from({length:60},(_,i)=>`<path d="M100 46v${i%5===0?5.3:2.4}" transform="rotate(${i*6} 100 88)" stroke-width="${i%5===0?.95:.45}"/>`).join('');
  return `${shadow(103,143,56,9)}
   <g transform="rotate(-12 100 86)">
    ${line('M112 30c18-21 53-10 45 12-4 10-22 7-16-3 5-8 17-4 20 3s-1 14-6 19','stroke="#baa16d" stroke-width="2.5"')}
    ${line('M112 30c18-21 53-10 45 12-4 10-22 7-16-3 5-8 17-4 20 3s-1 14-6 19','stroke="#fff1bd" stroke-width=".7" stroke-dasharray="1 2.3"')}
    <ellipse cx="100" cy="23" rx="10" ry="12" fill="url(#ART-bronze)"/>
    <ellipse cx="100" cy="23" rx="6.7" ry="8.5" fill="#f3eee2"/>
    <rect x="94" y="31" width="12" height="13" rx="2" fill="url(#ART-bronze)"/>
    ${line('M96 33v8m2-8v8m2-8v8m2-8v8m2-8v8','stroke-width=".6"')}
    <circle cx="100" cy="90" r="49" fill="#9c8050"/>
    <circle cx="100" cy="88" r="49" fill="url(#ART-bronze)"/>
    <circle cx="100" cy="88" r="46" fill="none" stroke="#f9e7b4" stroke-width="1.2"/>
    <circle cx="100" cy="88" r="43.5" fill="url(#ART-paper)" stroke="#8a795d"/>
    <circle cx="100" cy="88" r="41.8" fill="none" stroke="#b0a18a" stroke-width=".5"/>
    <g stroke="#686250">${ticks}</g>
    <g fill="#635d50" stroke="none" font-family="Georgia,serif" font-size="10" text-anchor="middle">
     <text x="100" y="63">XII</text><text x="130" y="92">III</text><text x="100" y="122">VI</text><text x="70" y="92">IX</text>
    </g>
    <circle cx="100" cy="109" r="8" fill="none" stroke="#bcab8b" stroke-width=".5"/>
    ${line('M100 102v2m5 5h-2m-3 5v-2m-5-3h2m3 0 3-4','stroke-width=".6"')}
    ${path('m100 92-4-6-10-14 3-2 11 15 15-15 2 2-15 18Z','#465b5a','stroke="#384c4d" stroke-width=".6"')}
    <circle cx="100" cy="88" r="2.7" fill="url(#ART-bronze)"/>
    ${line('M63 74a40 40 0 0 1 49-23','stroke="#fff" opacity=".65" stroke-width="1.3"')}
   </g>`;
 },
 boots:()=>`${shadow(103,137,80,10)}
  <g transform="translate(58 -15) scale(.93)">
   ${path('M48 42q20-8 39 0l-4 43q9 17 38 26c10 4 14 11 10 19l-86 2-5-13 6-36Z','url(#ART-leather)')}
   ${path('M42 122q35 8 91-1v10q-36 11-88 4l-5-5Z','#756049')}
   ${path('M46 47q22 6 39-4l-3-8q-15-3-33 1Z','#aa8d69')}
   ${path('M50 41q20-4 32-1l-1 5q-16 5-30 1Z','#534737')}
   ${line('M60 53 71 59 59 66 71 72 58 80 71 87 57 94','stroke="#d5bea0" stroke-width="1.6"')}
   ${line('M86 89q-8 16-5 34m-36 5q41 6 83-2','stroke="#c1a37c" stroke-width=".75" stroke-dasharray="1 2"')}
  </g>
  ${path('M26 53q23-9 43-1l-2 41q15 14 41 22c10 3 15 11 10 18q-40 11-93 0l-5-13 7-33Z','url(#ART-leather)')}
  ${path('M22 122q50 15 98 1l-1 11q-40 11-94 1l-5-5Z','#695540')}
  ${line('M26 128q40 10 89-1','stroke="#d2b891" stroke-width="1.1"')}
  ${path('M28 57q25 4 39-2l3-8q-18-8-40-1Z','#ae9471')}
  ${path('M31 49q20-5 34 1l-1 5q-18 4-32-1Z','#504431')}
  ${path('m40 61 14-2 5 45-20-6Z','#8a6d4f','stroke="none"')}
  <g fill="#d1b788" stroke="#67513b" stroke-width=".8">
   ${[65,75,85,95].map(y=>`<circle cx="38" cy="${y}" r="1.8"/><circle cx="57" cy="${y-2}" r="1.8"/>`).join('')}
  </g>
  ${line('m38 65 19-2-19 12 19-2-19 12 19-2-19 12 19-2','stroke="#e1d0b0" stroke-width="1.5"')}
  ${line('M65 96q-2 12 11 16m-47-2 1-37m-5 56q41 10 86-1','stroke="#c6ac88" stroke-width=".7" stroke-dasharray="1.4 2"')}
  ${line('M82 116q16-3 24 5m-15-3 9 2M30 118l6 2','stroke="#e1cba5" opacity=".65"')}
  ${line('M33 138v-4m9 5v-4m10 5v-4m42 3v-4m9 2v-4m9 2v-4','stroke="#4c4336"')}`,
 book:()=>`${shadow(101,137,78,10)}
  ${path('M19 47 89 43l10 4 13-4 69 7-1 79-69 9-12-4-10 4-72-9Z','#69513f')}
  ${path('M21 45q41-14 78 5 38-17 79-4l-1 78q-40-13-78 4-38-17-79-2Z','url(#ART-paper)')}
  ${path('M22 47v73q36-10 77 6v-72q-39-18-77-7Z','#e5d5b4','stroke="none"')}
  ${path('M99 53q40-18 76-6v72q-40-11-76 7Z','#f5ebd3','stroke="none"')}
  ${path('M92 49q5 0 7 4 3-4 10-6v74l-10 5-7-3Z','url(#ART-gutter)','stroke="none"')}
  ${line('M21 123q40-11 77 7m-77-4q40-9 77 7m3-3q35-15 76-4m-76 7q35-15 76-4','stroke="#a9926e" stroke-width=".55"')}
  ${path('M101 51v75l-3 19-5-5-6 2 9-18V51Z','#a74732','stroke="none"')}
  <rect x="31" y="59" width="15" height="19" rx=".7" fill="#aa6449" stroke="none"/>
  <text x="38.5" y="74" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="#f1dfb8" stroke="none">R</text>
  <g stroke="#a99776" stroke-width=".65">
   ${line('M52 61q19 0 32 6m-32 0q19 0 32 6m-32 0q19 0 32 6')}
   ${[84,90,96,102,108].map(y=>line(`M31 ${y}q28-4 53 7`)).join('')}
   ${[61,67,73,79,85,91,97,103,109].map(y=>line(`M115 ${y+2}q24-9 48-3`)).join('')}
  </g>
  ${path('m21 116 9 1-9 8Zm157 0-9 1 8 7Z','url(#ART-bronze)','stroke-width=".5"')}`,
 vessel:()=>`${shadow(101,142,51,9)}
  ${path('M69 49C31 25 20 76 44 94l13 7 5-14-10-8c-12-9-7-27 8-19Z','url(#ART-clay)')}
  ${path('M130 49c38-24 49 27 25 45l-13 7-5-14 10-8c12-9 7-27-8-19Z','url(#ART-clay)')}
  ${path('M81 26h38v21c6 13 29 13 34 42 5 30-22 48-38 51H85c-20-5-44-24-37-52 5-26 29-28 33-41Z','url(#ART-clay)')}
  ${path('M81 26h38v21c6 13 29 13 34 42 5 30-22 48-38 51H85c-20-5-44-24-37-52 5-26 29-28 33-41Z','url(#ART-grain)','stroke="none" opacity=".55"')}
  <ellipse cx="100" cy="27" rx="23" ry="7" fill="#c49c74"/>
  <ellipse cx="100" cy="27" rx="17" ry="4" fill="#6d4b38" stroke="#92694c"/>
  ${line('M79 33q20 6 42 0m-43 8q22 7 44 0M59 72q40 13 82 0m-84 5q43 14 87 0m-91 9q48 15 96 0m-92 11q45 14 88 0m-79 19q37 11 71-1','stroke="#704c37" opacity=".3" stroke-width=".8"')}
  ${path('M76 58q-17 13-18 31c-1 12 6 22 9 24-8-24 1-41 12-51Z','#f0d7aa','opacity=".25" stroke="none"')}
  ${path('M84 137q16 4 32 0l4 5q-22 8-41-1Z','#986b4b','stroke-width=".7"')}
  ${line('m131 91-6 8 2 9-5 8m-49-48 5 3m-10 38 7 4','stroke="#75513a" opacity=".45" stroke-width=".7"')}`,
 stone:()=>`${shadow(101,141,58,9)}
  ${path('m52 132 11-8 67-2 17 11-6 11-77 3-14-6Z','#c8b897')}
  ${path('M65 32 70 20l13-6 23-1 20 8 10 13-3 96q-31 17-68 0Z','url(#ART-stone)')}
  ${path('M65 32 70 20l13-6 23-1 20 8 10 13-3 96q-31 17-68 0Z','url(#ART-grain)','stroke="none"')}
  ${path('m66 32 12-10 24-2 25 6 8 8q-36 12-69-2Z','#ded0b2','stroke-width=".7"')}
  ${line('m72 33 6-10 7-5m29 10 10 9m-57 68 5-8-3-13m61-37-6 9 3 8-5 6m-39 60 5-6-3-9','stroke="#9b8869" stroke-width=".85"')}
  <g fill="#847153" stroke="none" font-family="Georgia,serif" text-anchor="middle">
   <text x="100" y="57" font-size="8" letter-spacing="1.2">IMP · CAES</text>
   <text x="100" y="73" font-size="12" letter-spacing="1.4">PORTVS</text>
   <text x="100" y="88" font-size="8" letter-spacing="1.3">LEVG</text>
  </g>
  ${line('M81 98h28m-23 7h25m-35 14 7 2m25-75 13-1','stroke="#a59371" stroke-width=".7"')}
  ${path('m55 137 5-6 9 2-1 8Zm79-5 8 4-2 5-9-3Z','#dbceaf','stroke-width=".6"')}`,
};

function definitions(){return `<defs>
 <radialGradient id="ART-shadow"><stop stop-color="#675b43" stop-opacity=".24"/><stop offset="1" stop-color="#675b43" stop-opacity="0"/></radialGradient>
 <linearGradient id="ART-paper" x2=".8" y2="1"><stop stop-color="#fff8e4"/><stop offset=".58" stop-color="#eee2c9"/><stop offset="1" stop-color="#cabc9c"/></linearGradient>
 <linearGradient id="ART-bronze" x1="0" y1="0" x2=".9" y2=".6"><stop stop-color="#8c7046"/><stop offset=".23" stop-color="#efe0a9"/><stop offset=".4" stop-color="#c9ac70"/><stop offset=".57" stop-color="#fff0c0"/><stop offset=".78" stop-color="#b39661"/><stop offset="1" stop-color="#826640"/></linearGradient>
 <linearGradient id="ART-leather" x2=".9" y2=".9"><stop stop-color="#c2a383"/><stop offset=".4" stop-color="#9b7855"/><stop offset=".78" stop-color="#795d43"/><stop offset="1" stop-color="#594839"/></linearGradient>
 <linearGradient id="ART-clay" x2="1" y2=".3"><stop stop-color="#926346"/><stop offset=".28" stop-color="#d4aa7e"/><stop offset=".53" stop-color="#c6996e"/><stop offset=".8" stop-color="#ac7a52"/><stop offset="1" stop-color="#7e553d"/></linearGradient>
 <linearGradient id="ART-stone" x2="1" y2=".25"><stop stop-color="#c1b292"/><stop offset=".3" stop-color="#e7d9bb"/><stop offset=".68" stop-color="#d2c3a2"/><stop offset="1" stop-color="#a59372"/></linearGradient>
 <linearGradient id="ART-gutter"><stop stop-color="#97805c" stop-opacity="0"/><stop offset=".5" stop-color="#735736" stop-opacity=".28"/><stop offset="1" stop-color="#97805c" stop-opacity="0"/></linearGradient>
 <linearGradient id="ART-glass" x2=".8" y2="1"><stop stop-color="#b2b9ac"/><stop offset=".48" stop-color="#dde0d2"/><stop offset=".49" stop-color="#a1aca2"/><stop offset="1" stop-color="#65766e"/></linearGradient>
 <pattern id="ART-grain" width="19" height="17" patternUnits="userSpaceOnUse"><g fill="#735839" opacity=".22"><circle cx="3" cy="4" r=".5"/><circle cx="14" cy="11" r=".7"/><circle cx="8" cy="15" r=".4"/><path d="m11 3 2 1-1 1Z"/></g></pattern>
 <pattern id="ART-hatch" width="4" height="4" patternUnits="userSpaceOnUse"><path d="m0 4 4-4" stroke="#6e634f" stroke-width=".5" opacity=".2"/></pattern>
 </defs>`;}

export function artifactDrawing(id){
 const draw=drawings[id];if(!draw)return '';
 // The prefix keeps paint servers local when several discoveries share a document.
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160" aria-hidden="true" focusable="false">${definitions()}<g stroke="${ink}" stroke-width=".85" stroke-linecap="round" stroke-linejoin="round">${draw()}</g></svg>`.replaceAll('ART-',`artifact-${id}-`);
}
