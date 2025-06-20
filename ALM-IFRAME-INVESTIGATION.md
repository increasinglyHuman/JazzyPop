# ALM Iframe Investigation Transfer Document

## Issue Summary
The Kawaii Quiz app works perfectly everywhere EXCEPT as an ALM learner sidebar extension, where it flash-loads then disappears after ~1 second.

## Current Status (June 19, 2024 - Evening)

### What We've Discovered

1. **It's NOT a JavaScript crash** - The app loads and runs successfully. We see all console logs through initialization.

2. **It's NOT storage-related** - We commented out:
   - All localStorage usage
   - All sessionStorage usage  
   - Even removed axios temporarily (which was causing storage warnings)
   - The storage warnings disappeared but the iframe still gets removed

3. **ALM is actively removing the iframe** - After the app loads successfully, ALM:
   - Removes the entire iframe from the DOM
   - Triggers a "resize" event as it collapses the sidebar space
   - This is deliberate removal, not a crash

### Console Evidence
```
ALM Parameters received...
Found 2 authTokens, using: natext_889c7ba3537c42b38cb66752cc00bfac
About to add message event listener...
Event listener added successfully!
Constructor complete, calling init()...
Init method started!
Sending ready message...
Ready message sent
Requesting context...
Context request sent
Requesting course data...
Course data request sent
resize called main.0c473583.js:2:2794067  <-- ALM resizing after removal
```

### What Works
- ✅ Direct URL access
- ✅ Instructor extensions  
- ✅ Course-embedded extensions
- ✅ Simple HTML pages as learner sidebars

### What Fails
- ❌ ONLY learner sidebar extensions with JavaScript

## Files Modified During Investigation

### /kawaii-quiz-app/app.js
- Added debug logging throughout initialization
- Commented out sessionStorage usage (lines 17-18)
- Added handling for duplicate authToken parameters
- Added try/catch around event listeners

### /kawaii-quiz-app/unified-quiz-app.js  
- Commented out all localStorage usage (lines 110-121)

### /kawaii-quiz-app/chaos-toggle-system.js
- Commented out all localStorage usage (lines 175-183, 294-299)

### /kawaii-quiz-app/index.html
- No changes (kept axios as app requires it)

## Deployment Info
- **Server**: ubuntu@52.88.234.65
- **Key**: ~/.ssh/poqpoq2025.pem
- **Active Directory**: /home/ubuntu/kawaii-quiz-deploy/kawaii-quiz-app/
- **URL**: https://p0qp0q.com/apps/kawaii-quiz/

## Key Observations

1. **Two AuthTokens**: ALM sends duplicate authToken parameters in the URL. We handled this but it wasn't the cause.

2. **PostMessage Activity**: The app sends several postMessage calls to the parent window. This might trigger ALM's security policies.

3. **Timing**: The iframe is removed after ~1 second, which suggests ALM has a validation period where it checks the iframe before deciding to remove it.

4. **No Error Messages**: ALM removes the iframe silently without any console errors or warnings.

## Theories

1. **Missing Handshake**: ALM might expect a specific response/acknowledgment that learner sidebars must provide

2. **PostMessage Security**: Learner sidebars might not be allowed to send postMessage to parent

3. **Different Sandbox Policy**: Learner sidebars might have stricter security policies than other extension types

4. **API Access**: Although the admin app (which works) heavily uses APIs, the learner sidebar might have different API access rules

## Next Steps for Tomorrow

1. **Meeting with Viku** - He reportedly knows what might be causing this

2. **Test Minimal PostMessage** - Create version without any postMessage calls

3. **Check ALM Documentation** - Look for learner sidebar specific requirements

4. **Try Different Init Sequence** - Maybe ALM expects initialization in a specific order

5. **Console Monitoring** - Set up MutationObserver before loading to catch the exact moment of removal

## Questions for ALM Team

1. What are the specific requirements for learner sidebar extensions?
2. Is there a required handshake or initialization sequence?
3. Are postMessage calls restricted in learner sidebars?
4. Why do simple HTML pages work but JavaScript apps get removed?
5. Is there a way to see ALM's internal logs for why it removed the iframe?

## Contact Status
- Waiting for response from Viku
- 17 ALM engineers have been contacted
- Issue #2 filed on GitHub

---

**Last Updated**: June 19, 2024 - 10:45 PM
**Next Session**: Continue investigation after Viku meeting