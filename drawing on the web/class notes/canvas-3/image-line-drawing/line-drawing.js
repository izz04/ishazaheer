const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');

let width;
let height;

// determine pixel density of display
let pxScale = window.devicePixelRatio;

const image=document.querySelector

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
	context.fillStyle='grey';
	context.fillRect (0,0,width,height);
	context.drawImage (image,0,0,45,30);
	
	//smaple image data while accounting for pixel density
	let imageData=context.getImageData(0,0,45*pxScale,30*pxScale);
	let data=imageData.data;
	console.log('Total number of physical pixels * 4 RGBA channels:', data.length);
	context.clearRect (0,0,width,height);
	
	let pixelColors=[];
	
	//organize all colors in an array of RGBA values
	
	for (let channel=0;channel<data.length;channel+=4){
		let color='rgba({data[channel]},{data[channel+1]},{data[channel+2]},{data[channel+3]})';
		pixelColors.push(color);
	}
	//console.log(pixelColors);
	
	let colorStep=Math.floor(pixelColors.length/height);
	console.log('Number of colors to skip through:',colorStep);
	
	for (let row=0;row<height;row++){
		context.strokeStyle=pixelColor[row];//row corresponds to color
		context.beginPath();
		context.moveTo(0,row);
		context.lineTo(width,row)
		context.stroke();
	}
}

window.addEventListener('load', () => {
  setup();
  draw();
});

window.addEventListener('resize', () => {
  setup();
  draw();
});