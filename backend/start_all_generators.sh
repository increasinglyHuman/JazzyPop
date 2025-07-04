#!/bin/bash
# Start all content generators

cd /home/ubuntu/jazzypop-backend
source venv/bin/activate

echo "Starting all content generators..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Start each generator in background
echo "Starting quiz generator..."
nohup python quiz_generator.py > logs/quiz_generator.log 2>&1 &
echo "Quiz generator PID: $!"

sleep 2

echo "Starting pun generator..."
nohup python pun_generator.py > logs/pun_generator.log 2>&1 &
echo "Pun generator PID: $!"

sleep 2

echo "Starting quote generator..."
nohup python quote_generator.py > logs/quote_generator.log 2>&1 &
echo "Quote generator PID: $!"

sleep 2

echo "Starting trivia generator..."
nohup python trivia_generator.py > logs/trivia_generator.log 2>&1 &
echo "Trivia generator PID: $!"

sleep 2

echo "Starting joke generator..."
nohup python joke_generator.py > logs/joke_generator.log 2>&1 &
echo "Joke generator PID: $!"

echo ""
echo "All generators started. Check logs in ./logs/"
echo "To monitor: tail -f logs/*.log"
echo "To stop all: pkill -f 'python.*generator.py'"