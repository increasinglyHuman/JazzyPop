// Test script to verify session ID fix
console.log('=== Testing Session ID Fix ===');

// Check current state
const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
const userId = localStorage.getItem('userId');
const sessionId = localStorage.getItem('session_id');

console.log('Current state:');
console.log('- isAuthenticated:', isAuthenticated);
console.log('- userId:', userId);
console.log('- sessionId:', sessionId);

// Test API call
async function testAPICall() {
    const apiBase = 'https://p0qp0q.com';
    const params = new URLSearchParams();
    
    if (isAuthenticated && userId && !userId.startsWith('user_')) {
        params.append('user_id', userId);
        console.log('Using user_id for authenticated user');
    } else if (sessionId) {
        params.append('session_id', sessionId);
        console.log('Using session_id for anonymous user');
    }
    
    console.log('API params:', params.toString());
    
    try {
        const response = await fetch(`${apiBase}/api/economy/state?${params}`);
        console.log('API Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('API Response data:', data);
        } else {
            const errorText = await response.text();
            console.log('API Error:', errorText);
        }
    } catch (error) {
        console.error('API call failed:', error);
    }
}

// Run the test
testAPICall();