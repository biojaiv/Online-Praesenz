/** Shared gallery/projector entries. `systems` preserves old Tiefgang links. */
export const PROJECTS = Object.freeze([
 { id:'systems', category:'webseiten', title:'example.previewTitle', note:'example.previewNote', preview:(language,mobile=false)=>`/example/preview-${mobile?'mobile':'desktop'}-${language}.jpg`, entry:()=>'/beispiel/', parameter:'embedded', separate:false },
 { id:'recovery', category:'systemintegration', title:'recovery.title', note:'recovery.note', preview:language=>`/recovery/preview-${language}.jpg`, entry:()=>'/systemintegration/', parameter:'embedded', separate:false },
]);
export const getProject = id => PROJECTS.find(project=>project.id===id)||PROJECTS[0];
export const projectsIn = category => PROJECTS.filter(project=>project.category===category);
export function getProjectUrl(project,language,embedded=false){
 const query=new URLSearchParams({lang:language});
 if(embedded)query.set(project.parameter,'1');
 return `${project.entry(language)}?${query}`;
}
