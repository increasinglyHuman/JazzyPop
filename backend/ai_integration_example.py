"""
AI Integration Example for Quiz Generation
This shows how to integrate with OpenAI or similar APIs
"""
import os
import json
import aiohttp
from typing import Dict, Any

class AIQuizGenerator:
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.api_url = "https://api.openai.com/v1/chat/completions"
        
    async def generate_quiz_with_ai(self, category: str) -> Dict[str, Any]:
        """Generate quiz using OpenAI API"""
        
        # Enhanced prompt with all the creativity guidelines
        system_prompt = """You are a creative quiz master for JazzyPop, a fun educational quiz app. 
        Generate engaging, surprising trivia questions that make people go "wow!" or laugh.
        Always return valid JSON matching the specified format."""
        
        user_prompt = f"""Create an engaging, creative trivia question about {category}.

        CREATIVITY REQUIREMENTS:
        - Make the question surprising, fun, or thought-provoking
        - Use vivid language, interesting angles, or unexpected connections
        - Mix difficulty levels: sometimes easy & fun, sometimes challenging & obscure
        - Include questions about: recent events, pop culture mashups, weird facts, historical oddities
        - Frame questions in creative ways: "What do X and Y have in common?", "Which came first?", etc.
        
        VARIETY GUIDELINES:
        - Rotate between different question types:
          * Superlatives (biggest, oldest, first, last)
          * Connections/relationships between things
          * Timeline/chronology questions
          * "Which of these is NOT..." questions
          * Numerical facts with surprising answers
          * Cultural phenomena and trends
          * Scientific discoveries with fun twists
          * Etymology and word origins
          * Common misconceptions
        
        ANSWER DESIGN:
        - Make wrong answers plausible but clearly incorrect when you know the fact
        - Include one "obviously wrong but funny" option occasionally
        - Mix answer lengths - not always the longest is correct
        - Use creative distractors that teach something even when wrong
        
        Return JSON with this exact format:
        {{
            "question": "Your creative question here",
            "answers": [
                {{"id": "a", "text": "First option", "correct": false}},
                {{"id": "b", "text": "Second option", "correct": true}},
                {{"id": "c", "text": "Third option", "correct": false}},
                {{"id": "d", "text": "Fourth option", "correct": false}}
            ],
            "explanation": "Fascinating explanation that teaches something interesting",
            "fun_fact": "Optional bonus fact that makes people go 'wow!'"
        }}
        
        Remember: Only ONE answer should be correct. Randomize which position (a,b,c,d) is correct."""
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "gpt-4-turbo-preview",  # or gpt-3.5-turbo for lower cost
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.9,  # High creativity
            "max_tokens": 500,
            "response_format": {"type": "json_object"}  # Ensure JSON response
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(self.api_url, headers=headers, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    quiz_json = json.loads(data['choices'][0]['message']['content'])
                    
                    # Validate and add metadata
                    quiz_json['category'] = category
                    quiz_json['difficulty'] = self._assess_difficulty(quiz_json['question'])
                    
                    return quiz_json
                else:
                    raise Exception(f"AI API error: {response.status}")
    
    async def generate_chaos_variation(self, original_question: str) -> str:
        """Generate a chaos mode variation of a question"""
        
        prompt = f"""Take this trivia question and rewrite it in a hilariously chaotic way:
        
        Original: {original_question}
        
        Make it absurd, unexpected, and funny while keeping the same core question and answer.
        Use one of these styles:
        - Add ridiculous scenarios ("You're a time-traveling hamster...")
        - Use dramatic narration ("*Record scratch* *Freeze frame*")
        - Add silly characters ("A sentient toaster asks you...")
        - Make it overly dramatic or apocalyptic
        - Use internet meme language
        - Break the fourth wall
        
        Keep it under 200 characters."""
        
        # Similar API call structure
        # Returns the chaotic version
        
    def _assess_difficulty(self, question: str) -> str:
        """Simple heuristic to assess question difficulty"""
        # Could be enhanced with AI
        if any(word in question.lower() for word in ['first', 'invented', 'discovered']):
            return 'hard'
        elif any(word in question.lower() for word in ['largest', 'biggest', 'most']):
            return 'medium'
        else:
            return 'easy'

# Example usage:
"""
async def main():
    generator = AIQuizGenerator()
    
    # Generate a science quiz
    quiz = await generator.generate_quiz_with_ai("science")
    print(json.dumps(quiz, indent=2))
    
    # Generate chaos variation
    chaos_q = await generator.generate_chaos_variation(quiz['question'])
    print(f"Chaos version: {chaos_q}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
"""