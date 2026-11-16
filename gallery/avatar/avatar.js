import {profiles} from './profiles.js';

export function createAvatar(T) {
  const object = new T.Group(), puppet = new T.Group(), limbs = {};
  object.add(puppet);
  const loader = new T.TextureLoader();
  const maps = ['front','back','profile'].map(name => {
    const t = loader.load(new URL(name + '.webp', import.meta.url).href);
    t.anisotropy = 4;
    return t;
  });
  // Choose a registered projection for the viewing direction. Blending by
  // surface longitude would paint the profile's ear over both front cheeks.
  const material = new T.ShaderMaterial({
    side: T.DoubleSide,
    uniforms: {front:{value:maps[0]},rear:{value:maps[1]},profile:{value:maps[2]}},
    vertexShader: `attribute vec4 ring; attribute vec2 frontSpan;
      attribute vec2 backSpan; attribute vec2 profileSpan; attribute float sideRow;
      varying vec3 coords; varying float facing; varying float row;
      varying float profileRow;
      void main(){row=uv.y; profileRow=sideRow;
      vec2 horizontal=normalize(vec2(modelViewMatrix[0].x,modelViewMatrix[2].x));
      facing=horizontal.x;
      float extent=length(horizontal*ring.zw);
      float screenX=clamp(dot(horizontal,position.xz-ring.xy)/max(extent,.00001),-1.,1.);
      float f=.5+.5*screenX;
      float s=.5+.5*screenX*sign(horizontal.y);
      coords=vec3(mix(frontSpan.x,frontSpan.y,f),mix(backSpan.x,backSpan.y,f),
        mix(profileSpan.x,profileSpan.y,s));
      vec2 selectedSpan=profileSpan;
      float mirror=sign(horizontal.y);
      if(abs(facing)>=.82){selectedSpan=facing>0.?frontSpan:backSpan;mirror=1.;}
      float center=(.5*(selectedSpan.x+selectedSpan.y)*488.-244.)*(1.48/1131.)*mirror;
      float radius=.5*(selectedSpan.y-selectedSpan.x)*488.*(1.48/1131.);
      vec4 viewPosition=modelViewMatrix*vec4(position,1.);
      viewPosition.x=modelViewMatrix[3].x+center+screenX*radius;
      gl_Position=projectionMatrix*viewPosition;}`,
    fragmentShader: `uniform sampler2D front,rear,profile;
      varying vec3 coords; varying float facing; varying float row;
      varying float profileRow;
      void main(){vec3 f=texture2D(front,vec2(coords.x,row)).rgb;
      vec3 r=texture2D(rear,vec2(coords.y,row)).rgb;
      vec3 s=texture2D(profile,vec2(coords.z,profileRow)).rgb;
      float w=step(.82,abs(facing));
      gl_FragColor=vec4(mix(s,mix(r,f,step(0.,facing)),w),1.);}`
  });
  const unit=1.48/1131, sectors=64;
  for(const [name,rows] of Object.entries(profiles)){
    const positions=[],rings=[],frontSpans=[],backSpans=[],profileSpans=[],sideRows=[],uv=[],indices=[];
    const pivot=(1133-rows[0][0])*unit;
    for(const [i,[y,l,r,b0,b1,s0,s1]] of rows.entries()){
      for(let j=0;j<=sectors;j++){
        const a=j*Math.PI*2/sectors, x=Math.sin(a), z=Math.cos(a);
        const fx=(l+r+(r-l)*x)*.5, sx=(s0+s1+(s1-s0)*z)*.5;
        positions.push((fx-244)*unit,(1133-y)*unit-pivot,(sx-244)*unit);
        rings.push(((l+r)*.5-244)*unit,((s0+s1)*.5-244)*unit,(r-l)*.5*unit,(s1-s0)*.5*unit);
        frontSpans.push(l/488,r/488);backSpans.push(b0/488,b1/488);profileSpans.push(s0/488,s1/488);
        // The side photograph's hand covers the thigh. Sample unobstructed
        // denim below it when texturing that portion of either trouser leg.
        const sideY=name.endsWith('Leg') && y<800 ? 800 : y;
        sideRows.push(1-sideY/1136);uv.push(0,1-y/1136);
        if(i && j){const k=i*(sectors+1)+j;indices.push(k-sectors-2,k-1,k,k-sectors-2,k,k-sectors-1);}
      }
    }
    for(const last of [false,true]){
      const k=last?(rows.length-1)*(sectors+1):0;
      for(let j=1;j<sectors-1;j++)indices.push(k,k+j,k+j+1);
    }
    const geo=new T.BufferGeometry();
    for(const [key,data,size] of [['position',positions,3],['ring',rings,4],
      ['frontSpan',frontSpans,2],['backSpan',backSpans,2],['profileSpan',profileSpans,2],
      ['sideRow',sideRows,1],['uv',uv,2]]) geo.setAttribute(key,new T.Float32BufferAttribute(data,size));
    geo.setIndex(indices);
    const joint=new T.Group(); joint.position.y=pivot; joint.add(new T.Mesh(geo,material)); puppet.add(joint); limbs[name]=joint;
  }
  let phase=0, strength=0;
  return {object, update(dt,moving){
    strength+=(Number(moving)-strength)*(1-Math.exp(-13*dt));
    phase+=dt*10; const swing=Math.sin(phase)*strength;
    limbs.leftLeg.rotation.x=.38*swing;limbs.rightLeg.rotation.x=-.38*swing;
    limbs.leftArm.rotation.x=-.25*swing;limbs.rightArm.rotation.x=.25*swing;
    puppet.position.y=Math.abs(Math.sin(phase))*.028*strength;
    puppet.rotation.z=.016*swing;
  }};
}
