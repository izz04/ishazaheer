import * as T from './vendor/three.module.js';
import {createRing,at,R_IN,R_OUT,ROOM,DOOR,DOOR_R,ENTRANCE} from './ring.js';
import {createAvatar} from './avatar/avatar.js';
import {createViewer} from './sculpture.js';

const $=s=>document.querySelector(s);
// inside the portfolio site the gallery lives in its gallery/ folder, so the way back is one folder up, at the Artist stop
const PORTFOLIO=location.pathname.includes('/gallery/')?'../#artist':'https://izz04.github.io/ishazaheer/#artist';
const touch=matchMedia('(pointer:coarse)').matches;document.body.classList.toggle('touch',touch);
// leaving for the portfolio: the screen dims to dark first, so the two sites feel like one
function leave(){document.body.classList.add('leaving');setTimeout(()=>location.href=PORTFOLIO,360)}
window.addEventListener('pageshow',()=>document.body.classList.remove('leaving'));
for(const link of document.querySelectorAll('a.portfolio')){link.href=PORTFOLIO;link.onclick=e=>{e.preventDefault();e.stopPropagation();leave()}}
// eight rooms, each with its works: { id, title, caption, works: [{ id, title, caption, image, sculpture }] }
const {rooms}=await fetch('collection/index.json').then(r=>r.json());
const works=rooms.flatMap(room=>room.works.map(work=>({...work,room})));
const byId=new Map(works.map(w=>[w.id,w]));
const scene=new T.Scene();
const camera=new T.PerspectiveCamera(52,1,.04,85);
const canvas=$('#scene'), pad=[...document.querySelectorAll('.pad button')];
let renderer,avatar,ring,selected=null,nearest=null,path=[],menu=false;
// heading: the way the character faces, as a turn about the vertical (0 looks along +z); the camera sits behind it
const along=a=>Math.atan2(-Math.cos(a),-Math.sin(a)),outward=a=>Math.atan2(-Math.sin(a),Math.cos(a));
let lastTime=0,toastTimer,heading=along(ENTRANCE),cameraYaw=heading,cameraBack=5.2,wasBack=false;
const pressed=new Set(),position=new T.Vector3();
const ray=new T.Raycaster(),ground=new T.Plane(new T.Vector3(0,1,0),0);
const pendingPointer=new Map();
// a work with a sculpture shows it in the round beside its picture
const viewer=createViewer(T,$('.model'));
const TAU=2*Math.PI,wrap=a=>((a%TAU)+TAU)%TAU,turn=a=>Math.atan2(Math.sin(a),Math.cos(a));
const angleOf=p=>wrap(Math.atan2(-p.x,p.z)),radiusOf=p=>Math.hypot(p.x,p.z);
const roomAt=p=>Math.min(7,Math.floor(angleOf(p)/ROOM));
function place(a,r){const [x,z]=at(a,r);position.set(x,0,z);heading=along(a);path=[]}
function notice(message){
  $('#notice').textContent=message;$('#notice').hidden=false;clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>$('#notice').hidden=true,2300);
}
function setMenu(open){
  menu=open;pressed.clear();path=[];$('#menu').hidden=!open;
  document.body.classList.toggle('menu-open',open);
  $('#menuButton').textContent=open?'Close':'Menu';
  $('#menuButton').setAttribute('aria-expanded',String(open));
  if(open){$('#menu a').focus({preventScroll:true});}
  else if(!selected)canvas.focus({preventScroll:true});
}
$('#menuButton').onclick=$('#menuHint').onclick=()=>setMenu(!menu);
function list(){
  const q=$('.search input').value.toLowerCase().trim();
  const links=$('#links');links.replaceChildren();
  for(const room of rooms){
    const found=room.works.filter(w=>(w.title+' '+room.title).toLowerCase().includes(q));
    if(!found.length)continue;
    const head=document.createElement('a');head.href='#room/'+room.id;head.className='room';head.textContent=room.id+' · '+room.title;links.append(head);
    for(const w of found){const a=document.createElement('a');a.href='#frame/'+w.id;a.textContent=w.title;links.append(a)}
  }
  if(!links.childElementCount)links.textContent='No matching artworks';
}
$('.search input').oninput=list;list();
$('#menu').addEventListener('click',e=>{if(e.target.closest('a'))setMenu(false)});
function go(hash){if(location.hash===hash){route();return}location.hash=hash}
function inspect(){
  if(nearest?.exit){leave();return}
  if(nearest){go('#frame/'+nearest.id);return}
  notice('Walk to a floor circle to see an artwork.');
}
$('#inspect').onclick=$('#near').onclick=inspect;
function stepFrame(step){const i=works.findIndex(w=>w.id===selected);go('#frame/'+works[(i+step+works.length)%works.length].id)}
$('.prev').onclick=()=>stepFrame(-1);$('.next').onclick=()=>stepFrame(1);
$('.return').onclick=()=>go('#room/'+rooms[roomAt(position)].id);
// on a touch screen, a sideways swipe across an artwork goes to the next or the one before
{let from=null;const detail=$('#detail');
  detail.addEventListener('touchstart',e=>{from=e.touches.length===1&&!e.target.closest('.model')?[e.touches[0].clientX,e.touches[0].clientY]:null},{passive:true});
  detail.addEventListener('touchend',e=>{if(!from)return;const t=e.changedTouches[0],dx=t.clientX-from[0],dy=t.clientY-from[1];from=null;if(Math.abs(dx)>60&&Math.abs(dx)>2*Math.abs(dy))stepFrame(dx<0?1:-1)},{passive:true});}
function route(){
  const hash=location.hash.slice(1);const id=hash.startsWith('frame/')?decodeURIComponent(hash.slice(6)):null;
  pressed.clear();path=[];setMenu(false);
  if(byId.has(id)){
    const work=byId.get(id);
    // arriving by link or menu: stand in front of the work, so returning puts you in its room
    const station=ring?.stations.find(s=>s.id===id);
    if(station&&Math.hypot(station.x-position.x,station.z-position.z)>1.2){position.set(station.x,0,station.z);heading=outward(station.angle);cameraFollow(1,true)}
    selected=id;$('.caption h1').textContent=work.title;
    $('.caption .where').textContent=work.room.id+' · '+work.room.title;
    $('.caption .text').textContent=work.caption||(work.image?'':'Reserved frame');
    const picture=$('.exhibit img');picture.hidden=!work.image;$('.exhibit').classList.toggle('framed',!!work.image);$('.blank').hidden=!!work.image;
    if(work.image){picture.src=work.image;picture.alt=work.title}else picture.removeAttribute('src');
    $('#detail').classList.toggle('with-model',!!work.sculpture);
    document.title=work.title+' | Isha Zaheer';$('#detail').hidden=false;
    if(work.sculpture)viewer.show(work.sculpture);else viewer.hide();
    $('#stage').inert=true;$('#controls').hidden=true;$('#near').hidden=true;$('#plan').hidden=true;
    $('.return').focus({preventScroll:true});
  }else{
    const wasOpen=selected!==null;selected=null;$('#detail').hidden=true;viewer.hide();
    $('#stage').inert=false;$('#controls').hidden=false;$('#plan').hidden=false;
    const k=hash.startsWith('room/')?rooms.findIndex(r=>r.id===hash.slice(5)):-1;
    // a room link steps in through that room's doorway, unless you are already in the room
    if(k>=0){if(!wasOpen&&roomAt(position)!==k||position.lengthSq()===0)place(k?k*ROOM+.16:ENTRANCE,k?DOOR_R:R_OUT-2.6)}
    else place(ENTRANCE,R_OUT-2.6);
    if(avatar)cameraFollow(1,true);
    document.title=(k>=0?rooms[k].title:'Gallery')+' | Isha Zaheer';
    canvas.focus({preventScroll:true});
  }
}
window.addEventListener('hashchange',route);
const aliases={w:'ArrowUp',s:'ArrowDown',a:'ArrowLeft',d:'ArrowRight'};
const arrows=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();if(e.repeat)return;if(selected&&!menu)$('.return').click();else setMenu(!menu);return}
  if(menu||e.target.matches('input'))return;
  const key=aliases[e.key.toLowerCase()]||e.key;
  if(selected){if(key==='ArrowLeft'||key==='ArrowRight'){e.preventDefault();stepFrame(key==='ArrowLeft'?-1:1)}return}
  if(arrows.includes(key)){e.preventDefault();pressed.add(key);path=[];}
  if(key==='Enter'&&!e.repeat&&(e.target===canvas||e.target===document.body)){e.preventDefault();inspect()}
});
document.addEventListener('keyup',e=>pressed.delete(aliases[e.key.toLowerCase()]||e.key));
function release(){pressed.clear();pendingPointer.clear();pad.forEach(b=>b.classList.remove('active'))}
window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);
for(const button of pad){
  button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);pressed.add(button.dataset.key);path=[]};
  button.onpointerup=button.onlostpointercapture=()=>pressed.delete(button.dataset.key);
}
function pointerRay(e){
  const rect=canvas.getBoundingClientRect();
  ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);
}
// what the pointer is on, nearest first: a wall that is in the way hides what is behind it
function pick(){
  const solid=[...ring.walls.filter(w=>w.group.visible).map(w=>w.group),...ring.stations.flatMap(s=>[s.frame,s.ring]),...ring.portals.map(p=>p.door)];
  const hit=ray.intersectObjects(solid,true)[0];
  if(!hit)return null;
  let o=hit.object;
  while(o&&!o.userData.stationId&&!o.userData.portal)o=o.parent;
  if(!o)return {blocked:true};
  return o.userData.portal?ring.portals.find(p=>p.name===o.userData.portal):ring.stations.find(s=>s.id===o.userData.stationId);
}
// Walk to a point: straight there inside a room, otherwise through each doorway on the shorter way round.
function walkTo(x,z,id){
  const goal=new T.Vector3(x,0,z),from=roomAt(position),to=roomAt(goal),ahead=(to-from+8)%8,steps=[];
  if(ahead&&ahead<=4)for(let i=1;i<=ahead;i++)steps.push((from+i)%8);
  else if(ahead)for(let i=0;i<8-ahead;i++)steps.push((from-i+8)%8);
  path=steps.map(k=>{const [dx,dz]=at(k*ROOM,DOOR_R);return {x:dx,z:dz}});
  path.push({x:goal.x,z:goal.z,id});
}
// a press that moves is a look around: dragging sideways turns her, and the camera follows
canvas.onpointerdown=e=>{pendingPointer.set(e.pointerId,[e.clientX,e.clientY,e.clientX,false]);canvas.setPointerCapture?.(e.pointerId)};
canvas.onpointercancel=e=>pendingPointer.delete(e.pointerId);
canvas.onpointerup=e=>{
  const start=pendingPointer.get(e.pointerId);pendingPointer.delete(e.pointerId);
  if(!start||start[3]||Math.hypot(e.clientX-start[0],e.clientY-start[1])>18||!renderer)return;
  pointerRay(e);const target=pick();
  if(target?.id){if(nearest?.id===target.id)inspect();else walkTo(target.x,target.z,target.id);return}
  if(target?.name){walkTo(target.x,target.z);return}
  const point=ray.ray.intersectPlane(ground,new T.Vector3());
  if(point&&radiusOf(point)<R_OUT+6){bound(point,point);walkTo(point.x,point.z)}
};
canvas.onpointermove=e=>{
  const drag=pendingPointer.get(e.pointerId);
  if(drag&&(drag[3]||Math.abs(e.clientX-drag[0])>12)){if(!drag[3]){drag[3]=true;drag[2]=e.clientX;path=[]}heading+=(e.clientX-drag[2])*Math.min(.009,3.4/innerWidth);drag[2]=e.clientX;return}
  if(!renderer||e.pointerType==='touch')return;pointerRay(e);const t=pick();canvas.style.cursor=t&&!t.blocked?'pointer':'default'};
// Keep a point inside the rooms: off the outer wall and the courtyard glazing, around the benches,
// and through the walls between rooms only at their doorways. `from` is where it was a moment ago.
function bound(p,from){
  let r=T.MathUtils.clamp(radiusOf(p),R_IN+.75,R_OUT-.75),a=angleOf(p);
  if(r<DOOR[0]+.4||r>DOOR[1]-.4){
    const clear=Math.asin(.52/r);
    for(let k=0;k<8;k++){
      const gap=turn(a-k*ROOM);
      if(Math.abs(gap)<clear){const side=turn(angleOf(from)-k*ROOM);a=k*ROOM+(side<0?-clear:clear);r+=Math.sign(DOOR_R-r)*.07;break}
    }
  }
  const [x,z]=at(a,r);p.x=x;p.z=z;
  for(const bench of ring?.benches??[]){
    const dx=p.x-bench.x,dz=p.z-bench.z,d=Math.hypot(dx,dz);
    if(d<bench.radius&&d>0){p.x=bench.x+dx/d*bench.radius;p.z=bench.z+dz/d*bench.radius}
  }
  return p;
}
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=96;
const ctx=shadowCanvas.getContext('2d');const grad=ctx.createRadialGradient(48,48,0,48,48,46);grad.addColorStop(0,'rgba(33,30,30,.42)');grad.addColorStop(.44,'rgba(50,48,48,.21)');grad.addColorStop(1,'rgba(63,60,60,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,96,96);
const shadow=new T.Mesh(new T.PlaneGeometry(1.22,.64),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;
// does the straight line between two floor points pass through the solid part of a wall between rooms?
function crosses(ax,az,bx,bz,angle){
  const ox=-Math.sin(angle),oz=Math.cos(angle),side=(x,z)=>x*oz-z*ox,sa=side(ax,az),sb=side(bx,bz);
  if(sa*sb>=0)return false;
  const t=sa/(sa-sb),r=(ax+(bx-ax)*t)*ox+(az+(bz-az)*t)*oz;
  return r>R_IN-.3&&r<R_OUT&&(r<DOOR[0]+.2||r>DOOR[1]-.2);
}
// The camera stays behind the character and looks where she looks, swinging round as she turns.
// It pulls in rather than leave through the outer wall, and a wall between it and her is taken away.
function cameraFollow(dt,snap=false){
  const ease=snap?1:1-Math.exp(-4.2*dt),p=position;
  cameraYaw+=turn(heading-cameraYaw)*ease;
  const fx=Math.sin(cameraYaw),fz=Math.cos(cameraYaw);
  let back=1.2;
  while(back<5.2&&Math.hypot(p.x-fx*(back+.25),p.z-fz*(back+.25))<R_OUT-.45)back+=.25;
  cameraBack+=(back-cameraBack)*(snap?1:1-Math.exp(-7*dt));
  const cx=p.x-fx*cameraBack,cz=p.z-fz*cameraBack;
  // pulled in close, it rises and tips down so she stays in view
  const near=5.2-cameraBack;
  camera.position.set(cx,3.2+near*.3,cz);camera.lookAt(p.x+fx*3.2,2.1-near*.34,p.z+fz*3.2);
  for(const w of ring.walls)w.group.visible=!crosses(cx,cz,p.x+fx*.4,p.z+fz*.4,w.angle);
}
const plan=$('#plan');
function drawPlan(){
  const s=5,parts=[`<circle r="${R_OUT*s}" class="shell"/>`,`<circle r="${R_IN*s}" class="yard"/>`,'<circle r="7" class="tree"/>'];
  for(let k=0;k<8;k++){
    const a=k*ROOM,[x1,z1]=at(a,R_IN),[x2,z2]=at(a,DOOR[0]),[x3,z3]=at(a,DOOR[1]),[x4,z4]=at(a,R_OUT);
    parts.push(`<path d="M${x1*s} ${z1*s}L${x2*s} ${z2*s}M${x3*s} ${z3*s}L${x4*s} ${z4*s}" class="wall"/>`);
    const [tx,tz]=at(a+ROOM/2,DOOR_R);
    parts.push(`<a href="#room/${rooms[k].id}" aria-label="${rooms[k].title}"><circle cx="${tx*s}" cy="${tz*s}" r="15" class="hit"/><text x="${tx*s}" y="${tz*s}">${rooms[k].id}</text></a>`);
  }
  plan.innerHTML=`<svg viewBox="-100 -100 200 200" role="img" aria-label="Plan of the eight rooms">${parts.join('')}<circle r="4.5" class="you"/></svg>`;
}
drawPlan();
function update(dt){
  const p=position;let dx=0,dz=0,arriving=false;
  // Left and right turn her, up walks the way she faces, and down turns her round and walks back.
  const back=pressed.has('ArrowDown');
  if(back&&!wasBack)heading+=Math.PI;
  wasBack=back;
  heading+=((pressed.has('ArrowLeft')?1:0)-(pressed.has('ArrowRight')?1:0))*2.1*dt;
  if(back||pressed.has('ArrowUp')){dx=Math.sin(heading);dz=Math.cos(heading)}
  if(path.length){
    dx=path[0].x-p.x;dz=path[0].z-p.z;arriving=path.length===1;
    if(Math.hypot(dx,dz)<(arriving?.08:.3)){const {id}=path.shift();dx=dz=0;if(id)go('#frame/'+id)}
  }
  const magnitude=Math.hypot(dx,dz);let walking=false;
  if(magnitude>.001){
    const step=Math.min(3.9*dt,arriving?magnitude:Infinity);
    const old=p.clone();p.x+=dx/magnitude*step;p.z+=dz/magnitude*step;bound(p,old);
    walking=old.distanceTo(p)>.001;
    if(path.length&&!walking)path=[];
    if(path.length)heading=Math.atan2(dx,dz);
  }
  avatar.object.rotation.y+=turn(heading-avatar.object.rotation.y)*(1-Math.exp(-14*dt));
  avatar.object.position.copy(p);avatar.update(dt,walking);shadow.position.set(p.x,.018,p.z);shadow.rotation.z=cameraYaw;
  cameraFollow(dt);
  nearest=ring.stations.find(s=>Math.hypot(s.x-p.x,s.z-p.z)<1.18)??null;
  const exit=ring.portals.find(p=>p.name==='exit');
  if(!nearest&&Math.hypot(exit.x-p.x,exit.z-p.z)<1.4)nearest={exit:true};
  $('#near').hidden=!nearest;
  if(nearest)$('#near').textContent=(nearest.exit?'Exit to Isha’s portfolio':byId.get(nearest.id).title+' · See details')+(touch?'':' ↵');
  for(const b of pad)b.classList.toggle('active',pressed.has(b.dataset.key));
  const dot=plan.querySelector('.you');dot.setAttribute('cx',p.x*5);dot.setAttribute('cy',p.z*5);
  const here=roomAt(p);plan.querySelectorAll('a').forEach((link,k)=>link.classList.toggle('here',k===here));
}
function resize(){
  renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;
  camera.fov=innerWidth<innerHeight?72:54;camera.updateProjectionMatrix();
}
try{
  renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,touch?1.5:1.75));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  scene.background=new T.Color('#e4e9e8');
  ring=createRing(T,scene,rooms);
  avatar=createAvatar(T);avatar.object.rotation.y=heading;
  scene.add(avatar.object,shadow);
  route();resize();window.addEventListener('resize',resize);
  renderer.setAnimationLoop(time=>{
    const dt=Math.min((time-lastTime)/1000,.06);lastTime=time;
    if(menu||selected||document.hidden)return;
    update(dt);ring.sky.update(dt);renderer.render(scene,camera);
  });setTimeout(()=>$('#loading').classList.add('done'),Math.max(0,1300-performance.now()));
}catch(error){
  console.error(error);$('#loading').hidden=true;route();setMenu(true);
  notice('3D rendering is unavailable in this browser. Browse the artworks in the menu.');
}
