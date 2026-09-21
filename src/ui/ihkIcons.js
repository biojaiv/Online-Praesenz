// Thin, copper-coloured outlines matching the document symbols in the CV.
// Shared by the HTML reader and the locally rendered projection textures.
const paths = {
  server: '<rect x="3" y="3" width="18" height="7" rx="1"/><rect x="3" y="14" width="18" height="7" rx="1"/><path d="M7 6.5h.01M7 17.5h.01M11 6.5h6M11 17.5h6"/>',
  uem: '<path d="m12 2 9 5-9 5-9-5 9-5Zm-9 5v10l9 5 9-5V7M12 12v10"/>',
  clients: '<rect x="2" y="3" width="20" height="14" rx="1"/><path d="M8 22h8M12 17v5m-4-12 3 3 5-6"/>',
  migration: '<path d="M4 5h12l4 4-4 4M20 19H8l-4-4 4-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  check: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm-5 10 3 3 7-7"/>',
  network: '<rect x="8" y="2" width="8" height="6" rx="1"/><rect x="2" y="16" width="7" height="6" rx="1"/><rect x="15" y="16" width="7" height="6" rx="1"/><path d="M12 8v4M5.5 16v-4h13v4"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/>',
  tools: '<path d="m8 5-6 7 6 7M16 5l6 7-6 7M14 3l-4 18"/>',
  file: '<path d="M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8M8 16h8"/>',
  play: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m10 8 6 4-6 4V8Z"/>',
};

export function ihkIcon(name) {
  return `<svg class="ihk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.tools}</svg>`;
}

export const IHK_SECTION_ICONS = {
  server: ['server', 'check', 'database'],
  uem: ['uem', 'network', 'database'],
  clients: ['network', 'clients', 'uem'],
  migration: ['migration', 'tools', 'check'],
};
