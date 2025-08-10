const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');

let width;
let height;

// determine pixel density of display
let pxScale = window.devicePixelRatio;

// access image from the DOM
const image = document.querySelector('img');

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

// array of pixel colors
const pixelColors = [];

// sample colors from raster graphic
function sampleColors() {
  context.drawImage(image, 0, 0, 45, 30);

  // sample image while accounting for pixel density
  let imageData = context.getImageData(0, 0, 45 * pxScale, 30  * pxScale);
  let data = imageData.data;

  context.clearRect(0, 0, width, height);  // clear canvas

  // organize all colors in an array of RGBA values
  for (let channel = 0; channel < data.length; channel += 4) {
    let color = `rgba(${data[channel]}, ${data[channel + 1]}, ${data[channel + 2]}, ${data[channel + 3]})`;
    pixelColors.push(color);
  }
}

function draw() {

}

window.addEventListener('load', () => {
  setup();
  sampleColors();
  draw();
});

window.addEventListener('resize', () => {
  setup();
  draw();
});