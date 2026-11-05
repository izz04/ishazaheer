// JavaScript Document

const page=document.querySelector('body');
const scene=document.querySelector('#scene');
const plane=document.querySelector('#plane');
displayHeight = () => scene.style.height=window.innerHeight+'px';

elementTransform = () =>{
	let pageDimensions=page.getBoundingClientRect();
	let schrollPercentage=Math.abs(pageDimensions.top)/(pageDimensions.height)-window.innerHeight);
	console.log(schrollPercentage);
}

window.addEventListener('load',displayHeight);
window.addEventListener('scroll',elementTransform);
window.addEventListener('resize',function(){
	displayHeight();
})