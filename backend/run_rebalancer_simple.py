#!/usr/bin/env python3
"""
Simple runner that loads .env file properly
"""

import os
import sys
from pathlib import Path

# Load .env file
env_path = Path('.env')
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                # Remove quotes if present
                value = value.strip('"').strip("'")
                os.environ[key] = value

# Now run the rebalancer
import asyncio
from fix_quiz_sets_final import main

if __name__ == "__main__":
    asyncio.run(main())