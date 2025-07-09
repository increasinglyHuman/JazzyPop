# Working with main.py - IMPORTANT README

## Overview
The JazzyPop backend uses a modular approach where main.py imports additional functionality from separate files. This keeps main.py cleaner and makes updates easier.

## Current Modular Components

### 1. Quiz Answer Feedback API (`quiz_feedback_api.py`)
- **Purpose**: Provides endpoint for fetching validation-generated answer feedback captions
- **Endpoint**: `GET /api/content/quiz/{quiz_id}/answer-feedback-captions`
- **Added**: January 8, 2025
- **Required in main.py**:
  ```python
  # At top with other imports (around line 20)
  from quiz_feedback_api import get_quiz_feedback
  
  # After app creation, before app starts (around line 561)
  get_quiz_feedback(app, db)
  ```

## CRITICAL: Before Updating main.py

1. **ALWAYS backup first**:
   ```bash
   cp main.py main.py.backup_$(date +%Y%m%d_%H%M%S)
   ```

2. **Check what modules are imported**:
   ```bash
   grep "^from.*import" main.py | grep -v "^from fastapi\|^from typing\|^from uuid"
   ```

3. **Check for module registrations**:
   ```bash
   grep "get_.*(" main.py | grep -v "@app.get"
   ```

## How to Update main.py Safely

### Option 1: Manual Update (Recommended)
After replacing main.py with a new version:

1. Add the import at the top (with other local imports):
   ```python
   from quiz_feedback_api import get_quiz_feedback
   ```

2. Add the registration (near the bottom, before if __name__ == "__main__"):
   ```python
   # Register additional endpoints
   get_quiz_feedback(app, db)
   ```

### Option 2: Use the Patch Script
```bash
./patch_main_py.sh
```

This script automatically adds all required imports and registrations.

## Adding New Modular Components

When adding new functionality, follow this pattern:

1. Create a new file: `your_feature_api.py`
2. Define a registration function:
   ```python
   def register_your_feature(app, db):
       @app.get("/api/your/endpoint")
       async def your_endpoint():
           # implementation
   ```
3. Import and register in main.py:
   ```python
   from your_feature_api import register_your_feature
   # ...
   register_your_feature(app, db)
   ```
4. Update this documentation!

## Current Module Files

Keep these files safe - they contain important functionality:

- `quiz_feedback_api.py` - Answer feedback captions endpoint
- `database.py` - Database connection and operations
- `validation_worker.py` - Background validation processing
- `validation_service.py` - Validation logic
- `validation_prompts.py` - AI prompts for validation

## Emergency Recovery

If main.py gets messed up:

1. Check for recent backups:
   ```bash
   ls -la main.py.backup*
   ```

2. Restore from backup:
   ```bash
   cp main.py.backup_YYYYMMDD_HHMMSS main.py
   ```

3. Or use the known good version:
   ```bash
   cp main.py.known_good main.py
   ./patch_main_py.sh
   ```

## Testing After Updates

Always test that modular components are working:

```bash
# Test feedback API
curl http://localhost:8000/api/content/quiz/[valid-quiz-id]/answer-feedback-captions

# Check API docs
curl http://localhost:8000/docs
```

## Git Integration

When committing changes:
1. Commit main.py changes separately from module changes
2. Use clear commit messages:
   ```
   feat: Add quiz feedback API module
   
   - Add quiz_feedback_api.py for answer feedback captions
   - Update main.py to import and register the module
   ```

## Important Notes

- **Never** put all code directly in main.py - use modules
- **Always** document new modules in this file
- **Test** endpoints after any main.py update
- **Backup** before making changes

## Contact

If you're unsure about updating main.py, check:
1. This documentation
2. The backup files
3. The git history
4. The module files themselves for usage examples