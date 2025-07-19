// Fix for Google Sign-in to use AuthPanel

// This replaces the signInWithGoogle function in dashboard.js
// to properly use the AuthPanel's handleGoogleAuth method

const fixedSignInWithGoogle = `
// Updated sign-in function for button click
function signInWithGoogle() {
    // Use the Google Sign-In prompt which will trigger the callback
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        google.accounts.id.prompt();
    } else {
        console.warn('Google Sign-In not initialized');
        showToast('Google Sign-In is not available', 'error');
    }
}
`;

// Also update the handleGoogleSignIn to use AuthPanel
const fixedHandleGoogleSignIn = `
// Handle Google sign-in response
async function handleGoogleSignIn(response) {
    // Use AuthPanel to handle the Google auth properly
    if (window.authPanel) {
        const result = await window.authPanel.handleGoogleAuth(response);
        if (!result.success) {
            showToast('Failed to sign in with Google', 'error');
        }
    } else {
        console.error('AuthPanel not initialized');
        showToast('Authentication system not ready', 'error');
    }
}
`;

console.log("To fix Google Sign-in:");
console.log("1. Replace signInWithGoogle function in dashboard.js");
console.log("2. Replace handleGoogleSignIn function in dashboard.js");
console.log("3. Ensure Google callback uses handleGoogleSignIn");