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
  // Set random background color
  context.fillStyle = pixelColors[Math.floor(Math.random() * pixelColors.length)];
  context.fillRect(0, 0, width, height);

  for (let i = 0; i < 20; i++) {
    let x = Math.random() * width;
    let y = Math.random() * height;
    let petalCount = Math.floor(Math.random() * 6) + 5; // Random number of petals between 5 and 10
    let radius = Math.floor(Math.random() * 40) + 10; // Random radius between 10 and 50

    context.save();
    context.translate(x, y);

    // Draw petals
    for (let j = 0; j < petalCount; j++) {
      context.beginPath();
      context.fillStyle = pixelColors[Math.floor(Math.random() * pixelColors.length)];
      context.moveTo(0, 0);
      context.quadraticCurveTo(20, -50, 40, -10); // Adjusted control points to make obovate shape
      context.quadraticCurveTo(60, -30, 40, 10); // Adjusted control points to make obovate shape
      context.quadraticCurveTo(20, 50, 0, 0);
      context.fill();
      context.rotate((Math.PI * 2) / petalCount);
    }

    // Draw center
    context.beginPath();
    context.arc(0, 0, radius / 5, 0, Math.PI * 2);
    context.fillStyle = `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 0.7)`; // Semi-transparent random color
    context.fill();

    context.beginPath();
    context.arc(0, 0, radius / 2, 0, Math.PI * 2);
    context.fillStyle = `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 0.5)`; // Semi-transparent random color
    context.fill();

    context.restore();
  }
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