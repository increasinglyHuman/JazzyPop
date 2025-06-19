# GitHub Issue #2: Learner Sidebar Extension - UI Disappears After Rendering

## Description
The Kawaii Quiz app successfully initializes and renders the Quiz Hub UI when loaded as a learner sidebar extension in Adobe Learning Manager, but the interface disappears approximately 1 second after rendering. The application works perfectly when accessed directly via URL or when used as an instructor extension.

## Steps to Reproduce
1. Configure a native extension in ALM for learner sidebar
   - URL: `https://p0qp0q.com/kawaii-quiz/?authToken={{authToken}}`
   - Invocation Point: Learner sidebar
2. Log in to ALM as a learner
3. Click on the extension in the sidebar
4. Observe: Quiz Hub UI briefly appears then vanishes

## Expected Behavior
The Quiz Hub interface should remain visible and interactive, displaying:
- Daily themed challenges (e.g., "Wisdom Wednesday")
- Quiz category selection
- Streak tracking
- Points display

## Actual Behavior
- ✅ App initializes successfully
- ✅ Console shows "🎉 SHOWING UNIVERSAL QUIZ HUB!"
- ✅ UI renders with correct theme
- ❌ UI disappears after ~1 second
- ❌ ALM reloads iframe 3-4 times

## Environment
- **ALM Version**: Current production (December 2024)
- **Browser**: Confirmed on Firefox 139.0.4, Chrome, Safari
- **Extension Type**: Native Extension - Learner Sidebar
- **App Version**: 4.8

## Console Output
```javascript
🚀 KAWAII QUIZ INIT STARTING...
Context: { userId: "27023", courseId: null, userRole: "learner" }
🎮 Loading QUIZ HUB for learner (no courseId)
🎉 SHOWING UNIVERSAL QUIZ HUB!
Today's theme: { category: "wisdom", icon: "🧠", title: "Wisdom Wednesday" }
✅ INIT COMPLETE
// Above sequence repeats 3-4 times
```

## Additional Context
- **Direct URL Access**: ✅ Works perfectly at `https://p0qp0q.com/kawaii-quiz/?authToken=natext_...`
- **Instructor Extensions**: ✅ Functions correctly within courses
- **Console Warning**: "Partitioned cookie or storage access was provided... because it is loaded in the third-party context"
- **No JavaScript Errors**: Application executes without throwing any errors

## Attempted Solutions
1. Added initialization guard to prevent multiple instances
2. Wrapped localStorage in try/catch for iframe restrictions  
3. Removed all setTimeout delays
4. Simplified URL parameters to minimum required
5. Added cache-busting parameters to force fresh loads

## Questions for ALM Team
1. Are there different iframe sandboxing policies for learner sidebar extensions vs instructor extensions?
2. Is the multiple reload behavior (3-4 times) expected for sidebar extensions?
3. Are there specific lifecycle methods or keepalive mechanisms required for sidebar extensions?
4. Could this be related to third-party storage partitioning in cross-origin contexts?
5. Are there any Content Security Policy differences between extension types?

## Impact
This issue prevents learners from accessing the innovative Quiz Hub feature from the sidebar, limiting the app's reach to only course-specific contexts. The Quiz Hub was specifically designed to provide value without course context, making it perfect for sidebar placement.

## Workarounds
Currently, learners must access quizzes through course-specific extensions only, which limits the universal quiz features.

## Related Documentation
- [Full Technical Investigation](./ISSUE_2_LEARNER_SIDEBAR.md)
- [Status Update](./STATUS_UPDATE.md)
- [ALM Integration Guide](./docs/ALM_INTEGRATION.md)