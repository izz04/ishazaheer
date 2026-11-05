// dynamic grid

const background=document.querySelector('body');
displayHeight = () => () background.style.height=window.innerHeight+'px';

const grid=document.querySelector('#context');
const squares=document.querySelectorAll('.square');

function changeOpacity (event){
	if (event.target.className=='square'){//only work with grid squares
		for (let i=0;i<squares.length;i++){
			squares[i].style.opacity='0.6'; //make all squares semi transparent
		}
		event.target.style.opacity='1.0'; //keep selected square opaque
		event.target.addEventListener('pointerout',resetOpacity);
	}
	event.stopPropagation(); //stop bubbling phase of event propagation
}

function resetOpacity (){
	squares.forEach((square)=>square.style.opacity='1.0');
}

grid.addEventListener('pointerover',changeOpacity);

window.addEventListener('load',function(){
	displayHeight();
})

window.addEventListener('resize',function(){
	displayHeight();
})