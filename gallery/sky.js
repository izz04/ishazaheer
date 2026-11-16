// The courtyard's sky, light and weather follow the real time and weather in New York.
// The sun and the hour come from the clock; cloud, rain and snow come from Open-Meteo (free, no key).
// To preview a look, add to the address:  ?hour=21&weather=rain
//   hour: 0 to 24 (New York time)   weather: clear, cloudy, overcast, fog, drizzle, rain, storm, snow
const PLACE = { name: 'New York', lat: 40.7295, lon: -73.9965, zone: 'America/New_York' };
const REPORT = `https://api.open-meteo.com/v1/forecast?latitude=${PLACE.lat}&longitude=${PLACE.lon}&current=weather_code,cloud_cover`;

// Sky photographs (Poly Haven, CC0), upper half only. sun: how far across the picture its brightest part is.
const SKIES = {
  day: { file: 'sky.jpg', sun: .5859 },
  golden: { file: 'sky-golden.jpg', sun: .6289 },
  grey: { file: 'sky-overcast.jpg', sun: .5781 },
  night: { file: 'sky-night.jpg', sun: .625 },
};
const PRESETS = {
  clear: { cloud: .1, label: 'Clear' }, cloudy: { cloud: .6, label: 'Partly cloudy' }, overcast: { cloud: 1, label: 'Overcast' },
  fog: { cloud: 1, fog: 1, label: 'Fog' }, drizzle: { cloud: 1, rain: .35, label: 'Drizzle' }, rain: { cloud: 1, rain: .8, label: 'Rain' },
  storm: { cloud: 1, rain: 1, storm: true, label: 'Thunderstorm' }, snow: { cloud: 1, snow: .8, label: 'Snow' },
};
// a World Meteorological Organization weather code, as the looks this courtyard can show
function fromCode(code, cloud) {
  const look = (rain, snow, label, storm) => ({ cloud: Math.max(cloud, .9), rain, snow, storm, label });
  if (code >= 95) return look(1, 0, 'Thunderstorm', true);
  if (code === 85 || code === 86 || (code >= 71 && code <= 77)) return look(0, code === 71 ? .4 : .8, code === 71 ? 'Light snow' : 'Snow');
  if (code >= 80) return look(code === 80 ? .5 : .9, 0, code === 80 ? 'Light showers' : 'Showers');
  if (code >= 61) return look(code === 61 ? .5 : code === 63 ? .75 : 1, 0, code === 61 ? 'Light rain' : code === 63 ? 'Rain' : 'Heavy rain');
  if (code >= 51) return look(.3, 0, 'Drizzle');
  if (code >= 45) return { cloud: 1, fog: 1, label: 'Fog' };
  return { cloud, label: cloud > .8 ? 'Overcast' : cloud > .4 ? 'Partly cloudy' : cloud > .15 ? 'Mostly clear' : 'Clear' };
}

// where the sun stands over a place at a moment: height above the horizon, and bearing clockwise from north (radians)
function sunOver(moment, lat, lon) {
  const rad = Math.PI / 180, d = moment / 864e5 - 10957.5;
  const g = (357.528 + .9856003 * d) * rad, lambda = (280.46 + .9856474 * d + 1.915 * Math.sin(g) + .02 * Math.sin(2 * g)) * rad, tilt = (23.439 - 4e-7 * d) * rad;
  const ascension = Math.atan2(Math.cos(tilt) * Math.sin(lambda), Math.cos(lambda)), lean = Math.asin(Math.sin(tilt) * Math.sin(lambda));
  const hourAngle = ((18.697374558 + 24.06570982441908 * d) * 15 + lon) * rad - ascension, phi = lat * rad;
  return {
    height: Math.asin(Math.sin(phi) * Math.sin(lean) + Math.cos(phi) * Math.cos(lean) * Math.cos(hourAngle)),
    bearing: Math.atan2(-Math.sin(hourAngle), Math.tan(lean) * Math.cos(phi) - Math.sin(phi) * Math.cos(hourAngle)),
  };
}
const clamp = x => Math.min(1, Math.max(0, x));
const ease = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const blend = (weights, values) => values[0].map((_, i) => weights.reduce((sum, w, k) => sum + w * values[k][i], 0));

export function createSky(THREE, parent, { yard, sun, fill }) {
  const asset = name => new URL('courtyard/' + name, import.meta.url).href;
  const query = new URLSearchParams(location.search);
  const fixedHour = query.has('hour') ? +query.get('hour') : null, fixedWeather = PRESETS[query.get('weather')];
  let weather = fixedWeather || PRESETS.clear, known = !!fixedWeather;
  const label = document.querySelector('#weather');

  // one dome that mixes four sky photographs; each loads the first time it is wanted
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  blank.needsUpdate = true;
  const uniforms = { flash: { value: 0 } };
  for (const name in SKIES) Object.assign(uniforms, { [name]: { value: blank }, [name + 'Tint']: { value: new THREE.Vector3() }, [name + 'Turn']: { value: 0 } });
  const want = name => {
    const sky = SKIES[name];
    if (sky.asked) return;
    sky.asked = true;
    new THREE.TextureLoader().load(asset(sky.file), map => {
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = THREE.RepeatWrapping;
      uniforms[name].value = map;
    });
  };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(72, 48, 16, 0, 2 * Math.PI, 0, Math.PI / 2), new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec2 at; void main() { at = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec2 at; uniform float flash;
      ${Object.keys(SKIES).map(name => `uniform sampler2D ${name}; uniform vec3 ${name}Tint; uniform float ${name}Turn;`).join('\n')}
      void main() {
        vec3 stars = texture2D(night, vec2(at.x + nightTurn, at.y)).rgb;
        stars = stars * stars * 2.6 * smoothstep(.0, .22, at.y);       // deepen the dark between the stars; lose the glow on the horizon
        vec3 colour = texture2D(day, vec2(at.x + dayTurn, at.y)).rgb * dayTint + texture2D(golden, vec2(at.x + goldenTurn, at.y)).rgb * goldenTint
          + texture2D(grey, vec2(at.x + greyTurn, at.y)).rgb * greyTint + stars * nightTint;
        gl_FragColor = vec4(colour + flash * vec3(.55, .6, .75), 1.);
        #include <colorspace_fragment>
      }`,
  }));
  dome.position.y = -1;
  dome.renderOrder = -1;
  parent.add(dome);

  // rain: fine streaks falling the height of the courtyard, over and over
  const TALL = 15, drops = 5200, streak = new Float32Array(drops * 6), end = new Float32Array(drops * 2);
  let seed = 7;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) | 0) >>> 8) / 16777216;
  const spot = () => { const a = random() * 2 * Math.PI, r = Math.sqrt(random()) * yard; return [Math.cos(a) * r, Math.sin(a) * r]; };
  for (let i = 0; i < drops; i++) {
    const [x, z] = spot(), y = random() * TALL;
    streak.set([x, y, z, x, y, z], i * 6);
    end[i * 2 + 1] = 1;
  }
  const falling = { time: { value: 0 }, strength: { value: 0 }, glow: { value: 1 } };
  const rainShape = new THREE.BufferGeometry();
  rainShape.setAttribute('position', new THREE.BufferAttribute(streak, 3));
  rainShape.setAttribute('end', new THREE.BufferAttribute(end, 1));
  const rain = new THREE.LineSegments(rainShape, new THREE.ShaderMaterial({
    uniforms: falling, transparent: true, depthWrite: false,
    vertexShader: `uniform float time; attribute float end; varying float fade;
      void main() {
        vec3 p = position;
        float speed = 15. + fract(p.x * 7.31 + p.z * 3.17) * 5.;
        p.y = mod(p.y - time * speed, ${TALL}.) + end * .62;
        p.x += (p.y - end * .62) * -.07 + end * .045;
        fade = end;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
      }`,
    fragmentShader: 'uniform float strength, glow; varying float fade; void main() { gl_FragColor = vec4(vec3(.8, .86, .93) * glow, (.12 + .34 * fade) * strength); }',
  }));
  rain.frustumCulled = false;
  rain.visible = false;
  parent.add(rain);

  // snow: soft flakes drifting down
  const flakes = 2600, flake = new Float32Array(flakes * 3);
  for (let i = 0; i < flakes; i++) { const [x, z] = spot(); flake.set([x, random() * TALL, z], i * 3); }
  const snowShape = new THREE.BufferGeometry();
  snowShape.setAttribute('position', new THREE.BufferAttribute(flake, 3));
  const snow = new THREE.Points(snowShape, new THREE.ShaderMaterial({
    uniforms: falling, transparent: true, depthWrite: false,
    vertexShader: `uniform float time;
      void main() {
        vec3 p = position;
        float own = fract(p.x * 7.31 + p.z * 3.17);
        p.y = mod(p.y - time * (.9 + own * .7), ${TALL}.);
        p.x += sin(time * .7 + own * 40.) * .25;
        p.z += cos(time * .5 + own * 23.) * .25;
        vec4 seen = modelViewMatrix * vec4(p, 1.);
        gl_PointSize = (5. + own * 5.) * 9. / -seen.z;
        gl_Position = projectionMatrix * seen;
      }`,
    fragmentShader: 'uniform float strength, glow; void main() { float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(glow), smoothstep(.5, .1, d) * .9 * strength); }',
  }));
  snow.frustumCulled = false;
  snow.visible = false;
  parent.add(snow);

  // mist: soft banks of it standing in the garden and slowly turning, kept inside the glazing
  const bank = Object.assign(document.createElement('canvas'), { width: 256, height: 256 }), soft = bank.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x = 128 + (random() - .5) * 120, y = 128 + (random() - .5) * 120, size = 34 + random() * 50, puff = soft.createRadialGradient(x, y, 0, x, y, size);
    puff.addColorStop(0, 'rgba(255,255,255,.16)');
    puff.addColorStop(1, 'rgba(255,255,255,0)');
    soft.fillStyle = puff;
    soft.fillRect(0, 0, 256, 256);
  }
  const haze = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(bank), transparent: true, depthWrite: false, opacity: 0 });
  const mist = new THREE.Group();
  for (let i = 0; i < 64; i++) {
    const wide = 4 + random() * 3, a = random() * 2 * Math.PI, r = Math.sqrt(random()) * (yard - wide * .42), puff = new THREE.Sprite(haze);
    puff.position.set(Math.cos(a) * r, i % 3 ? .4 + random() * 1.6 : 1.5 + random() * 4.5, Math.sin(a) * r);   // thickest near the ground
    puff.scale.set(wide, wide * (.55 + random() * .3), 1);
    mist.add(puff);
  }
  mist.visible = false;
  parent.add(mist);

  // garden lanterns, lit after dark
  const post = new THREE.MeshBasicMaterial({ color: 0x1b1b1a }), globe = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const haloMap = new THREE.CanvasTexture(Object.assign(document.createElement('canvas'), { width: 128, height: 128 }));
  const paint = haloMap.image.getContext('2d'), glowing = paint.createRadialGradient(64, 64, 0, 64, 64, 64);
  glowing.addColorStop(0, 'rgba(255,214,150,1)');
  glowing.addColorStop(.25, 'rgba(255,190,110,.45)');
  glowing.addColorStop(1, 'rgba(255,170,80,0)');
  paint.fillStyle = glowing;
  paint.fillRect(0, 0, 128, 128);
  const halo = new THREE.SpriteMaterial({ map: haloMap, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const lamps = [];
  for (let i = 0; i < 3; i++) {
    const a = i * 2 * Math.PI / 3 + .5, x = Math.cos(a) * 3.3, z = Math.sin(a) * 3.3;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .6, 8), post), bulb = new THREE.Mesh(new THREE.SphereGeometry(.1, 16, 12), globe);
    stem.position.set(x, .3, z);
    bulb.position.set(x, .66, z);
    const shine = new THREE.Sprite(halo), lamp = new THREE.PointLight(0xffb866, 0, 12, 1.6);
    shine.position.copy(bulb.position);
    shine.scale.setScalar(1.7);
    lamp.position.set(x, .8, z);
    parent.add(stem, bulb, shine, lamp);
    lamps.push(lamp);
  }

  async function report() {
    if (fixedWeather) return;
    try {
      const { current } = await (await fetch(REPORT)).json();
      weather = fromCode(current.weather_code, current.cloud_cover / 100);
      known = true;
    } catch { /* no report: the sky still follows the clock, under clear weather */ }
  }
  report();
  setInterval(report, 10 * 60 * 1000);

  const clock = new Intl.DateTimeFormat('en-US', { timeZone: PLACE.zone, hour: 'numeric', minute: '2-digit' });
  const hourThere = new Intl.DateTimeFormat('en-US', { timeZone: PLACE.zone, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
  function moment() {
    const now = Date.now();
    if (fixedHour === null) return now;
    const [h, m] = hourThere.format(now).split(':').map(Number);
    return now + (fixedHour - h - m / 60) * 36e5;
  }

  const live = { cloud: weather.cloud, rain: weather.rain || 0, snow: weather.snow || 0, fog: weather.fog || 0 };
  let elapsed = 0, shown = '', nextFlash = 6, flash = 0;
  const colour = new THREE.Color();
  function update(dt) {
    elapsed += dt;
    const now = moment(), { height, bearing } = sunOver(now, PLACE.lat, PLACE.lon), up = height * 180 / Math.PI;
    // the weather eases from one report to the next
    const ease1 = Math.min(1, dt * .5);
    live.cloud += (weather.cloud - live.cloud) * ease1;
    live.rain += ((weather.rain || 0) - live.rain) * ease1;
    live.snow += ((weather.snow || 0) - live.snow) * ease1;
    live.fog += ((weather.fog || 0) - live.fog) * ease1 * .5;
    const wet = Math.max(live.rain, live.snow * .5);

    // how much it is day, the golden hour, or night; and how far cloud has closed the sky
    const day = ease(4, 15, up), night = 1 - ease(-11, -3, up), golden = clamp(1 - day - night), times = [day, golden, night];
    const closed = ease(.5, .9, live.cloud), open = 1 - closed;
    if (day * open > 0) want('day');
    if (golden * open > 0) want('golden');
    if (night * open > 0) want('night');
    if (closed > 0) want('grey');
    const dusk = 1 - .5 * ease(1, -7, up);
    uniforms.dayTint.value.setScalar(day * open);
    uniforms.goldenTint.value.set(1, .97, .97).multiplyScalar(golden * open * dusk);
    uniforms.nightTint.value.set(.6, .72, 1).multiplyScalar(night * open);
    uniforms.greyTint.value.fromArray(blend(times, [[.95, .96, .98], [.62, .5, .52], [.12, .1, .12]])).multiplyScalar(closed * (1 - .4 * wet * (day + golden)));

    // the sun, or after dark the moon standing opposite it
    const moonlit = up < -4, low = Math.max(height, 14 * Math.PI / 180), around = moonlit ? bearing + Math.PI : bearing, lift = moonlit ? .8 : low;
    sun.position.set(Math.sin(around) * Math.cos(lift), Math.sin(lift), -Math.cos(around) * Math.cos(lift)).multiplyScalar(32);
    const across = Math.atan2(sun.position.z, -sun.position.x) / (2 * Math.PI);
    for (const name of ['day', 'golden', 'grey']) uniforms[name + 'Turn'].value = SKIES[name].sun - across;
    const power = moonlit ? .55 * ease(-4, -10, up) : blend([day, golden], [[3.1], [2.2]])[0] * ease(-4, 1, up);
    sun.intensity = power * (1 - .9 * closed);
    sun.color.fromArray(moonlit ? [.62, .74, 1] : blend([day, 1 - day], [[1, .94, .82], [1, .63, .38]]));

    // light from the whole sky
    const clearFill = blend(times, [[.86, .93, 1, 1.15], [1, .8, .74, .7], [.34, .44, .7, .2]]);
    const greyFill = blend(times, [[.9, .92, .95, 1.45 - .5 * wet], [.8, .68, .7, .6 - .15 * wet], [.5, .44, .5, .2]]);
    const sky = blend([open, closed], [clearFill, greyFill]);
    fill.color.setRGB(sky[0], sky[1], sky[2]);
    fill.groundColor.fromArray(blend(times, [[.5, .54, .4], [.45, .4, .36], [.12, .14, .2]]));
    fill.intensity = sky[3] + flash * 2.5;

    for (const lamp of lamps) lamp.intensity = 7 * night;
    halo.opacity = night;
    globe.color.setRGB(.93, .9, .84).lerp(colour.setRGB(1, .9, .68), night);

    // rain and snow, lit by whatever light there is
    falling.time.value = elapsed;
    falling.glow.value = .7 + .3 * (day + golden * .8);   // after dark the gallery's own light catches it
    rain.visible = live.rain > .02;
    snow.visible = live.snow > .02;
    falling.strength.value = 1;
    rainShape.setDrawRange(0, Math.round(drops * clamp(live.rain)) * 2);
    snowShape.setDrawRange(0, Math.round(flakes * clamp(live.snow)));

    mist.visible = live.fog > .02;
    mist.rotation.y = elapsed * .012;
    haze.opacity = .5 * live.fog;
    haze.color.fromArray(blend(times, [[.95, .96, .97], [.86, .76, .76], [.3, .3, .36]]));

    // lightning
    flash = Math.max(0, flash - dt * 5);
    if (weather.storm && (nextFlash -= dt) < 0) { flash = 1; nextFlash = Math.random() < .35 ? .18 : 4 + Math.random() * 9; }
    uniforms.flash.value = flash * flash;

    if (label) {
      const text = `${PLACE.name} · ${clock.format(now)}${known ? ' · ' + weather.label : ''}`;
      if (text !== shown) label.textContent = shown = text;
    }
  }
  update(0);
  return { update };
}
