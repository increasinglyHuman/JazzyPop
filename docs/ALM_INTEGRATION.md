# Adobe Learning Manager (ALM) Integration Guide

## Overview

JazzyPop is designed to work as a native extension within Adobe Learning Manager. This document covers the integration challenges and current implementation details.

## Native Extension Setup

### 1. Configure in ALM Admin Panel

1. Navigate to **Admin** → **Native Extensions**
2. Click **Add Extension**
3. Configure:
   - **Name**: Kawaii Quiz Creator
   - **URL**: `https://yourdomain.com/kawaii-quiz/`
   - **Open in**: Modal (recommended) or New Tab
   - **Invocation Point**: Course instances
   - **Scope**: All courses or selected courses

### 2. Parameters Received

ALM passes these parameters to the extension:

```javascript
{
  userRole: "instructor",        // or "learner"
  userId: "27023",
  locale: "en_US",
  authToken: "natext_xxx...",   // Native extension token
  loId: "course:13820572",      // Learning object ID
  loInstanceId: "course:13820572_14528907"
}
```

## 🚨 Current Integration Issues

### 1. Authentication Problem

**Issue**: The `authToken` (format: `natext_xxx...`) doesn't work with ALM's standard API.

```javascript
// This returns 400 Bad Request
fetch('https://learningmanager.adobe.com/primeapi/v2/user', {
  headers: {
    'Authorization': `oauth ${authToken}`
  }
});
```

**Attempted Solutions**:
- Different auth header formats (`Bearer`, `oauth`, direct token)
- Proxy server to handle CORS
- Using browser's existing session

**Status**: ❌ Unresolved - Awaiting Adobe guidance

### 2. PostMessage Communication

**Issue**: No response from parent ALM window to postMessage requests.

```javascript
// These receive no response
window.parent.postMessage({
  type: 'ALM_EXTENSION_REQUEST',
  action: 'getCourseData',
  courseId: this.context.courseId
}, '*');
```

**Status**: ❌ No documented postMessage API

### 3. Course Data Access

**Issue**: Cannot retrieve course name, description, or metadata.

**Current Workaround**: 
- Display "This Course" as fallback
- Manual course detail input form

## Deployment Architecture

```
User Browser
    │
    ├── ALM (learningmanager.adobe.com)
    │   │
    │   └── Native Extension iFrame
    │       │
    │       ├── Frontend (p0qp0q.com/kawaii-quiz/)
    │       │   ├── app.js
    │       │   ├── styles.css
    │       │   └── index.html
    │       │
    │       └── API Calls to Backend
    │
    └── Backend Server (p0qp0q.com:3001)
        ├── Quiz Storage (JSON files)
        ├── AI Integration (Anthropic)
        └── ALM Proxy Endpoints
```

## Security Considerations

1. **CORS**: Backend configured to accept requests from ALM domains
2. **Token Validation**: Currently unable to validate `natext_` tokens
3. **Data Isolation**: Quizzes stored by courseId

## Recommendations for Adobe

1. **Documentation**: Create specific guides for native extension developers
2. **API Access**: Provide a way for extensions to access course data
3. **Token Usage**: Document how `natext_` tokens should be used
4. **PostMessage API**: Implement or document parent-child communication
5. **Examples**: Provide sample native extensions with API integration

## Alternative Approaches

If Adobe doesn't provide native extension API access:

1. **Admin API**: Use separate admin credentials (not ideal)
2. **Manual Input**: Current workaround - users input course details
3. **URL Parameters**: Request Adobe to pass more data in URL
4. **Headless LMS**: Full external implementation (loses native benefits)

## Resources

- [ALM Developer Manual](https://experienceleague.adobe.com/en/docs/learning-manager/using/integration/developer-manual)
- [Native Extensibility Docs](https://experienceleague.adobe.com/en/docs/learning-manager/using/admin/native-extensibility)
- [GitHub Issues](https://github.com/yourusername/JazzyPop/issues)