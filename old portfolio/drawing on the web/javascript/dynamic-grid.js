/* Dynamic Grid */

const background = document.querySelector('body');
displayHeight = () => background.style.height = window.innerHeight + 'px';

window.addEventListener('load', function() {
  displayHeight();
  scaleRatio();
});

window.addEventListener('resize', function() {
  displayHeight();
  scaleRatio();
});

/*
Opacity Transitions
*/

const grid = document.querySelector("#context");
const squares = document.querySelectorAll('.square');

function changeOpacity(event) {
  if (event.target.className == 'square') { // only work with grid items
    for (let i = 0; i < squares.length; i++) {
      squares[i].style.opacity = '0.6'; // make all square semitransparent
    }
    event.target.style.opacity = '1.0'; // keep selected image opaque
    event.target.addEventListener('pointerout', resetOpacity, false);
  }
  event.stopPropagation();
}

function resetOpacity() {
  for (let i = 0; i < squares.length; i++) {
    squares[i].style.opacity = '1.0'; // change all back to opaque
  }
}

// detect mouse hover on grid
grid.addEventListener('pointerover', changeOpacity, false); 

/*
Transform Grid Items
*/

let xBrowserRatio;
let yBrowserRatio;

function scaleRatio() {
  let browserWidth = window.innerWidth;
  let browserHeight = window.innerHeight;

  xBrowserRatio = browserWidth / 120; // not a full 180 deg rotation
  yBrowserRatio = browserHeight / 120; // not a full 180 deg rotation
}

function coordinates(event) {
  let xPos = event.clientX; // get cursor X position
  let yPos = event.clientY; // get cursor Y position

  updateRotation(xPos, yPos);
}

function updateRotation(xPos, yPos) {
  // map horizontal rotation to X position relative to browser width
  let xRotation = 60 - Math.ceil(yPos / yBrowserRatio); // half the scaled rotation value
  console.log('X rotation:', xRotation); // 0 deg rotation at page center

  // map vertical rotation to Y position relative to browser height
  let yRotation = -60 + Math.ceil(xPos / xBrowserRatio); // half the scaled rotation value
  console.log('Y rotation:', yRotation); // 0 deg rotation at page center

  // set perspective of shapes
  for (let i = 0; i < squares.length; i++) {
    squares[i].style.transform = `rotateX(${xRotation}deg) rotateY(${yRotation}deg)`;
  } 
}

// detect pointer movement in browser window
window.addEventListener('pointermove', coordinates);
window.addEventListener('pointerdown', coordinates);