// Add these constants outside the function if they aren't already
const confettiGroup = document.getElementById('confetti-group');
const confettiShapes = ['#confetti-rect', '#confetti-circle', '#confetti-triangle'];
const confettiColors = ['#f9423a', '#62cf39', '#20c2e0', '#ffb33f', '#a562ff'];
const confettiCount = 50;
const animationDuration = 1500; // in milliseconds, from the CSS
const maxAnimationDelay = 200; // in milliseconds, from the JS

function createConfetti() {
    // This function now adds a new burst without clearing the old ones.

    for (let i = 0; i < confettiCount; i++) {
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');

        // Pick a random shape and color
        const shape = confettiShapes[Math.floor(Math.random() * confettiShapes.length)];
        const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];

        use.setAttribute('href', shape);
        use.setAttribute('fill', color);
        use.classList.add('confetti');

        // Set random values for the animation via CSS Custom Properties
        use.style.setProperty('--x-end', `${(Math.random() - 0.5) * 500}px`);
        use.style.setProperty('--y-end', `${(Math.random() - 0.5) * 500}px`);
        use.style.setProperty('--rotate-end', `${Math.random() * 1080}deg`);

        // Add a random delay to stagger the burst
        const delay = Math.random() * maxAnimationDelay;
        use.style.animationDelay = `${delay}ms`;

        // Add the .animate class to trigger the animation
        use.classList.add('animate');

        confettiGroup.appendChild(use);
        
        // **THE CORRECTION IS HERE**
        // Set a timeout to remove the element after the animation is completely finished.
        // We add a small buffer (50ms) to be safe.
        const removalTimeout = animationDuration + delay + 50;

        setTimeout(() => {
            use.remove();
        }, removalTimeout);
    }
}