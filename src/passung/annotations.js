const order=['rear_cover','housing','front_bearing','shaft','circlip','spacer','outboard_bearing','front_cover','fasteners'];
const topIds=new Set(['rear_cover','front_bearing','circlip','outboard_bearing','fasteners']);
const svgNS='http://www.w3.org/2000/svg';
/** Two label rows keep all names readable while leaders follow the real geometry. */
export function createPartAnnotations(canvas,machine,words){
 const stage=canvas.closest('.machine-stage'),overlay=document.createElement('div');
 overlay.className='parts-annotations';overlay.hidden=true;
 const lines=document.createElementNS(svgNS,'svg');lines.setAttribute('aria-hidden','true');
 const list=document.createElement('ol');overlay.append(lines,list);stage.append(overlay);
 const entries=new Map(order.map((id,index)=>{
  const item=document.createElement('li'),number=document.createElement('b'),name=document.createElement('span');
  item.className='part-callout';item.dataset.part=id;item.style.top=topIds.has(id)?'7px':'auto';item.style.bottom=topIds.has(id)?'auto':'42px';number.textContent=String(index+1).padStart(2,'0');item.append(number,name);list.append(item);
  const path=document.createElementNS(svgNS,'path'),dot=document.createElementNS(svgNS,'circle');dot.setAttribute('r','1.8');lines.append(path,dot);
  return [id,{item,name,path,dot}];
 }));
 let width=0,height=0,active=false,language=null,layoutWidth=0;
 const observer=new ResizeObserver(()=>{width=canvas.clientWidth;height=canvas.clientHeight;update();});observer.observe(canvas);
 function update(){
  const amount=machine.expansion;
  active=active?amount>=.99:amount>=.997;
  overlay.hidden=!active;stage.dataset.annotated=String(active);
  if(!active||!width||!height)return;
  const copy=words();
  if(language!==copy){
   language=copy;layoutWidth=0;list.setAttribute('aria-label',copy.partsTitle);
   entries.forEach(({name},id)=>{name.textContent=copy.parts[id];});
  }
  if(layoutWidth!==width){
   entries.forEach(({item},id)=>{item.style.width=((width-16)/(topIds.has(id)?5:4)-6)+'px';});
   entries.forEach(entry=>{entry.height=entry.item.offsetHeight;});layoutWidth=width;
  }
  const anchors=machine.annotationAnchors(topIds);
  for(const top of [true,false]){
   const row=anchors.filter(p=>topIds.has(p.id)===top).sort((a,b)=>a.x-b.x);
   const cell=(width-16)/row.length;
   row.forEach((point,index)=>{
    const {item,path,dot,height:labelHeight}=entries.get(point.id),x=8+cell*(index+.5);
    item.style.transform=`translateX(${(x-(cell-6)/2).toFixed(1)}px)`;
    const y=top?7+labelHeight:height-42-labelHeight;
    const px=Math.max(5,Math.min(width-5,point.x*width)),py=point.y*height;
    const elbow=y+(top?9:-9);
    path.setAttribute('d',`M${x.toFixed(1)} ${y.toFixed(1)}V${elbow.toFixed(1)}L${px.toFixed(1)} ${py.toFixed(1)}`);
    dot.setAttribute('cx',px.toFixed(1));dot.setAttribute('cy',py.toFixed(1));
   });
  }
 }
 addEventListener('pagehide',()=>{observer.disconnect();overlay.remove();},{once:true});
 return {update};
}
