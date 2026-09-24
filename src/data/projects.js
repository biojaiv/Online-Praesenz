/** Same-origin project entry points shared by the gallery and projector. */
export const PROJECTS = Object.freeze([
 { id: 'systems', title: 'example.title', note: 'example.previewNote', preview: (language, mobile = false) => `/example/preview-${mobile ? 'mobile' : 'desktop'}-${language}.jpg`, entry: () => '/beispiel/', parameter: 'embedded', separate: false },
]);
export const getProject = id => PROJECTS.find(project => project.id === id) || PROJECTS[0];

export function getProjectUrl(project, language, embedded = false) {
  const query = new URLSearchParams({ lang: language });
  if (embedded) query.set(project.parameter, '1');
  return `${project.entry(language)}?${query}`;
}
