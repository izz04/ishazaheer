import { createSky } from './sky.js';
import { createGarden } from './sculpture.js';
// The circular gallery: eight rooms in a ring around a glazed courtyard, walked as one loop.
// Plan angle `a` starts at the wall between rooms 08 and 01 and grows in the direction of the
// loop (01 → 02 → … → 08); room k spans a = k·45° … (k+1)·45°.
export const R_IN = 9;            // courtyard glazing
export const R_OUT = 19;          // outer wall, where the artworks hang
export const HEIGHT = 7;
export const ROOM = Math.PI / 4;
export const DOOR = [12, 16];     // the opening in each wall between rooms, as radii
export const DOOR_R = (DOOR[0] + DOOR[1]) / 2;
export const ENTRANCE = ROOM * 0.22;          // where the walk starts, in room 01
export const EXIT = 2 * Math.PI - ROOM * 0.82; // in room 08's outer wall
const DOOR_HEAD = 4.9;
const WALL_THICK = 0.34;
const PORTAL_HALF = 0.105;        // half the angle the exit takes from the outer wall

// plan position of (angle, radius): outward is (-sin a, cos a), the loop runs along (-cos a, -sin a)
export const at = (a, r) => [-r * Math.sin(a), r * Math.cos(a)];

function makeCanvas(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  return canvas;
}

function surfaceGrain(context, width, height, strength) {
  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;
  let seed = 79;
  for (let i = 0; i < pixels.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const delta = ((seed >>> 24) / 255 - 0.5) * strength;
    pixels[i] += delta;
    pixels[i + 1] += delta;
    pixels[i + 2] += delta;
  }
  context.putImageData(image, 0, 0);
}

function plaster() {
  return makeCanvas(256, 512, (c, w, h) => {
    const wash = c.createLinearGradient(0, 0, 0, h);
    wash.addColorStop(0, '#bab9b7');
    wash.addColorStop(0.14, '#d6d5d3');
    wash.addColorStop(0.5, '#e6e5e2');
    wash.addColorStop(0.9, '#d6d5d2');
    wash.addColorStop(1, '#bcbbb8');
    c.fillStyle = wash;
    c.fillRect(0, 0, w, h);
    surfaceGrain(c, w, h, 5);
  });
}

function floorFinish() {
  // RingGeometry maps its bounding square onto the texture, so the slab is painted in plan
  return makeCanvas(1536, 1536, (c, w) => {
    const mid = w / 2, scale = mid / R_OUT;
    const wash = c.createRadialGradient(mid, mid, R_IN * scale, mid, mid, R_OUT * scale);
    wash.addColorStop(0, '#d3d2cf');
    wash.addColorStop(0.1, '#e3e2df');
    wash.addColorStop(0.5, '#e8e7e4');
    wash.addColorStop(0.9, '#e1e0dd');
    wash.addColorStop(1, '#cfcecb');
    c.fillStyle = wash;
    c.fillRect(0, 0, w, w);
    c.strokeStyle = 'rgba(105,103,99,.075)';
    c.lineWidth = 1.4;
    for (const r of [11.5, 14, 16.5]) {
      c.beginPath();
      c.arc(mid, mid, r * scale, 0, 2 * Math.PI);
      c.stroke();
    }
    for (let i = 0; i < 48; i++) {
      const a = i * Math.PI / 24;
      c.beginPath();
      c.moveTo(mid + Math.cos(a) * R_IN * scale, mid + Math.sin(a) * R_IN * scale);
      c.lineTo(mid + Math.cos(a) * R_OUT * scale, mid + Math.sin(a) * R_OUT * scale);
      c.stroke();
    }
    surfaceGrain(c, w, w, 3.1);
  });
}

function makePaper() {
  return makeCanvas(384, 640, (c, w, h) => {
    const ivory = c.createLinearGradient(0, 0, w * .6, h);
    ivory.addColorStop(0, '#eeede9');
    ivory.addColorStop(0.45, '#e7e6e1');
    ivory.addColorStop(1, '#dfded9');
    c.fillStyle = ivory;
    c.fillRect(0, 0, w, h);
    surfaceGrain(c, w, h, 3.8);
  });
}

// the sign over a doorway: the number of the room it leads to, and that room's title
function lintelSign(number, title) {
  return makeCanvas(1024, 400, (c, w, h) => {
    c.fillStyle = '#222120';
    c.textBaseline = 'middle';
    c.font = 'bold 190px Georgia, serif';
    c.fillText(number, 60, h * .5);
    const x = 60 + c.measureText(number).width + 46;
    c.fillRect(x, h * .22, 3, h * .56);
    let size = 64;
    c.font = size + 'px Georgia, serif';
    while (size > 30 && c.measureText(title).width > w - x - 90) c.font = --size + 'px Georgia, serif';
    c.fillText(title, x + 40, h * .5);
  });
}

function portalSign(text) {
  return makeCanvas(768, 160, (c, w, h) => {
    c.fillStyle = '#222120';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = 'bold 76px Arial, sans-serif';
    c.fillText(text.split('').join('  '), w / 2, h / 2);
  });
}

function daylight() {
  return makeCanvas(256, 512, (c, w, h) => {
    const glow = c.createLinearGradient(0, 0, 0, h);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.7, '#f6f8f6');
    glow.addColorStop(1, '#e4e8e2');
    c.fillStyle = glow;
    c.fillRect(0, 0, w, h);
  });
}

// rooms: [{ id, title, works: [{ id, title, image }] }] from collection/index.json
export function createRing(THREE, scene, rooms) {
  const building = new THREE.Group();
  building.name = 'Circular gallery';
  scene.add(building);

  const basic = parameters => new THREE.MeshBasicMaterial({ toneMapped: false, ...parameters });
  function painted(canvas, parameters = {}) {
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    return basic({ map, ...parameters });
  }
  function addMesh(parent, geometry, material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function box(parent, material, w, h, d, x, y, z) {
    const mesh = addMesh(parent, cube, material, x, y, z);
    mesh.scale.set(w, h, d);
    return mesh;
  }
  // a group standing at (a, r) whose local +Z points back to the centre and +X along the loop
  function facingIn(a, r, y = 0) {
    const group = new THREE.Group();
    const [x, z] = at(a, r);
    group.position.set(x, y, z);
    group.rotation.y = Math.PI - a;
    building.add(group);
    return group;
  }

  const plasterMap = plaster();
  const wallMaterial = painted(plasterMap, { side: THREE.BackSide });
  wallMaterial.map.wrapS = THREE.RepeatWrapping;
  wallMaterial.map.repeat.x = 24;
  const steel = basic({ color: 0x191918 });
  const frameBlack = basic({ color: 0x141413 });
  const bevel = basic({ color: 0x292927 });
  const mount = basic({ color: 0xf8f7f3 });
  const fineEdge = basic({ color: 0xc9c8c2 });
  const paper = painted(makePaper());

  // floor, ceiling and the outer wall
  const floor = addMesh(building, new THREE.RingGeometry(R_IN - .2, R_OUT, 128, 1), painted(floorFinish()));
  floor.rotation.x = -Math.PI / 2;
  const ceiling = addMesh(building, new THREE.RingGeometry(R_IN - .2, R_OUT, 128, 1), basic({ color: 0xc6c5c2 }), 0, HEIGHT, 0);
  ceiling.rotation.x = Math.PI / 2;
  addMesh(building, new THREE.CylinderGeometry(R_OUT, R_OUT, HEIGHT, 160, 1, true), wallMaterial, 0, HEIGHT / 2, 0);
  // a lighting track follows the loop above the middle of the rooms
  const track = addMesh(building, new THREE.TorusGeometry(15.4, .07, 6, 160), steel, 0, HEIGHT - .32, 0);
  track.rotation.x = Math.PI / 2;
  // one spotlight per artwork, aimed at it from the track (they are placed with the frames below)
  const lampBody = new THREE.CylinderGeometry(.1, .145, .44, 12);
  const lampLens = new THREE.CircleGeometry(.125, 16);
  const lensGlow = basic({ color: 0xfff6dc });
  // The light a lamp leaves on the wall: a thin soft halo hugging its frame (w x h), nothing wider.
  const SPILL = .5;
  function halo(w, h) {
    const px = 64;
    return painted(makeCanvas(Math.round((w + 2 * SPILL) * px), Math.round((h + 2 * SPILL) * px), c => {
      c.filter = 'blur(' + .15 * px + 'px)';
      c.fillStyle = 'rgba(255,249,234,.85)';
      c.fillRect((SPILL - .04) * px, (SPILL - .04) * px, (w + .08) * px, (h + .08) * px);
    }), { transparent: true, depthWrite: false });
  }
  const down = new THREE.Vector3(0, -1, 0);

  // the courtyard: a low parapet, glazing between slim posts, and a tree in a round bed
  const glassRadius = R_IN - .08;
  addMesh(building, new THREE.CylinderGeometry(glassRadius, glassRadius, .55, 96, 1, true), basic({ color: 0x2a2a28, side: THREE.DoubleSide }), 0, .275, 0);
  addMesh(building, new THREE.CylinderGeometry(glassRadius, glassRadius, .3, 96, 1, true), basic({ color: 0x1d1d1b, side: THREE.DoubleSide }), 0, HEIGHT - .15, 0);
  addMesh(building, new THREE.CylinderGeometry(glassRadius, glassRadius, HEIGHT - .85, 96, 1, true),
    basic({ color: 0xdfeae6, transparent: true, opacity: .13, side: THREE.DoubleSide, depthWrite: false }), 0, .55 + (HEIGHT - .85) / 2, 0);
  for (let i = 0; i < 32; i++) {
    const [x, z] = at(i * Math.PI / 16, glassRadius);
    box(building, steel, .09, HEIGHT, .09, x, HEIGHT / 2, z).rotation.y = -i * Math.PI / 16;
  }
  // The courtyard garden is built from photo-scanned plants (Poly Haven, CC0; see work/courtyard):
  // real grass clumps and flowers repeated across the ground, and one tree with scanned bark and leaves.
  let seed = 11;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) | 0) >>> 8) / 16777216;
  const YARD = R_IN - .1;
  const PLANTED = YARD - .5;      // planting stops short of the glazing, so nothing leans out through its base
  const dummy = new THREE.Object3D();
  const lit = parameters => new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, ...parameters });
  const asset = name => new URL('courtyard/' + name, import.meta.url).href;
  // scanned models keep the glTF convention, with the picture's top row first (upright = false)
  const photo = (name, upright = true) => { const map = new THREE.TextureLoader().load(asset(name)); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; map.flipY = upright; return map; };
  // a scan photographed on black: the black becomes see-through
  function cutout(name, upright = true) {
    const map = new THREE.Texture();
    map.flipY = upright;
    map.colorSpace = THREE.SRGBColorSpace;
    const image = new Image();
    image.onload = () => {
      map.image = makeCanvas(image.width, image.height, (c, w, h) => {
        c.drawImage(image, 0, 0);
        const data = c.getImageData(0, 0, w, h), px = data.data;
        for (let i = 0; i < px.length; i += 4) px[i + 3] = Math.min(255, Math.max(0, (Math.max(px[i], px[i + 1], px[i + 2]) - 26) * 9));
        c.putImageData(data, 0, 0);
      });
      map.needsUpdate = true;
    };
    image.src = asset(name);
    return map;
  }
  // many copies of one shape, each stood in its own place
  function scatter(geometry, material, count, set) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    for (let i = 0; i < count; i++) {
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      set(i);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.receiveShadow = true;
    building.add(mesh);
    return mesh;
  }
  const spot = edge => { const a = random() * 2 * Math.PI, r = Math.sqrt(random()) * edge; return [Math.cos(a) * r, Math.sin(a) * r]; };

  // soil under the grass
  const soil = new THREE.CanvasTexture(makeCanvas(512, 512, (c, w) => {
    c.fillStyle = '#4a5a2e';
    c.fillRect(0, 0, w, w);
    for (let i = 0; i < 6000; i++) {
      c.fillStyle = ['rgba(44,58,30,.6)', 'rgba(78,92,48,.5)', 'rgba(58,62,40,.55)'][i % 3];
      c.fillRect(random() * w, random() * w, 2 + random() * 4, 2 + random() * 4);
    }
  }));
  soil.colorSpace = THREE.SRGBColorSpace;
  const yard = addMesh(building, new THREE.CircleGeometry(YARD, 96), lit({ map: soil, color: new THREE.Color(1.5, 1.5, 1.4) }), 0, -.02, 0);
  yard.rotation.x = -Math.PI / 2;
  yard.receiveShadow = true;

  fetch(asset('plants.json')).then(response => response.json()).then(plants => {
    const shape = mesh => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(mesh.p, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.n, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(mesh.uv, 2));
      geometry.setIndex(mesh.i);
      return geometry;
    };
    const stand = (edge, size, lean = .25) => {
      const [x, z] = spot(edge);
      dummy.position.set(x, -.02, z);
      dummy.rotation.set((random() - .5) * lean, random() * 6.283, (random() - .5) * lean);
      dummy.scale.setScalar(size);
    };
    // grass: every scanned clump, thousands of times over, a little larger than life beside the figure
    const grass = lit({ map: cutout('grass.jpg', false), alphaTest: .45, color: new THREE.Color(2.5, 2.65, 1.8) });
    for (const clump of plants.grass) {
      const detailed = clump.tris > 60, flat = clump.tall < .05;
      scatter(shape(clump), grass, detailed ? 600 : flat ? 1000 : 2100, () => stand(PLANTED, 2.6 + random() * 1.6));
    }
    // flowers: orange gazanias in small groups, and yellow star flowers through the grass
    const gazania = lit({ map: cutout('gazania.jpg', false), alphaTest: .45, color: new THREE.Color(1.35, 1.35, 1.25) });
    for (const plant of plants.gazania) scatter(shape(plant), gazania, plant.tris > 1500 ? 16 : 22, () => stand(PLANTED - .3, 2 + random() * .9, .1));
    const empodium = lit({ map: cutout('empodium.jpg', false), alphaTest: .45, color: new THREE.Color(1.3, 1.3, 1.2) });
    for (const plant of plants.empodium) scatter(shape(plant), empodium, 70, () => stand(PLANTED - .2, 1.7 + random() * .8, .1));
  });

  // one tree in the centre: a trunk that forks into boughs, in scanned bark, carrying scanned leaf fronds
  const barkMap = photo('bark.jpg');
  barkMap.wrapS = barkMap.wrapT = THREE.RepeatWrapping;
  const bark = lit({ map: barkMap, side: THREE.FrontSide });
  function limb(from, to, r0, r1) {
    const delta = to.clone().sub(from), geometry = new THREE.CylinderGeometry(r1, r0, delta.length(), 12, 4);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(r0 * 9)), uv.getY(i) * delta.length() * .6);
    const mesh = addMesh(building, geometry, bark);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.position.copy(from).addScaledVector(delta, .5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
  }
  // a frond is a strip that droops toward its tip, showing one frond of the leaf scan
  function frond(u0, u1, v0, v1) {
    const wide = Math.abs(v1 - v0) / Math.abs(u1 - u0), p = [], uv = [], i = [];
    for (let s = 0; s <= 4; s++) {
      const t = s / 4;
      p.push(t, -.3 * t * t, -wide / 2, t, -.3 * t * t, wide / 2);
      uv.push(u0 + (u1 - u0) * t, 1 - v0, u0 + (u1 - u0) * t, 1 - v1);
      if (s) i.push(s * 2 - 2, s * 2 - 1, s * 2, s * 2 - 1, s * 2 + 1, s * 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(i);
    geometry.computeVertexNormals();
    return geometry;
  }
  const fronds = [frond(.16, .995, .02, .47), frond(0, .43, .32, .7), frond(1, .25, .58, 1)];
  const foliage = lit({ map: cutout('fronds.jpg'), alphaTest: .4, color: new THREE.Color(1.3, 1.4, 1.15) });
  const fork = new THREE.Vector3(0, 2.4, 0), masses = [], crown = [];
  limb(new THREE.Vector3(0, -.1, 0), fork, .36, .23);
  for (let b = 0; b < 8; b++) {
    const a = b * 6.283 / 8 + random() * .5, reach = b ? 1.5 + random() * 1.3 : .2, top = 4.2 + random() * 1.3 + (b ? 0 : 1.1);
    const tip = new THREE.Vector3(Math.cos(a) * reach, top, Math.sin(a) * reach);
    const elbow = fork.clone().lerp(tip, .5).add(new THREE.Vector3(Math.cos(a) * .35, -.15, Math.sin(a) * .35));
    limb(fork, elbow, .2, .13);
    limb(elbow, tip, .13, .045);
    masses.push(tip);
  }
  // leaves throw leaf-shaped shadows: the shadow pass cuts them out with the same scan
  const leafShadow = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: foliage.map, alphaTest: .4, side: THREE.DoubleSide });
  for (const [k, geometry] of fronds.entries()) crown.push(scatter(geometry, foliage, 760, i => {
    // each frond grows outward from somewhere inside a bough's mass of leaves
    const tip = masses[(i * 3 + k) % masses.length], u = random() * 6.283, v = Math.acos(2 * random() - 1), far = Math.cbrt(random()) * 1.15;
    dummy.position.set(tip.x + Math.sin(v) * Math.cos(u) * far, tip.y + .2 + Math.cos(v) * far * .75, tip.z + Math.sin(v) * Math.sin(u) * far);
    dummy.rotation.set((random() - .5) * 1.2, -u + (random() - .5) * 1.4, -.5 + random() * .9, 'YZX');
    dummy.scale.setScalar(.85 + random() * .75);
  }));
  for (const mesh of crown) { mesh.castShadow = true; mesh.customDepthMaterial = leafShadow; }

  // walls between the rooms, each with a doorway and a sign for the room it opens onto
  const sideMaterial = painted(plasterMap, { side: THREE.DoubleSide });
  const walls = [];
  for (let k = 0; k < 8; k++) {
    const a = k * ROOM, wall = new THREE.Group();
    wall.rotation.y = -a - Math.PI / 2;   // local +X runs outward, local +Z along the loop
    building.add(wall);
    box(wall, sideMaterial, DOOR[0] - R_IN + .2, HEIGHT, WALL_THICK, (DOOR[0] + R_IN - .2) / 2, HEIGHT / 2, 0);
    box(wall, sideMaterial, R_OUT - DOOR[1], HEIGHT, WALL_THICK, (R_OUT + DOOR[1]) / 2, HEIGHT / 2, 0);
    box(wall, sideMaterial, DOOR[1] - DOOR[0], HEIGHT - DOOR_HEAD, WALL_THICK, DOOR_R, (HEIGHT + DOOR_HEAD) / 2, 0);
    const next = rooms[k];
    const sign = addMesh(wall, new THREE.PlaneGeometry(3.7, 1.445),
      painted(lintelSign(next.id, next.title), { transparent: true }), DOOR_R, (HEIGHT + DOOR_HEAD) / 2, -WALL_THICK / 2 - .012);
    sign.rotation.y = Math.PI;            // read by someone walking the loop toward this doorway
    // and on the other face, for someone walking the loop backwards: the room that way
    const before = rooms[(k + 7) % 8];
    addMesh(wall, new THREE.PlaneGeometry(3.7, 1.445),
      painted(lintelSign(before.id, before.title), { transparent: true }), DOOR_R, (HEIGHT + DOOR_HEAD) / 2, WALL_THICK / 2 + .012);
    walls.push({ angle: a, group: wall });
  }

  // the way out: a doorway onto a night sky (the walk starts inside room 01, with no door). Deep
  // night at the top deepens through plum to a faint ember glow low down, as if something waits
  // beyond; stars twinkle, mist drifts across in front of them and lies thick along the bottom, a
  // few gold motes rise through it.
  const night = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `
      varying vec2 vUv; uniform float time;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
      float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 7.1; a *= .5; } return v; }
      void main() {
        vec2 uv = vUv, p = vec2(uv.x * 2.8, uv.y * 4.6);
        vec3 col = mix(vec3(.075, .035, .1), vec3(.03, .018, .075), smoothstep(0., .4, uv.y));
        col = mix(col, vec3(.006, .007, .028), smoothstep(.3, 1., uv.y));
        col += vec3(.045, .02, .08) * smoothstep(.45, .85, fbm(p * .9 + vec2(time * .03, -time * .02))) * (1. - uv.y * .6);
        // mist: two sheets of it sliding past each other, thickest near the ground
        float low = exp(-uv.y * 2.6);
        float mist = smoothstep(.38, .78, fbm(p * vec2(.75, 1.7) + vec2(time * .06, time * .012)));
        mist = max(mist * (.3 + .7 * low), smoothstep(.42, .8, fbm(p * vec2(1.3, 2.6) - vec2(time * .045, 0.) + 9.)) * (.16 + .84 * low));
        mist = clamp(mist + low * .22, 0., 1.);
        // stars: one in some cells of a grid, each with its own slow twinkle
        for (int layer = 0; layer < 2; layer++) {
          float size = layer == 0 ? 9. : 17.;
          vec2 g = p * size, cell = floor(g), spot = cell + .2 + .6 * vec2(hash(cell + 3.), hash(cell + 9.));
          float born = hash(cell + float(layer) * 31.), d = length(g - spot);
          float twinkle = .55 + .45 * sin(time * (.6 + born * 2.2) + born * 40.);
          col += vec3(1., .95, .86) * step(.62, born) * smoothstep(.16, 0., d) * twinkle * (.35 + .65 * smoothstep(.05, .5, uv.y)) * (layer == 0 ? .8 : .42) * (1. - mist * .85);
        }
        // the glow low in the doorway, and motes drifting up out of it
        col += vec3(.9, .45, .38) * exp(-uv.y * 6.) * .12 * exp(-pow((uv.x - .5) * 2.2, 2.));
        col = mix(col, vec3(.13, .115, .2) + vec3(.06, .03, .03) * low, mist * .55);
        for (int i = 0; i < 9; i++) {
          float k = float(i), rise = fract(hash(vec2(k, 1.)) + time * (.018 + .02 * hash(vec2(k, 2.))));
          vec2 spot = vec2(.12 + .76 * hash(vec2(k, 3.)) + .03 * sin(time * .5 + k * 2.), rise);
          float d = length((uv - spot) * vec2(2.8, 4.6));
          col += vec3(1., .8, .5) * (.012 / (d * d + .012)) * .09 * sin(rise * 3.1416);
        }
        float side = min(uv.x, 1. - uv.x);
        col *= mix(.62, 1., smoothstep(0., .2, side)) * mix(.8, 1., smoothstep(1., .85, uv.y));
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const gilt = basic({ color: 0xc9a56a });
  // the dark of the doorway falls a little way onto the floor in front of it
  const spill = painted(makeCanvas(256, 128, (c, w, h) => {
    const shade = c.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, 'rgba(38,30,60,.3)');
    shade.addColorStop(.35, 'rgba(38,30,60,.1)');
    shade.addColorStop(1, 'rgba(38,30,60,0)');
    c.fillStyle = shade;
    c.fillRect(0, 0, w, h);
    // faded out at both ends, so it has no corners
    c.globalCompositeOperation = 'destination-in';
    const ends = c.createLinearGradient(0, 0, w, 0);
    ends.addColorStop(0, 'rgba(0,0,0,0)');
    ends.addColorStop(.22, 'rgba(0,0,0,1)');
    ends.addColorStop(.78, 'rgba(0,0,0,1)');
    ends.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = ends;
    c.fillRect(0, 0, w, h);
  }), { transparent: true, depthWrite: false });
  const portals = [];
  for (const [name, a, label] of [['exit', EXIT, 'EXIT']]) {
    const door = facingIn(a, R_OUT - .09);
    box(door, frameBlack, 3.1, 4.75, .1, 0, 2.375, 0);
    // a thin gilt line inside the black frame, the night itself, and its shadow on the floor
    addMesh(door, new THREE.PlaneGeometry(2.88, 4.68), gilt, 0, 2.32, .055);
    addMesh(door, new THREE.PlaneGeometry(2.8, 4.6), night, 0, 2.3, .06).onBeforeRender = () => { night.uniforms.time.value = performance.now() / 1000; };
    const pool = addMesh(door, new THREE.PlaneGeometry(4.6, 1.5), spill, 0, .014, .81);
    pool.rotation.x = -Math.PI / 2;
    addMesh(door, new THREE.PlaneGeometry(2.4, .5), painted(portalSign(label), { transparent: true }), 0, 5.25, .04);
    door.traverse(node => { node.userData.portal = name; });
    const [x, z] = at(a, R_OUT - 1.5);
    portals.push({ name, x, z, door });
  }

  // things on the floor to walk around: benches and plinths
  const benches = [];

  // A plinth carrying a sculpture (sculpture.js), for a work that has one: a plain white block in a
  // matt finish, standing on a dark recessed base so it seems to float just off the floor.
  const plinthWhite = basic({ color: 0xf4f3ef, vertexColors: true });
  const plinthBase = basic({ color: 0x2b2b2a });
  // a block whose faces are toned as if lit from above and in front
  function block(parent, w, h, d, y) {
    const geometry = new THREE.BoxGeometry(w, h, d), normal = geometry.attributes.normal, tone = [];
    for (let i = 0; i < normal.count; i++) {
      const shade = normal.getY(i) > .5 ? 1 : normal.getZ(i) > .5 ? .9 : normal.getZ(i) < -.5 ? .7 : normal.getX(i) > .5 ? .8 : .74;
      tone.push(shade, shade, shade);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(tone, 3));
    return addMesh(parent, geometry, plinthWhite, 0, y + h / 2, 0);
  }
  function plinth(work) {
    const group = new THREE.Group();
    building.add(group);
    box(group, plinthBase, .86, .05, .62, 0, .025, 0);
    block(group, .94, .74, .7, .05);
    addMesh(group, new THREE.PlaneGeometry(.15, .085), basic({ color: 0xd9d8d3 }), .3, .66, .3505);
    const garden = createGarden(THREE, work.sculpture, work.id);
    garden.position.y = .79;
    group.add(garden);
    group.traverse(node => { node.userData.stationId = work.id; });
    group.scale.setScalar(1.4);
    const solid = { x: 0, z: 0, radius: .78 };
    benches.push(solid);
    return { group, solid };
  }

  // artworks along each room's outer wall, each with a floor circle to stand in
  const ringSegments = [];
  for (let i = 0; i < 8; i++) ringSegments.push(new THREE.RingGeometry(.522, .535, 12, 1, i * Math.PI / 4, Math.PI / 4 - .055));
  const ringMaterial = basic({ color: 0x54534f, side: THREE.DoubleSide });
  const loader = new THREE.TextureLoader();
  const stations = [];
  const AROUND = .83, GAP = .6;    // what the mount and frame add to a picture; the wall between frames
  for (const [k, room] of rooms.entries()) {
    // the usable stretch of wall: between the room's side walls, less the exit
    let from = k * ROOM + .035, to = (k + 1) * ROOM - .035;
    if (k === 7) from = EXIT + PORTAL_HALF;
    const hung = [];
    // Every frame in a room is the same height. Each is as wide as its picture needs, so the mount
    // stays even on all four sides, and the row is as tall as the wall's length allows.
    function hang() {
      const span = (to - from) * R_OUT, shapes = hung.reduce((sum, h) => sum + h.shape, 0);
      const tall = Math.min(3.3, (span - hung.length * (AROUND + GAP)) / shapes);
      const used = hung.reduce((sum, h) => sum + tall * h.shape + AROUND, 0) + GAP * (hung.length - 1);
      let along = (span - used) / 2;
      for (const h of hung) {
        const pw = tall * h.shape, a = from + (along + (pw + AROUND) / 2) / R_OUT;
        along += pw + AROUND + GAP;
        h.picture.scale.set(pw, tall, 1);
        h.edge.scale.set(pw + .012, tall + .012, .005);
        h.mat.scale.set(pw + .6, tall + .6, .018);
        h.lip.scale.set(pw + .65, tall + .65, .025);
        h.black.scale.set(pw + AROUND, tall + AROUND, .115);
        const [fx, fz] = at(a, R_OUT - .1), [x, z] = at(a, R_OUT - 1.75);
        h.frame.position.set(fx, 1.2 + (tall + AROUND) / 2, fz);
        h.frame.rotation.y = Math.PI - a;
        h.ring.position.set(x, .01, z);
        // its spotlight sits on the track straight in front and tilts down onto the picture
        const [lx, lz] = at(a, 15.4), centre = h.frame.position;
        h.lamp.position.set(lx, HEIGHT - .6, lz);
        h.lamp.quaternion.setFromUnitVectors(down, centre.clone().sub(h.lamp.position).normalize());
        const fw = pw + AROUND, fh = tall + AROUND;
        if (h.glow.userData.size !== fw + 'x' + fh) {
          h.glow.material.map?.dispose();
          h.glow.material.dispose();
          h.glow.material = halo(fw, fh);
          h.glow.userData.size = fw + 'x' + fh;
        }
        h.glow.scale.set(fw + 2 * SPILL, fh + 2 * SPILL, 1);
        Object.assign(h.station, { angle: a, x, z });
        if (h.plinth) {
          // the plinth stands between the picture and its floor circle
          const [px, pz] = at(a, R_OUT - .85);
          h.plinth.group.position.set(px, 0, pz);
          h.plinth.group.rotation.y = Math.PI - a;
          Object.assign(h.plinth.solid, { x: px, z: pz });
        }
      }
    }
    for (const work of room.works) {
      const frame = new THREE.Group();
      frame.name = 'Frame ' + work.id;
      building.add(frame);
      // Local Z points out from the wall, and the mount is inset behind the frame's lip.
      const black = box(frame, frameBlack, 1, 1, .115, 0, 0, .01);
      const lip = box(frame, bevel, 1, 1, .025, 0, 0, .075);
      const mat = box(frame, mount, 1, 1, .018, 0, 0, .09);
      const edge = box(frame, fineEdge, 1, 1, .005, 0, 0, .101);
      const picture = addMesh(frame, new THREE.PlaneGeometry(1, 1), paper, 0, 0, .106);
      frame.traverse(node => { node.userData.stationId = work.id; });
      const ring = new THREE.Group();
      building.add(ring);
      ring.rotation.x = -Math.PI / 2;
      for (const geometry of ringSegments) addMesh(ring, geometry, ringMaterial);
      ring.traverse(node => { node.userData.stationId = work.id; });
      const station = { id: work.id, room: k, angle: 0, x: 0, z: 0, frame, ring };
      stations.push(station);
      const lamp = addMesh(building, lampBody, steel);
      addMesh(lamp, lampLens, lensGlow, 0, -.222, 0).rotation.x = Math.PI / 2;
      // the light it throws on the wall just around the frame (drawn to size in hang)
      const glow = addMesh(frame, new THREE.PlaneGeometry(1, 1), basic({ visible: false }), 0, 0, .035);
      glow.raycast = () => {};         // light on the wall is not something to click
      // shape: width over height; an empty frame is a plain portrait until it has a picture
      const entry = { shape: 2.2 / 3.1, frame, black, lip, mat, edge, picture, ring, station, lamp, glow, plinth: work.sculpture && plinth(work) };
      hung.push(entry);
      if (work.image) loader.load(work.image, map => {
        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = 8;
        picture.material = basic({ map });
        entry.shape = map.image.width / map.image.height;
        hang();
      });
    }
    hang();
  }

  // a bench in each room, facing the artworks
  for (let k = 0; k < 8; k++) {
    const a = (k + .5) * ROOM, bench = facingIn(a, 11.1);
    box(bench, frameBlack, 2.6, .12, .62, 0, .5, 0);
    for (const x of [-1.05, 1.05]) box(bench, frameBlack, .1, .44, .5, x, .22, 0);
    const [x, z] = at(a, 11.1);
    benches.push({ x, z, radius: 1.25 });
  }

  // Open sky over the courtyard. sky.js sets the sky, the sun or moon, and the weather from the real
  // time and weather in New York; the tree's shadow falls the way that light says it should.
  const sun = new THREE.DirectionalLight(0xfff0d2, 3.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -10.5, right: 10.5, top: 10.5, bottom: -10.5, near: 4, far: 60 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -.0006;
  sun.shadow.normalBias = .04;
  const fill = new THREE.HemisphereLight(0xdcecff, 0x7f8a66, 1.15);
  building.add(sun, sun.target, fill);
  const sky = createSky(THREE, building, { yard: PLANTED, sun, fill });
  return { stations, walls, portals, benches, building, sky };
}
