document.addEventListener("DOMContentLoaded", function() {
    // Array of possible shapes
    const shapes = ['square', 'circle'];

    // Function to generate a random number within a range
    function getRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Function to generate a random shape
    function generateRandomShape() {
        // Loop through each face class
        const faceClasses = ['a', 'b', 'c', 'd', 'e', 'f'];
        faceClasses.forEach(function(faceClass) {
            // Get a random shape from the shapes array
            const randomShape = shapes[getRandomNumber(0, shapes.length - 1)];

            // Create a new element for the shape
            const shapeElement = document.createElement("div");
            shapeElement.classList.add("face", randomShape);
            shapeElement.classList.add(faceClass);

            // Set random position and rotation
            const posX = getRandomNumber(-50, 50); // Adjust based on shape size
            const posY = getRandomNumber(-50, 50); // Adjust based on shape size
            const rotation = getRandomNumber(0, 360); // Random rotation angle
            shapeElement.style.transform = `translate(${posX}px, ${posY}px) rotate(${rotation}deg)`;

            // Set random color
            const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
            shapeElement.style.backgroundColor = randomColor;

            // Append the shape to the appropriate face class
            document.querySelector(`.${faceClass}`).appendChild(shapeElement);
        });
    }

    // Generate random shapes on page load
    generateRandomShape();
});
