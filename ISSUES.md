# GitHub Issues for JazzyPop

## Issue #1: ALM Native Extension API Authentication

**Title**: Native extension tokens (natext_) return 400 Bad Request on all API calls

**Labels**: `bug`, `help wanted`, `integration`, `adobe-alm`

**Description**:

### Problem
Our native extension receives an authentication token from ALM in the format `natext_xxxxxxxx`. However, all attempts to use this token with ALM's API result in 400 Bad Request errors.

### Current Behavior
1. Extension receives parameters including `authToken=natext_e092ae6584ff4524b69e133f710bb98b`
2. All API calls return 400 Bad Request
3. No postMessage responses from parent ALM window

### Expected Behavior
Native extensions should be able to access course data (name, description, etc.) using the provided token.

### Code References

**Frontend authentication attempts** (`app.js:260-350`):
```javascript
// Attempt 1: PostMessage approach
window.parent.postMessage({
    type: 'ALM_EXTENSION_REQUEST',
    action: 'getCourseData',
    courseId: this.context.courseId
}, '*');

// Attempt 2: Direct API with natext token
const response = await fetch(
    `https://learningmanager.adobe.com/primeapi/v2/learningObjects/${courseId}`,
    {
        headers: {
            'Authorization': `oauth ${authToken}`, // natext_ token
            'Accept': 'application/vnd.api+json'
        }
    }
);
// Result: 400 Bad Request
```

**Backend proxy attempts** (`server-simple.js:238-246`):
```javascript
// Tried multiple auth header formats
if (authToken.startsWith('natext_')) {
    authHeader = `oauth ${authToken}`;
}
// Still returns 400
```

### Questions for Adobe

1. How should native extension tokens (`natext_` format) be used for API authentication?
2. Is there a different API endpoint specifically for native extensions?
3. Is there a postMessage API for native extensions to request course data?
4. Do native extensions require a different authentication flow?
5. Is there documentation specifically for native extension API access?

### Workaround
Currently using manual course detail input as a fallback.

---

## Issue #2: Course Data Access Within Native Extensions

**Title**: Unable to access course name and metadata from within ALM native extension

**Labels**: `enhancement`, `documentation`, `adobe-alm`

**Description**:

### Problem
Native extensions run inside an authenticated ALM session but have no documented way to access basic course information like name and description.

### Current Attempts
1. URL parameters only provide `loId` (learning object ID), not course name
2. PostMessage requests to parent window receive no response
3. Browser's existing session cookies don't work with CORS

### Impact
- App displays "This Course" instead of actual course name
- AI question generation lacks course context
- Poor user experience

### Ideal Solution
A documented API or postMessage interface for native extensions to access:
- Course name
- Course description/overview
- Course skills/tags
- Module information

---

## Issue #3: Documentation Gap for Native Extension Developers

**Title**: No specific documentation for ALM native extension development

**Labels**: `documentation`, `adobe-alm`

**Description**:

The current ALM developer documentation covers standard OAuth flows but doesn't address:
- How native extensions should authenticate
- What APIs are available to native extensions
- PostMessage communication protocols
- Security considerations for extensions
- Best practices for extension development

### Requested Documentation
1. Native Extension Developer Guide
2. API Reference for Extensions
3. Authentication flow diagrams
4. Code examples
5. Debugging tips