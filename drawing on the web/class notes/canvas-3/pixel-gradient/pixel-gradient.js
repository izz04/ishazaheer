const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');

let width;
let height;

// determine pixel density of display
let pxScale = window.devicePixelRatio;

function setup() {
  // full-browser canvas
  width = window.innerWidth;
  height = window.innerHeight;

  // set the CSS display size
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  // set the canvas pixel density
  canvas.width = width * pxScale;
  canvas.height = height * pxScale;

  // normalize the coordinate system
  context.scale(pxScale, pxScale);
}

function draw() {
  
}

window.addEventListener('load', () => {
  setup();
  draw();
});

window.addEventListener('resize', () => {
  setup();
  draw();
});