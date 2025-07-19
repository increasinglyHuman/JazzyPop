# Bulk Validation Monitoring Guide
*For the multi-day opinion question hunt running on p0qp0q.com*

## Current Status
- **Started:** July 19, 2025
- **Processing:** Up to 5,000 quiz sets
- **Expected Duration:** 2-3 days
- **Using:** Both Anthropic (Haiku) and OpenAI (GPT-3.5) APIs

## Quick Check Commands

### SSH into server
```bash
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com
cd ~/jazzypop-backend
```

### Check if still running
```bash
# Method 1: Check the saved PID
ps -p $(cat logs/bulk_validator.pid)

# Method 2: Look for the python process
ps aux | grep bulk_opinion_validator
```

### Monitor Progress
```bash
# See latest progress updates
grep "Progress:" logs/bulk_validation_*.log | tail -10

# Example output:
# 2025-07-19 01:07:17,464 - INFO - Progress: 15/20 sets validated
# 2025-07-19 01:07:31,697 - INFO - Progress: 20/20 sets validated

# Calculate completion percentage
grep "Progress:" logs/bulk_validation_*.log | tail -1
```

### Watch Live Output
```bash
# See what's happening right now
tail -f logs/bulk_validation_*.log

# Just errors
tail -f logs/bulk_validation_errors_*.log

# Exit with Ctrl+C
```

### Check Statistics
```bash
# See how many opinion questions found so far
grep "opinion_found" logs/bulk_validation_*.log | tail -5

# See API usage
grep "API USAGE" logs/bulk_validation_*.log -A 5
```

## What It's Doing

The validator is checking each quiz for:
- ❌ Opinion questions ("loves to", "coolest", "best")
- ❌ Overly long questions (>35 words) or answers (>8 words)  
- ❌ Questions with no verifiable correct answer
- ❌ Duplicate questions within sets

## Output Files

When complete, you'll find:
- `bulk_validation_report_[timestamp].json` - Full JSON report
- `bulk_validation_summary_[timestamp].txt` - Human-readable summary

## If You Need to Stop It
```bash
# Get the PID
cat logs/bulk_validator.pid

# Kill the process
kill [PID]

# Or find and kill
pkill -f bulk_opinion_validator
```

## After It Completes

1. **Check the summary:**
```bash
cat bulk_validation_summary_*.txt
```

2. **See how many partial sets were created:**
```bash
grep "Partial Sets Created:" bulk_validation_summary_*.txt
```

3. **Run the rebalancer** (only after you have many partial sets):
```bash
# First add the import to fix_quiz_sets_final.py if needed
python3 fix_quiz_sets_final.py
```

## Important Notes

- The validator marks each processed set with `opinion_checked: true` in metadata
- It won't reprocess already checked sets (unless you use --recheck flag)
- Partial sets are quiz sets with <10 questions after removing bad ones
- Wait until you have 100+ partial sets before running the rebalancer

## Troubleshooting

**If it seems stuck:**
- Check for rate limit messages in the log
- Normal to pause up to 50 seconds between API calls
- Both APIs respect their rate limits automatically

**If it crashed:**
- Check the error log: `logs/bulk_validation_errors_*.log`
- You can restart where it left off (it skips validated sets)
- Just run `./run_bulk_validation.sh` again

## Expected Results

From our test of 20 sets:
- Found 25% had opinion questions
- Created 30% partial sets
- ~4-5 seconds per quiz set

For 5,000 sets expect:
- ~1,250 sets with opinion questions
- ~1,500 partial sets created
- 2-3 days total runtime

## Commands Summary Card
```bash
# Quick status check from your local machine
ssh -i ~/.ssh/poqpoq2025.pem ubuntu@p0qp0q.com \
  "cd ~/jazzypop-backend && \
   ps -p \$(cat logs/bulk_validator.pid) && \
   grep 'Progress:' logs/bulk_validation_*.log | tail -1"
```

Good luck! Check back in a couple days for a treasure trove of partial sets ready for rebalancing! 🎯