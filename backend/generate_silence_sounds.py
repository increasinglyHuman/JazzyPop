#!/usr/bin/env python3
"""
Generate awkward silence/cricket sounds for joke punchlines
"""

import requests
import json
import os
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key from environment
API_KEY = os.getenv('ELEVENLABS_API_KEY')
if not API_KEY:
    print("Error: ELEVENLABS_API_KEY not found in environment variables")
    exit(1)

SOUND_URL = "https://api.elevenlabs.io/v1/sound-generation"

headers = {
    "xi-api-key": API_KEY,
    "Content-Type": "application/json"
}

output_dir = "../frontend/src/trombone_audio/comedy_emphasis"
os.makedirs(output_dir, exist_ok=True)

# Awkward silence sounds
silence_sounds = [
    {
        "prompt": "Single cricket chirping in silence, awkward comedy moment",
        "filename": "cricket_awkward.mp3",
        "duration": 3.0
    },
    {
        "prompt": "Multiple crickets chirping, outdoor night silence",
        "filename": "crickets_silence.mp3",
        "duration": 3.0
    },
    {
        "prompt": "Old clock ticking in empty room, awkward pause waiting",
        "filename": "clock_ticking.mp3",
        "duration": 3.0
    },
    {
        "prompt": "Tumbleweed rolling wind blowing, western desert silence",
        "filename": "tumbleweed.mp3",
        "duration": 3.0
    },
    {
        "prompt": "Single person coughing in silent auditorium, awkward moment",
        "filename": "awkward_cough.mp3",
        "duration": 2.0
    },
    {
        "prompt": "Distant wolf howl echo, lonely empty feeling",
        "filename": "wolf_howl_distant.mp3",
        "duration": 3.0
    },
    {
        "prompt": "Water drip echo in empty cave, desolate silence",
        "filename": "water_drip_echo.mp3",
        "duration": 3.0
    }
]

for sound in silence_sounds:
    print(f"Generating: {sound['filename']}...")
    
    data = {
        "text": sound["prompt"],
        "duration_seconds": sound["duration"],
        "prompt_influence": 0.3
    }
    
    try:
        response = requests.post(SOUND_URL, headers=headers, json=data)
        
        if response.status_code == 200:
            output_path = os.path.join(output_dir, sound["filename"])
            with open(output_path, "wb") as f:
                f.write(response.content)
            print(f"✓ Saved: {output_path}")
        else:
            print(f"✗ Error: {response.status_code} - {response.text}")
    
    except Exception as e:
        print(f"✗ Failed: {str(e)}")
    
    # Be nice to the API
    time.sleep(2)

print("\nDone! Generated sounds are in:", output_dir)