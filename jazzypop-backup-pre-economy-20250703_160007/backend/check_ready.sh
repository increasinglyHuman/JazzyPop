#!/bin/bash
# Check if developer is ready to edit backend files

echo "=== Backend Edit Readiness Check ==="
echo

# Question 1
echo "Q1: What does Redis use to prevent file conflicts?"
echo "   a) File permissions"
echo "   b) File locking with timeouts"
echo "   c) User authentication"
read -p "Answer (a/b/c): " ans1

# Question 2
echo
echo "Q2: What must you do BEFORE editing any backend file?"
echo "   a) Stop the gunicorn service"
echo "   b) Clear the Redis cache"
echo "   c) Both a and b"
read -p "Answer (a/b/c): " ans2

# Question 3
echo
echo "Q3: What command safely edits quiz_generator.py?"
echo "   a) nano quiz_generator.py"
echo "   b) ./edit-backend.sh quiz_generator.py"
echo "   c) sudo vim quiz_generator.py"
read -p "Answer (a/b/c): " ans3

# Check answers
if [ "$ans1" = "b" ] && [ "$ans2" = "c" ] && [ "$ans3" = "b" ]; then
    echo
    echo "✅ Congratulations! You're ready to edit backend files."
    echo "Remember to always use the safe edit tools."
    echo
    echo "Quick reference:"
    echo "  ./edit-backend.sh <filename>"
    echo "  python safe_edit.py <filename>"
else
    echo
    echo "❌ Not quite ready yet!"
    echo "Please read REDIS_BACKEND_GUIDE.md first."
    echo
    echo "Correct answers: b, c, b"
fi