// "Statue in the Garden" as an object: the silver sunflower standing among crochet flowers on a white
// slab, laid out after the photograph. The statue is the scanned mesh (work/sculpture/convert.mjs);
// the crochet flowers, leaves and stems around it are modelled here. Nothing here takes light from
// the scene: a soft fixed light is worked into the colours, so it looks the same in any weather.
const KEY = [.35, .75, .56], FILL = [-.6, .3, .35];
const YARN = { brown: [.45, .24, .09], yellow: [.97, .78, .1], white: [.96, .95, .92], orange: [.95, .5, .12], green: [.38, .66, .16], deep: [.25, .5, .12] };

export function createGarden(THREE, source, stationId) {
  const root = new THREE.Group(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  const WIDE = .9, DEEP = .66, THICK = .03, SIZE = .86;      // the slab, and how wide the arrangement is on it

  // rows of stitches, to give the yarn its texture
  const loops = Object.assign(document.createElement('canvas'), { width: 64, height: 64 }), c = loops.getContext('2d');
  c.fillStyle = '#fff';
  c.fillRect(0, 0, 64, 64);
  c.lineCap = 'round';
  for (let row = 0; row < 4; row++) for (let i = 0; i < 4; i++) {
    const x = i * 16 + (row % 2 ? 8 : 0), y = row * 16;
    c.strokeStyle = 'rgba(0,0,0,.2)';
    c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(x + 1, y + 2); c.lineTo(x + 8, y + 13); c.lineTo(x + 15, y + 2); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.1)';
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x - 8, y + 15.5); c.lineTo(x + 24, y + 15.5); c.stroke();
  }
  const stitchMap = new THREE.CanvasTexture(loops);
  stitchMap.wrapS = stitchMap.wrapT = THREE.RepeatWrapping;
  stitchMap.colorSpace = THREE.SRGBColorSpace;
  stitchMap.anisotropy = 4;
  const yarn = new THREE.MeshBasicMaterial({ map: stitchMap, vertexColors: true, toneMapped: false, side: THREE.DoubleSide });

  const garden = new THREE.Group();
  garden.position.y = THICK;
  garden.scale.setScalar(SIZE);
  root.add(garden);
  const resting = [];        // where things touch the slab, for their shadows: [x, z, radius]

  // stand a shape in the garden, facing `normal`, and work the light into its colour
  function knit(geometry, look, position, normal = [0, 1, 0], spin = 0) {
    const turn = new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(...normal).normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(up, spin));
    geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position), turn, one));
    geometry.computeVertexNormals();
    const n = geometry.attributes.normal, colours = [];
    for (let i = 0; i < n.count; i++) {
      let x = n.getX(i), y = n.getY(i), z = n.getZ(i);
      if (y < -.2) { x = -x; y = -y; z = -z; }        // thin yarn is lit on whichever side faces up
      const light = .36 + .16 * (y * .5 + .5) + .5 * Math.max(0, x * KEY[0] + y * KEY[1] + z * KEY[2]) + .12 * Math.max(0, x * FILL[0] + y * FILL[1] + z * FILL[2]);
      for (const part of look) colours.push(Math.min(1, Math.pow(part, 2.2) * light * 1.25));
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    const mesh = new THREE.Mesh(geometry, yarn);
    garden.add(mesh);
    return mesh;
  }
  const stitched = (geometry, across, along) => {
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * across, uv.getY(i) * along);
    return geometry;
  };
  // a frilled ring of petals
  function frill(inner, outer, waves, lift) {
    const p = [], uv = [], index = [], AROUND = 132, OUT = 4;
    for (let i = 0; i <= AROUND; i++) for (let j = 0; j <= OUT; j++) {
      const a = i / AROUND * 2 * Math.PI, t = j / OUT, r = inner + (outer - inner) * t;
      p.push(Math.cos(a) * r, Math.sin(a * waves) * lift * t - lift * .5 * t * t, Math.sin(a) * r);
      uv.push(i / AROUND * waves * .8, t * .7);
      if (i && j) { const at = i * (OUT + 1) + j; index.push(at - OUT - 2, at - 1, at - OUT - 1, at - 1, at, at - OUT - 1); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(index);
    return geometry;
  }
  const dome = (r, flat) => stitched(new THREE.SphereGeometry(r, 28, 12, 0, 2 * Math.PI, 0, Math.PI / 2).scale(1, flat, 1), 6, 2.5);
  // a flower head: a domed centre in a double frill of petals, with a knitted back
  function flower(position, normal, r, centre, petals, reach = 1.5) {
    knit(dome(r, .55), centre, position, normal);
    knit(frill(r * .86, r * reach, 11, r * .2), petals, position, normal);
    knit(frill(r * .8, r * (reach - .12), 11, r * .2), petals, position, normal, Math.PI / 11);
    knit(stitched(new THREE.SphereGeometry(r * .95, 20, 8, 0, 2 * Math.PI, Math.PI / 2, Math.PI / 2).scale(1, .35, 1), 5, 1.5), YARN.deep, position, normal);
  }
  function leaf(position, length, spin, normal = [0, 1, 0]) {
    knit(stitched(new THREE.SphereGeometry(1, 20, 10).scale(length / 2, length * .07, length * .24), 3, 1.6), YARN.green, position, normal, spin);
    resting.push([position[0], position[2], length * .5]);
  }
  function stem(points) {
    knit(stitched(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 72, .0085, 7), 1, 22), YARN.green, [0, 0, 0]);
  }
  // a stem that comes down from its flower and then curls round the statue, lying on the slab:
  // together the stems make a loose ring all the way round it, behind as well as in front
  function coil(from, sweep, r, y) {
    const centre = .035, start = Math.atan2(from[2] - centre, from[0]), points = [from], steps = Math.ceil(Math.abs(sweep) / .45);
    for (let i = 1; i <= steps; i++) {
      const a = start + sweep * (.12 + .88 * i / steps), wave = 1 + .04 * Math.sin(a * 3 + r * 40);
      points.push([Math.cos(a) * r * 1.12 * wave, y, centre + Math.sin(a) * r * .86 * wave]);
    }
    stem(points);
  }

  // the two big sunflowers behind and beside the statue, leaning toward the viewer
  flower([.045, .15, -.15], [-.05, .62, .78], .092, YARN.brown, YARN.yellow);
  flower([.255, .105, -.02], [.1, .55, .83], .105, YARN.brown, YARN.yellow);
  resting.push([.05, -.17, .16], [.27, -.05, .17]);
  // the white flowers: a large one lying on its side at the left, two small ones in front
  flower([-.335, .085, -.01], [-.35, .9, .25], .075, YARN.orange, YARN.white, 1.75);
  knit(stitched(new THREE.ConeGeometry(.07, .1, 16, 3, true), 4, 1.5), YARN.green, [-.3, .04, .0], [.3, -.9, -.2]);
  flower([-.215, .04, .1], [-.3, .8, .5], .036, YARN.orange, YARN.white, 1.8);
  flower([.07, .045, .15], [.25, .75, .6], .04, YARN.orange, YARN.white, 1.8);
  resting.push([-.33, 0, .13], [-.21, .11, .06], [.07, .16, .07]);
  // leaves, and the stems that circle the statue
  leaf([-.3, .022, .2], .23, .12);
  leaf([.31, .022, .22], .22, -.35);
  leaf([.19, .075, .1], .15, 1.2, [.5, .5, .7]);
  leaf([-.15, .03, .0], .09, .9, [0, .9, .4]);
  coil([.045, .1, -.16], 5.2, .235, .012);
  coil([.255, .07, -.03], 4.6, .25, .013);
  coil([-.3, .03, 0], 5, .225, .014);
  coil([-.2, .025, .1], 4.2, .242, .022);
  coil([.07, .03, .15], 4.4, .215, .021);

  // the silver statue in the middle
  resting.push([0, 0, .1]);
  Promise.all([fetch(source + '.json').then(response => response.json()), fetch(source + '.bin').then(response => response.arrayBuffer())]).then(([meta, data]) => {
    const round = n => n + (4 - n % 4) % 4, colours = round(meta.vertices * 6), index = colours + round(meta.vertices * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Int16Array(data, 0, meta.vertices * 3), 3, true));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(data, colours, meta.vertices * 3), 3, true));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(data, index, meta.triangles * 3), 1));
    const statue = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
    statue.scale.setScalar(.33);          // the mesh is one unit tall
    statue.position.set(0, 0, -.01);
    statue.userData.stationId = stationId;
    garden.add(statue);
  });

  // the white slab they stand on, with soft shadows where they rest
  const top = Object.assign(document.createElement('canvas'), { width: 512, height: Math.round(512 * DEEP / WIDE) }), t = top.getContext('2d');
  t.fillStyle = '#f3f2ee';
  t.fillRect(0, 0, top.width, top.height);
  for (const [x, z, r] of resting) {
    const px = (x * SIZE / WIDE + .5) * top.width + 6, pz = (z * SIZE / DEEP + .5) * top.height + 5, pr = r * SIZE / WIDE * top.width * 1.25;
    const shade = t.createRadialGradient(px, pz, pr * .2, px, pz, pr);
    shade.addColorStop(0, 'rgba(70,72,80,.42)');
    shade.addColorStop(1, 'rgba(70,72,80,0)');
    t.fillStyle = shade;
    t.fillRect(0, 0, top.width, top.height);
  }
  const topMap = new THREE.CanvasTexture(top);
  topMap.colorSpace = THREE.SRGBColorSpace;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(WIDE, THICK, DEEP), new THREE.MeshBasicMaterial({ color: 0xe3e2dd, toneMapped: false }));
  slab.position.y = THICK / 2;
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(WIDE, DEEP), new THREE.MeshBasicMaterial({ map: topMap, toneMapped: false }));
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = THICK + .001;
  root.add(slab, surface);
  root.traverse(node => { node.userData.stationId = stationId; });
  return root;
}

// The sculpture on its plinth, close up, for the detail view: it turns slowly, and can be dragged round.
export function createViewer(THREE, canvas) {
  let renderer, scene, camera, garden, source, running = false, dragging = false, last = 0, rest = 0, angle = -.4, tilt = .4, from = null;
  function build() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, 1, .05, 20);
    // the white plinth, its faces toned as in the gallery; it is made tall enough to run down out of
    // the picture from every angle, so it never ends in mid-air
    const block = new THREE.BoxGeometry(.94, 16, .7), normal = block.attributes.normal, tone = [];
    for (let i = 0; i < normal.count; i++) {
      const shade = normal.getY(i) > .5 ? 1 : normal.getZ(i) > .5 ? .9 : normal.getZ(i) < -.5 ? .7 : normal.getX(i) > .5 ? .8 : .74;
      tone.push(shade, shade, shade);
    }
    block.setAttribute('color', new THREE.Float32BufferAttribute(tone, 3));
    const plinth = new THREE.Mesh(block, new THREE.MeshBasicMaterial({ color: 0xf4f3ef, vertexColors: true, toneMapped: false }));
    plinth.position.y = -8;
    scene.add(plinth);
    canvas.addEventListener('pointerdown', event => { dragging = true; from = [event.clientX, event.clientY]; canvas.setPointerCapture(event.pointerId); });
    canvas.addEventListener('pointermove', event => {
      if (!dragging) return;
      angle -= (event.clientX - from[0]) * .009;
      tilt = Math.min(1.25, Math.max(.06, tilt + (event.clientY - from[1]) * .006));
      from = [event.clientX, event.clientY];
    });
    const release = () => { dragging = false; rest = 3; };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
  }
  function draw(time) {
    if (!running) return;
    requestAnimationFrame(draw);
    const dt = Math.min((time - last) / 1000, .06);
    last = time;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // a tall picture keeps the same width of view, so the plinth runs on down to the floor of the page
      camera.fov = w < h ? 2 * Math.atan(Math.tan(Math.PI / 12) * h / w) * 180 / Math.PI : 30;
      camera.updateProjectionMatrix();
    }
    // it turns by itself, pausing for a moment after it has been dragged
    if (!dragging && (rest -= dt) < 0) angle += dt * .22;
    const far = 2.55;
    camera.position.set(Math.sin(angle) * Math.cos(tilt) * far, .09 + Math.sin(tilt) * far, Math.cos(angle) * Math.cos(tilt) * far);
    camera.lookAt(0, .09, 0);
    renderer.render(scene, camera);
  }
  return {
    show(path) {
      if (!renderer) build();
      if (path !== source) {
        if (garden) scene.remove(garden);
        garden = createGarden(THREE, path, null);
        scene.add(garden);
        source = path;
      }
      angle = -.4;
      tilt = .4;
      rest = 0;
      canvas.hidden = false;
      if (!running) { running = true; requestAnimationFrame(draw); }
    },
    hide() { running = false; canvas.hidden = true; },
  };
}
