#!/bin/bash
# Start all content set generators (generates sets of 10 items)

echo "Starting all content set generators..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Start quiz generator (individual quizzes - keep for now)
echo "Starting quiz generator..."
nohup python quiz_generator.py > logs/quiz_generator.log 2>&1 &
echo "Quiz generator PID: $!"

# Start pun set generator
echo "Starting pun set generator..."
nohup python pun_set_generator.py > logs/pun_set_generator.log 2>&1 &
echo "Pun set generator PID: $!"

# Start quote set generator
echo "Starting quote set generator..."
nohup python quote_set_generator.py > logs/quote_set_generator.log 2>&1 &
echo "Quote set generator PID: $!"

# Start trivia set generator
echo "Starting trivia set generator..."
nohup python trivia_set_generator.py > logs/trivia_set_generator.log 2>&1 &
echo "Trivia set generator PID: $!"

# Start joke set generator
echo "Starting joke set generator..."
nohup python joke_set_generator.py > logs/joke_set_generator.log 2>&1 &
echo "Joke set generator PID: $!"

echo ""
echo "All set generators started. Check logs in ./logs/"
echo "To monitor: tail -f logs/*.log"
echo "To stop all: pkill -f '_set_generator.py'"
echo ""
echo "Note: These generators create sets of 10 items each,"
echo "which is more efficient than individual generation."