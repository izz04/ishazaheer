// A curved decal sheet in the portrait's own pixel coordinates. It is sampled
// inside the portrait shader, never positioned as a visible DOM overlay at rest.
// from the forehead down to the dress's neckline, so the chest can carry a sticker
export const SURFACE_RECT = [340,290,460,970];
// The eye line gives the portrait's skin tangent: it slopes down to screen-right.
export const SKIN_TILT = Math.atan2(49,189)*180/Math.PI;

// Arc-length cross-section: a flatter bridge, rounded folds down the sides,
// then the cheek planes. Integrating the normals preserves the logo's surface
// length while foreshortening the parts that turn away from the viewer.
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

// Measured on the portrait at the sticker's height (y ~ 534): the nose crest is a nearly
// vertical line at x ~ 627. The flat top of the ridge runs ~ 609-639; the wide, nearer side
// wall falls away on the left down to the cheek at ~ 566; the narrow far wall on the right
// meets the cheek at ~ 650. Distances below are from the crest, along the skin's horizontal.
export const NOSE_RIDGE_X=627;
const NEAR={fold:[10,40],cheek:[50,75]};   // left of the crest: a soft roll over the near side
// Right of the crest: fitted to the line Isha marked in tools/mark-nose.html (points
// (628,540) (636,544) (643,549) (650,556) (659,562) (668,565), within ~1 px (2 at the first),
// within ~2.5 px, with the sticker still ending at x ~ 684; refit with
// tools/fit-nose-profile.mjs <points> 685 30 650 0.8, which pins a 0.8 rad crease at x 650).
// The sticker rolls over the top of the nose and down its steep side, then folds sharply at
// her point 4 (650,556), about 46 degrees in one step, to lie flat on the cheek through
// (659,562) and (668,565). Each stage: [start, end, surface angle].
export const FAR_STAGES=[[0,19.6,.8],[40.8,43.1,0],[57.3,63.7,.03]];
// how strongly the far side moves down in the picture as it turns away; above 1 the bend
// can drop as far as marked without swallowing the last letters into it
export const FAR_DROP=1.74;
const noseArc=[[0,0]];
const farNoseArc=[[0,0]];
for(let i=1;i<=240;i++) {
  // The terminal cheek tangents remain shallow so the ends stay laid down.
  const s=i-.5,side=smooth(...NEAR.fold,s),cheek=smooth(...NEAR.cheek,s);
  const angle=.75*side*(1-cheek)+.20*cheek;
  noseArc.push([noseArc[i-1][0]+Math.cos(angle),noseArc[i-1][1]-Math.sin(angle)]);
  // Keep the far wing foreshortened: it turns away from the viewer.
  let farAngle=0,prev=0;
  for(const [s0,s1,ang] of FAR_STAGES){farAngle+=(ang-prev)*smooth(s0,s1,s);prev=ang;}
  farNoseArc.push([farNoseArc[i-1][0]+Math.cos(farAngle)*.84,farNoseArc[i-1][1]-Math.sin(farAngle)*FAR_DROP]);
}
// how far a point has stepped off the ridge onto the near wall (0 on the ridge, 1 on the
// wall); the far side's shape comes entirely from the fitted stages
const offRidge=s=>s>0?0:smooth(NEAR.fold[0],NEAR.cheek[0],-s);
export function noseProfile(s) {
  const d=Math.min(239.999,Math.abs(s)),i=Math.floor(d),t=d-i;
  const arc=s>0?farNoseArc:noseArc;
  return [(arc[i][0]+(arc[i+1][0]-arc[i][0])*t)*Math.sign(s),
    arc[i][1]+(arc[i+1][1]-arc[i][1])*t];
}

// Below the neck the skin is the chest: upright (it doesn't share the head's tilt) and facing
// the viewer, a broad cylinder around the middle of the body that only rolls away at the sides
// (the boarding pass sits here).
const CHEST_TOP=900, CHEST_X=590, CHEST_RADIUS=600;
function chestPoint(cx,cy,width,tilt,aspect,u,v) {
  const a=tilt*Math.PI/180, dx=(u-.5)*width, dy=(v-.5)*width*aspect;
  const x=dx*Math.cos(a)-dy*Math.sin(a), y=dx*Math.sin(a)+dy*Math.cos(a);
  const theta=Math.asin(Math.max(-.8,Math.min(.8,(cx-CHEST_X)/CHEST_RADIUS)));
  return [cx+CHEST_RADIUS*(Math.sin(theta+x/CHEST_RADIUS)-Math.sin(theta)),cy+y];
}

export function skinPoint([cx,cy,width], tilt, aspect, u, v) {
  if(cy>CHEST_TOP)return chestPoint(cx,cy,width,tilt,aspect,u,v);
  const head=SKIN_TILT*Math.PI/180, co=Math.cos(head),si=Math.sin(head);
  const a=(tilt-SKIN_TILT)*Math.PI/180, dx=(u-.5)*width, dy=(v-.5)*width*aspect;
  const x=dx*Math.cos(a)-dy*Math.sin(a), y=dx*Math.sin(a)+dy*Math.cos(a);
  const localX=(cx-600)*co+(cy-560)*si,localY=-(cx-600)*si+(cy-560)*co;
  const nose = Math.abs(localX)<40 && Math.abs(localY)<45;
  const radius=nose?78:235;
  const theta=Math.asin(Math.max(-.86,Math.min(.86,localX/radius)));
  const phi=localY/330*.6, vertical=330;
  let z=radius*(Math.cos(theta+x/radius)-Math.cos(theta));
  let px=radius*(Math.sin(theta+x/radius)-Math.sin(theta));
  let foldY=0,ridgeS=0;
  if(nose) {
    // Distance from the real nose crest, measured along the skin's horizontal at this row of
    // the sticker: the crest is a vertical line, so it depends on where the row sits.
    ridgeS=(cx-y*si-NOSE_RIDGE_X)/co;
    const origin=noseProfile(ridgeS),point=noseProfile(ridgeS+x);
    px=point[0]-origin[0];z=point[1]-origin[1];
    // Step down from the ridge onto each wall, then remain flat beyond it:
    // this makes a visible fold at the nose without turning up the free ends.
    foldY=6*(offRidge(ridgeS+x)-offRidge(ridgeS));
  }
  const taper=nose?1-.08*smooth(12,40,ridgeS+x):1;
  const py=vertical*(Math.sin(phi+y/vertical)-Math.sin(phi))*taper-z*(nose?.36:.24)+foldY;
  return [cx+px*co-py*si,cy+px*si+py*co];
}

function triangle(ctx,image,src,dst) {
  const [a,b,c]=src, [p,q,r]=dst;
  const det=(b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]);
  const ax=((q[0]-p[0])*(c[1]-a[1])-(r[0]-p[0])*(b[1]-a[1]))/det;
  const bx=((r[0]-p[0])*(b[0]-a[0])-(q[0]-p[0])*(c[0]-a[0]))/det;
  const ay=((q[1]-p[1])*(c[1]-a[1])-(r[1]-p[1])*(b[1]-a[1]))/det;
  const by=((r[1]-p[1])*(b[0]-a[0])-(q[1]-p[1])*(c[0]-a[0]))/det;
  const center=[(p[0]+q[0]+r[0])/3,(p[1]+q[1]+r[1])/3];
  ctx.save();ctx.beginPath();
  // Overlap the mesh clips by a fraction of a source pixel to avoid hairline seams.
  for(let i=0;i<3;i++) {
    const point=dst[i],dx=point[0]-center[0],dy=point[1]-center[1],d=Math.hypot(dx,dy);
    ctx[i?'lineTo':'moveTo'](point[0]+dx/d*.45,point[1]+dy/d*.45);
  }
  ctx.closePath();ctx.clip();
  ctx.transform(ax,ay,bx,by,p[0]-ax*a[0]-bx*a[1],p[1]-ay*a[0]-by*a[1]);
  ctx.drawImage(image,0,0);ctx.restore();
}

// The portrait shader lights every sticker by the skin under it (skinDecals in portrait-anim.js):
// shade = mix(1, clamp(lum/.65, .72, 1.08), .8), averaged over four samples 9 px out on the
// diagonals. That floor keeps stickers out of deep shadow. A sticker with `shadow` darkens
// exactly as much as the skin under it does compared with the lit forehead (luminance ~.7), into
// the hair's shadow at the temple: this map is the black that takes it from the shader's gentle
// shading to that one, drawn over its patch (the shader's shading then applies on top, as for
// every sticker).
const shade=(lum,floor,amount)=>1-amount+amount*Math.min(1.08,Math.max(floor,lum/.65));
const followSkin=lum=>Math.min(1.05,Math.max(.25,lum/.7));
// The skin luminance the shader sees at each pixel of SURFACE_RECT
const luminances=new WeakMap();
function skinLuminance(portrait) {
  if(luminances.has(portrait))return luminances.get(portrait);
  const [L,T,W,H]=SURFACE_RECT,pad=9;
  const src=document.createElement('canvas');src.width=W+2*pad;src.height=H+2*pad;
  const sg=src.getContext('2d',{willReadFrequently:true});sg.drawImage(portrait,pad-L,pad-T);
  const px=sg.getImageData(0,0,src.width,src.height).data;
  // premultiplied, like the shader's texture: transparent pixels count as black
  const SW=src.width,lum=new Float64Array(SW*src.height);
  for(let i=0;i<lum.length;i++)lum[i]=(.299*px[i*4]+.587*px[i*4+1]+.114*px[i*4+2])*px[i*4+3]/65025;
  const out=new Float32Array(W*H),d=2*pad;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++) {
    const i=y*SW+x;
    out[y*W+x]=(lum[i]+lum[i+d]+lum[i+d*SW]+lum[i+d*SW+d])/4;
  }
  luminances.set(portrait,out);return out;
}
// one value per pixel of SURFACE_RECT, as a canvas: f(luminance) -> [grey, alpha]
function surfaceMap(portrait,f) {
  const [,,W,H]=SURFACE_RECT,lum=skinLuminance(portrait);
  const out=document.createElement('canvas');out.width=W;out.height=H;
  const og=out.getContext('2d'),img=og.createImageData(W,H),data=img.data;
  for(let i=0;i<W*H;i++){const [v,a]=f(lum[i]);data[i*4]=data[i*4+1]=data[i*4+2]=v;data[i*4+3]=a;}
  og.putImageData(img,0,0);return out;
}
export function deepShadow(portrait) {
  return surfaceMap(portrait,l=>[0,Math.round(255*(1-Math.min(1,followSkin(l)/shade(l,.72,.8))))]);
}
// The lighting the face gives a sticker, as grey to multiply by: the shader's for most, the
// skin's own for `shadow` ones. Used for sharp close-ups, which the shader doesn't draw.
export function shadeMap(portrait,deep=false) {
  return surfaceMap(portrait,l=>[Math.round(255*Math.min(1,deep?followSkin(l):shade(l,.72,.8))),255]);
}

export function createSkinSurface() {
  const atlas=document.createElement('canvas');
  atlas.width=SURFACE_RECT[2];atlas.height=SURFACE_RECT[3];
  const ctx=atlas.getContext('2d'),entries=[];
  let dirty=true;
  return {
    get dirty(){return dirty;},
    // shadow: an optional deepShadow() map for a sticker that follows the skin into deep shadow
    add(canvas,face,tilt,heightScale=1,shadow=null) {
      const nx=24,ny=10,vertices=[];
      for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)vertices.push({
        src:[x/nx*canvas.width,y/ny*canvas.height],
        dst:skinPoint(face,tilt,canvas.height/canvas.width*heightScale,x/nx,y/ny),
      });
      const xs=vertices.map(p=>p.dst[0]),ys=vertices.map(p=>p.dst[1]);
      const left=Math.floor(Math.min(...xs))-2,top=Math.floor(Math.min(...ys))-2;
      const patch=document.createElement('canvas');
      patch.width=Math.ceil(Math.max(...xs))-left+2;patch.height=Math.ceil(Math.max(...ys))-top+2;
      const triangles=[];
      for(let y=0;y<ny;y++)for(let x=0;x<nx;x++) {
        const i=y*(nx+1)+x;
        for(const ids of [[i,i+1,i+nx+2],[i,i+nx+2,i+nx+1]])triangles.push({
          src:ids.map(k=>vertices[k].src),dst:ids.map(k=>[vertices[k].dst[0]-left,vertices[k].dst[1]-top]),
        });
      }
      const entry={canvas,patch,triangles,left,top,shadow,opacity:1,changed:true};
      entries.push(entry);dirty=true;return entry;
    },
    invalidate(entry){if(entry){entry.changed=true;dirty=true;}},
    // The entry's curved patch drawn k times finer than portrait pixels, lit by a shadeMap(),
    // for a sharp close-up of one sticker; it sits at (entry.left, entry.top) in the portrait.
    sharp(entry,k,lighting=null) {
      const out=document.createElement('canvas');
      out.width=Math.ceil(entry.patch.width*k);out.height=Math.ceil(entry.patch.height*k);
      const g=out.getContext('2d');
      for(const t of entry.triangles)triangle(g,entry.canvas,t.src,t.dst.map(([x,y])=>[x*k,y*k]));
      if(lighting) {
        const art=document.createElement('canvas');art.width=out.width;art.height=out.height;
        art.getContext('2d').drawImage(out,0,0);
        g.globalCompositeOperation='multiply';
        g.drawImage(lighting,(SURFACE_RECT[0]-entry.left)*k,(SURFACE_RECT[1]-entry.top)*k,SURFACE_RECT[2]*k,SURFACE_RECT[3]*k);
        g.globalCompositeOperation='destination-in';g.drawImage(art,0,0);
        g.globalCompositeOperation='source-over';
      }
      return out;
    },
    opacity(entry,value){if(entry.opacity!==value){entry.opacity=value;dirty=true;}},
    render() {
      ctx.clearRect(0,0,atlas.width,atlas.height);
      for(const e of entries) {
        if(e.changed) {
          const g=e.patch.getContext('2d');g.clearRect(0,0,e.patch.width,e.patch.height);
          for(const t of e.triangles)triangle(g,e.canvas,t.src,t.dst);
          // source-atop darkens the artwork and keeps its own outline
          if(e.shadow) {
            g.globalCompositeOperation='source-atop';
            g.drawImage(e.shadow,SURFACE_RECT[0]-e.left,SURFACE_RECT[1]-e.top);
            g.globalCompositeOperation='source-over';
          }
          e.changed=false;
        }
        ctx.globalAlpha=e.opacity;
        ctx.drawImage(e.patch,e.left-SURFACE_RECT[0],e.top-SURFACE_RECT[1]);
      }
      ctx.globalAlpha=1;dirty=false;return atlas;
    },
  };
}
