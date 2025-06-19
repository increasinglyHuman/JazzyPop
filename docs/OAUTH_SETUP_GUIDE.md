# OAuth Setup Guide for Adobe Learning Manager

This guide will walk you through setting up OAuth authentication for your ALM native extension.

## Prerequisites

- Admin access to Adobe Learning Manager
- A registered domain for your application
- Access to Adobe's token generation tool

## Step 1: Register Your Application in ALM

1. Log in to ALM as an Administrator
2. Navigate to **Integration Admin** → **Applications**
3. Click **Register** to create a new application
4. Fill in the details:
   - **Application Name**: Kawaii Quiz Creator
   - **Description**: Native extension for creating fun quizzes
   - **Redirect URL**: `https://yourdomain.com/callback`
   - **Scopes**: Select the following:
     - `learner:read` - Read learner data
     - `learner:write` - Update learner progress
     - `admin:read` - Read course information
5. Click **Save**
6. **IMPORTANT**: Copy and save:
   - Client ID
   - Client Secret
   - Application ID

## Step 2: Generate OAuth Tokens for Testing

### Using Adobe's Token Tool

1. Go to: https://learningmanager.adobe.com/apidocs
2. Scroll to "Access Tokens for Testing and Development"

### 2.1 Get OAuth Code

1. In the **Get OAuth Code** section:
   - **Client ID**: `[Your Client ID from Step 1]`
   - **Redirect URI**: `https://yourdomain.com/callback`
   - **Scopes**: `learner:read,learner:write`
2. Click **Get OAuth Code**
3. You'll be redirected to your callback URL with a code parameter
4. Copy the code from the URL: `https://yourdomain.com/callback?code=XXXXXX`

### 2.2 Get Refresh Token

1. In the **Get Refresh Token** section:
   - **Client ID**: `[Your Client ID]`
   - **Client Secret**: `[Your Client Secret]`
   - **OAuth Code**: `[Code from previous step]`
2. Click **Get Refresh Token**
3. Save the refresh token securely

### 2.3 Get Access Token

1. In the **Get Access Token** section:
   - **Client ID**: `[Your Client ID]`
   - **Client Secret**: `[Your Client Secret]`
   - **Refresh Token**: `[Token from previous step]`
2. Click **Get Access Token**
3. You'll receive an access token valid for 3600 seconds (1 hour)

## Step 3: Test Your Access Token

### Using the Token Tool

1. In the **Get Access Token Details** section:
   - **Access Token**: `[Your access token]`
2. Click **Get Details**
3. Verify the token shows your correct scopes and expiration

### Using cURL

```bash
curl -X GET \
  'https://learningmanager.adobe.com/primeapi/v2/user' \
  -H 'Authorization: oauth YOUR_ACCESS_TOKEN' \
  -H 'Accept: application/vnd.api+json'
```

### Using JavaScript

```javascript
const testToken = async (accessToken) => {
    try {
        const response = await fetch('https://learningmanager.adobe.com/primeapi/v2/user', {
            headers: {
                'Authorization': `oauth ${accessToken}`,
                'Accept': 'application/vnd.api+json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Success! User data:', data);
        } else {
            console.error('Error:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Request failed:', error);
    }
};
```

## Step 4: Implement in Your Application

### Backend Implementation

Since native extensions can't store secrets, implement OAuth on your backend:

```javascript
// backend/services/almAuth.js
class ALMAuthService {
    constructor() {
        this.clientId = process.env.ALM_CLIENT_ID;
        this.clientSecret = process.env.ALM_CLIENT_SECRET;
        this.refreshToken = process.env.ALM_REFRESH_TOKEN;
        this.accessToken = null;
        this.tokenExpiry = null;
    }
    
    async getAccessToken() {
        // Check if current token is still valid
        if (this.accessToken && this.tokenExpiry > Date.now()) {
            return this.accessToken;
        }
        
        // Refresh the token
        const response = await fetch('https://learningmanager.adobe.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'client_id': this.clientId,
                'client_secret': this.clientSecret,
                'refresh_token': this.refreshToken,
                'grant_type': 'refresh_token'
            })
        });
        
        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        
        return this.accessToken;
    }
}
```

### Frontend (Native Extension) Implementation

```javascript
// In your native extension
async function getCourseData(courseId) {
    // Use your backend as a proxy
    const response = await fetch(`https://yourbackend.com/api/alm/course/${courseId}`, {
        headers: {
            'X-Extension-Token': natext_token,  // Pass for validation
            'X-User-Id': userId
        }
    });
    
    return response.json();
}
```

## Step 5: Environment Variables

Create a `.env` file for your backend:

```env
# Adobe Learning Manager OAuth
ALM_CLIENT_ID=your_client_id_here
ALM_CLIENT_SECRET=your_client_secret_here
ALM_REFRESH_TOKEN=your_refresh_token_here

# Your API URL
API_BASE_URL=https://learningmanager.adobe.com/primeapi/v2
```

## Troubleshooting

### Common Issues

1. **"Invalid client" error**
   - Verify your Client ID and Client Secret are correct
   - Ensure you're using the correct ALM instance URL

2. **"Invalid redirect URI" error**
   - The redirect URI must match exactly what's registered
   - Include the protocol (https://)
   - No trailing slashes

3. **"Invalid scope" error**
   - Use comma-separated scopes without spaces
   - Ensure scopes are approved for your application

4. **Token expires quickly**
   - Access tokens expire in 1 hour
   - Implement automatic token refresh in your backend

### Security Best Practices

1. **Never expose secrets in frontend code**
2. **Use environment variables for sensitive data**
3. **Implement token refresh logic**
4. **Validate native extension tokens before making API calls**
5. **Use HTTPS for all communications**
6. **Implement rate limiting on your proxy endpoints**

## Next Steps

1. Implement automatic token refresh
2. Add caching for API responses
3. Create user-specific token management
4. Monitor API usage and quotas

## Additional Resources

- [ALM API Documentation](https://learningmanager.adobe.com/docs/primeapi/v2/)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [ALM Developer Forum](https://experienceleaguecommunities.adobe.com/t5/adobe-learning-manager/ct-p/adobe-learning-manager-community)