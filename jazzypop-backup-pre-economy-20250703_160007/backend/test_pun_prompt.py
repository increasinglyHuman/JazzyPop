#!/usr/bin/env python3
"""Test what we're asking Haiku for pun sets"""

categories = ["food", "animals", "technology", "music", "sports",
              "nature", "school", "work", "travel", "weather"]

themes_list = ", ".join(categories)

prompt = f"""Generate 10 family-friendly puns about {themes_list}.

        REQUIREMENTS FOR EACH PUN:
        1. Create a setup and punchline format
        2. Make it groan-worthy but clever
        3. Keep it appropriate for all ages
        4. Create a fill-in-the-blank challenge from the punchline
        5. Mix themes to create variety
        6. Vary difficulty between easy, medium, and hard
        
        Return a JSON array with exactly 10 puns in this format:
        [
            {{
                "id": 1,
                "content": "The setup question or statement",
                "punchline": "The punny answer",
                "category": "bad_puns",
                "difficulty": "easy|medium|hard",
                "challengeType": "fill-blank",
                "challenge": "The punchline with one word as ____",
                "answer": "The missing word",
                "hint": "A clue about the wordplay",
                "theme": "food|animals|technology|etc"
            }},
            ... (9 more puns)
        ]
        
        Examples of good puns:
        - "Why don't scientists trust atoms?" / "Because they make up everything!"
        - "What do you call a fake noodle?" / "An impasta!"
        - "Why did the scarecrow win an award?" / "He was outstanding in his field!"
        
        Make sure to:
        - Include wordplay, double meanings, or sound-alike words
        - Mix different types of puns (homophone, compound, recursive)
        - Create engaging setups that make people want to hear the punchline
        - Make the fill-in-the-blank challenge use the key pun word
        """

print("PROMPT FOR HAIKU:")
print("="*60)
print(prompt)
print("="*60)
print(f"\nPrompt length: {len(prompt)} characters")
print(f"Themes requested: {themes_list}")
print("\nKey requirements:")
print("- 10 puns total")
print("- Setup/punchline format")
print("- Fill-in-the-blank challenge for each")
print("- Mixed themes from: food, animals, technology, music, sports, nature, school, work, travel, weather")
print("- Varied difficulty: easy, medium, hard")
print("- JSON array format with specific fields")