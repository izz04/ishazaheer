/*
JavaScript Basics
*/

// Writing to the web console
console.log('check 1, 2 . . . ');

// Assigning values to new variables
let color = 'purple';
let year = 2024;
const semester = 'Spring';

/* Math operators

+
-
*
/
++
--
=

*/

// String Concatenation
let message = semester + ' of ' + year;
message=`${semester} of ${year}`;

//Template Strings
console.log(message);

// HTML elements are strings
let htmlElement = '<img src="cat.png">';

/* Comparison operators

<
>
<=
>=
!=
==
===
!==
&&
||

*/

// JavaScript array
let colors = [
  "black",
  "red",
  "green",
  "blue",
  "yellow",
  "white"
];

// Accessing items in an array
let firstColor = colors[0];
console.log(firstColor);

for (let i=0;i<colors.length;i++){
	let color=colors[i];
	console.log (color);
}

color.ForEach((color)=> console.log(color));


myMessage = () =>console.log ("Good Afternoon");

myMessage();
