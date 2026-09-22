/** Same-origin project entry points shared by the gallery and projector. */
export const PROJECTS = Object.freeze([
 { id: 'systems', title: 'example.title', note: 'example.previewNote', preview: '/example/preview.webp', entry: () => '/beispiel/', parameter: 'embedded', separate: false },
]);
export const getProject = id => PROJECTS.find(project => project.id === id) || PROJECTS[0];
