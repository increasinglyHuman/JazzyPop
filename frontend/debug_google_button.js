// Debug script for Google Sign-In button
// Add this to the console to debug

// Check if Google SDK is loaded
console.log('Google SDK loaded?', typeof google !== 'undefined');

// Check if button element exists
const buttonElement = document.getElementById('googleSignInButton');
console.log('Google button element:', buttonElement);

// Check if Google Sign-In is initialized
if (typeof google !== 'undefined' && google.accounts) {
    console.log('Google accounts available:', google.accounts);
    console.log('Google ID available:', google.accounts.id);
}

// Try to manually trigger the sign-in
function manualGoogleSignIn() {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        google.accounts.id.prompt();
        console.log('Triggered Google sign-in prompt');
    } else {
        console.log('Google SDK not available');
    }
}

// Add click listener to see if clicks are registering
if (buttonElement) {
    buttonElement.addEventListener('click', () => {
        console.log('Google button clicked!');
    });
}

console.log('Debug script loaded. Try manualGoogleSignIn() to test.');