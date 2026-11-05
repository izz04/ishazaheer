"use strict";
console.clear();

class Renderer
{
	constructor(canvas)
	{
		this.canvas = canvas;
		this.context = canvas.getContext("2d");
		
		this.shapes = [];
		
		this.shapeCount = 5;
		this.shapeSides = new Range(3, 15);
		this.minShapeRadius = 40;
		this.shapeRadiusBorder = 10;
		this.rotationSpeed = new Range(0.001, 0.015);
		
		this.recalculateShapes();
		
		this.trackKeyboard();
		this.trackWindowSize();
	}
	
	recalculateShapes()
	{
		this.shapes = [];
		
		var minSideLength = Math.min(window.innerWidth, window.innerHeight),
			radiusStep = ((minSideLength / 2) - this.minShapeRadius - this.shapeRadiusBorder) / this.shapeCount,
			shapePosition = new Vector(
				window.innerWidth / 2,
				window.innerHeight / 2
			);
		
		for(let i = this.minShapeRadius; i < (minSideLength / 2) - this.shapeRadiusBorder; i += radiusStep)
		{
			let sideCount = Math.round(Math.random() * (this.shapeSides.max - this.shapeSides.min)) + this.shapeSides.min,
				rotation = Math.random() * Math.PI * 2;
			this.shapes.push(new Shape(
				shapePosition.clone(),
				sideCount, i, rotation
			));
			
			let dir = Math.random() > 0.5 ? "left" : "right",
				speed = Math.random()*(this.rotationSpeed.max - this.rotationSpeed.min) + this.rotationSpeed.min;
			this.shapes[this.shapes.length - 1].dir = dir;
			this.shapes[this.shapes.length - 1].rotationSpeed = speed;
			
		}
	}
	
	nextFrame()
	{
		this.update();
		this.render(this.canvas, this.context);
		//requestAnimationFrame(this.nextFrame.bind(this));
		setTimeout(this.nextFrame.bind(this), 1000 / 30);
	}
	
	update()
	{
		for(let i = 0; i < this.shapes.length; i++)
		{
			let increment = this.shapes[i].rotationSpeed;
			if(this.shapes[i].dir == "left")
				increment = -increment;
			this.shapes[i].rotate(increment, false);
		}
	}
	
	render(canvas, context)
	{
		context.clearRect(0, 0, canvas.width, canvas.height);
		
		/*
		var shape = new Shape(new Vector(100, 100), 5, 60);
		context.beginPath();
		shape.lines(context);
		context.stroke();
		*/
		context.fillStyle = "rgba(255, 153, 204, 0.17)";
		for(let i = this.shapes.length - 1; i >= 0; i--)
		{
			context.beginPath();
			this.shapes[i].lines(context);
			context.fill();
		}
	}
	
	trackKeyboard() {
		document.body.addEventListener("keyup", (function(event) {
			switch(event.keyCode)
			{
				case 82: // r
					this.recalculateShapes();
					break;
			}
		}).bind(this));
	}
	
	/**
	 * Updates the canvas size to match the current viewport size.
	 */
	matchWindowSize() {
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		
		this.recalculateShapes();
	}
	
	/**
	 * Makes the canvas size track the window size.
	 */
	trackWindowSize() {
		this.matchWindowSize();
		window.addEventListener("resize", this.matchWindowSize.bind(this));
	}
}

class Shape
{
	constructor(pos, sides, radius, rotation)
	{
		this.position = pos;
		this.rotation = (typeof rotation == "number") ? rotation : 0;
		this.radius = radius;
		this.sides = sides;
		
		this.points = [];
		
		this.recalculatePoints();
	}
	
	get firstPoint()
	{
		return this.points[0];
	}
	
	get lastPoint()
	{
		return this.points[this.points.length - 1];
	}
	
	// From http://stackoverflow.com/a/7198179/1460422
	recalculatePoints()
	{
		this.points = [];
		for(let n = 0; n < this.sides; n++)
		{
			this.points.push(new Vector(
				this.radius * Math.cos(Math.PI*2 * (n / this.sides) + this.rotation - Math.PI/2) + this.position.x,
				this.radius * Math.sin(Math.PI*2 * (n / this.sides) + this.rotation - Math.PI/2) + this.position.y
			));
		}
	}
	
	rotate(rotation, absolute)
	{
		if(!absolute)
			this.rotation += rotation;
		else
			this.rotation = rotation;
		
		this.recalculatePoints();
	}
	
	translate(vector, absolute)
	{
		if(!absolute)
			this.position.add(vector);
		else
			this.position = vector;
		
		this.recalculatePoints();
	}
	
	lines(context, sidelimit)
	{
		for(let i = 0; i < this.points.length; i++)
		{
			context.lineTo(this.points[i].x, this.points[i].y);
			
			if(typeof sidelimit == "number" && i >= sidelimit - 1)
				return;
		}
		context.lineTo(this.points[0].x, this.points[0].y)
	}
}

/// Range.js@v0.1 by Starbeamrainbowlabs ///
class Range
{
	constructor(inMin, inMax) {
		if(inMin > inMax)
			throw new Error(`Min is bigger than max! (min: ${inMin}, max: ${inMax})`);
		this.min = inMin;
		this.max = inMax;
	}
}

window.addEventListener("load", function (event) {
	var canvas = document.getElementById("canvas-main"),
		renderer = new Renderer(canvas);
	renderer.nextFrame();
	window.renderer = renderer;
});