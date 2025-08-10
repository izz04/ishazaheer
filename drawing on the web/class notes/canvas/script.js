// this is an array of possible background colors.
var colors = [
	"#4C3F91",
	"#9145B6",
	"#B958A5",
	"#FF5677",
	"#DB6B97",
	"#F2FFE9",
	"#557C55",
	"#FEE3EC",
	"#502064"
];

//this function generates a random number inside a range
function randomNumber(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

//this function returns a random color from the color's
getRandomColor = function () {
	return colors[randomNumber(0, colors.length)];
};

// this selects the art div from the HTML panel
var art = document.getElementById("art");
var context = art.getContext("2d");

var box = {
	x: 0,
	y: 0,
	sizeX: 25,
	sizeY: 12.5
};

// the randomColor function chooses a color at random from the colors array and sets it as the background color for the art div and the page's background
function setRandomColor() {
	art.style.backgroundColor = getRandomColor();
	art.style.borderColor = getRandomColor();
}

function drawRect() {
	context.fillStyle = getRandomColor();
	context.fillRect(box.x, box.y, box.sizeX, box.sizeY);
}

function update() {
	box.x = randomNumber(0, 500);
	box.y = randomNumber(0, 500);
	box.sizeX = randomNumber(1, 50);
	box.sizeY = randomNumber(1, 50);
}

function loop() {
	update();
	drawRect();
	window.requestAnimationFrame(loop);
}

loop();
setRandomColor();