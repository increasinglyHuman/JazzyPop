"""
Quiz Validator - Core validation logic for JazzyPop quizzes
Handles the actual validation checks and scoring
"""

import logging
from typing import Dict, Any, List, Tuple
from datetime import datetime
import re

logger = logging.getLogger(__name__)

class QuizValidator:
    """Core validation logic for quiz questions"""
    
    # Common patterns that indicate poor quality questions
    AMBIGUOUS_PHRASES = [
        "which of these",
        "all of the above", 
        "none of the above",
        "both a and b",
        "sometimes",
        "it depends",
        "usually",
        "mostly",
        "generally"
    ]
    
    # Outdated references to check
    OUTDATED_INDICATORS = [
        r"as of \d{4}",  # "as of 2020"
        r"current.*president",
        r"recently",
        r"just announced",
        r"latest.*version",
        r"newest",
        r"covid-19 pandemic",  # Unless specifically about historical events
    ]
    
    # Quality indicators
    QUALITY_INDICATORS = {
        'good': [
            'specific numbers',
            'exact dates',
            'proper nouns',
            'scientific terms',
            'clear comparisons'
        ],
        'poor': [
            'arguably',
            'some say',
            'controversial',
            'debatable',
            'subjective'
        ]
    }
    
    @classmethod
    def validate_question_structure(cls, quiz_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validate the basic structure of a quiz question
        Returns (is_valid, list_of_issues)
        """
        issues = []
        
        # Check question exists and is not empty
        if not quiz_data.get('question') or len(quiz_data['question'].strip()) < 10:
            issues.append("Question is missing or too short")
        
        # Check answers structure
        answers = quiz_data.get('answers', [])
        if len(answers) != 4:
            issues.append(f"Expected 4 answers, found {len(answers)}")
        
        # Check for exactly one correct answer
        correct_count = sum(1 for a in answers if a.get('correct', False))
        if correct_count == 0:
            issues.append("No correct answer marked")
        elif correct_count > 1:
            issues.append(f"Multiple correct answers marked ({correct_count})")
        
        # Check answer text
        for i, answer in enumerate(answers):
            if not answer.get('text') or len(answer['text'].strip()) < 1:
                issues.append(f"Answer {answer.get('id', i)} is empty")
            if answer.get('text', '').lower() in ['test', 'placeholder', 'todo']:
                issues.append(f"Answer {answer.get('id', i)} appears to be placeholder text")
        
        # Check for duplicate answers
        answer_texts = [a.get('text', '').lower().strip() for a in answers]
        if len(set(answer_texts)) < len(answer_texts):
            issues.append("Duplicate answers found")
        
        return len(issues) == 0, issues
    
    @classmethod
    def check_for_ambiguity(cls, quiz_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Check if the question or answers contain ambiguous language
        Returns (is_clear, list_of_ambiguities)
        """
        ambiguities = []
        question = quiz_data.get('question', '').lower()
        
        # Check question for ambiguous phrases
        for phrase in cls.AMBIGUOUS_PHRASES:
            if phrase in question:
                ambiguities.append(f"Question contains ambiguous phrase: '{phrase}'")
        
        # Check for relative terms without context
        relative_terms = ['biggest', 'smallest', 'fastest', 'oldest', 'newest']
        for term in relative_terms:
            if term in question and 'in the world' not in question and 'ever' not in question:
                ambiguities.append(f"Relative term '{term}' lacks context")
        
        # Check answers for ambiguity
        for answer in quiz_data.get('answers', []):
            text = answer.get('text', '').lower()
            if any(phrase in text for phrase in ['all of the above', 'none of the above']):
                ambiguities.append(f"Answer uses ambiguous reference: {answer['text']}")
        
        return len(ambiguities) == 0, ambiguities
    
    @classmethod
    def check_for_outdated_content(cls, quiz_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Check if the question contains potentially outdated information
        Returns (is_current, list_of_outdated_items)
        """
        outdated_items = []
        question = quiz_data.get('question', '')
        
        # Check for outdated patterns
        for pattern in cls.OUTDATED_INDICATORS:
            if re.search(pattern, question, re.IGNORECASE):
                outdated_items.append(f"Potentially outdated reference: {pattern}")
        
        # Check for old years (more than 5 years ago)
        current_year = datetime.now().year
        year_pattern = r'\b(19\d{2}|20[0-1]\d|202[0-3])\b'
        years_found = re.findall(year_pattern, question)
        for year in years_found:
            if int(year) < current_year - 5 and 'history' not in quiz_data.get('category', '').lower():
                outdated_items.append(f"References old year: {year}")
        
        return len(outdated_items) == 0, outdated_items
    
    @classmethod
    def assess_educational_value(cls, quiz_data: Dict[str, Any]) -> float:
        """
        Assess the educational value of a question (0.0 to 1.0)
        """
        score = 0.5  # Start neutral
        question = quiz_data.get('question', '')
        explanation = quiz_data.get('explanation', '')
        
        # Positive indicators
        if explanation and len(explanation) > 50:
            score += 0.2
        if any(indicator in question.lower() for indicator in ['why', 'how', 'what causes']):
            score += 0.1
        if re.search(r'\d+', question):  # Contains numbers/data
            score += 0.1
        if len(question.split()) > 15:  # Detailed question
            score += 0.1
        
        # Negative indicators
        if any(word in question.lower() for word in ['trivial', 'random', 'guess']):
            score -= 0.2
        if len(question.split()) < 5:  # Too short
            score -= 0.1
        
        # Cap between 0 and 1
        return max(0.0, min(1.0, score))
    
    @classmethod
    def assess_difficulty_consistency(cls, pass_1_difficulty: int, pass_2_difficulty: int) -> bool:
        """
        Check if difficulty ratings are consistent between passes
        """
        return abs(pass_1_difficulty - pass_2_difficulty) <= 1
    
    @classmethod
    def calculate_overall_quality(cls, validation_results: Dict[str, Any]) -> float:
        """
        Calculate overall quality score based on all validation passes
        Returns score from 0.0 to 1.0
        """
        scores = []
        
        # Structure validity
        if 'structure_valid' in validation_results:
            scores.append(1.0 if validation_results['structure_valid'] else 0.0)
        
        # Ambiguity check
        if 'ambiguity_clear' in validation_results:
            scores.append(1.0 if validation_results['ambiguity_clear'] else 0.5)
        
        # Outdated content check
        if 'content_current' in validation_results:
            scores.append(1.0 if validation_results['content_current'] else 0.3)
        
        # Educational value
        if 'educational_value' in validation_results:
            scores.append(validation_results['educational_value'])
        
        # Answer verification from pass 2
        if 'pass_2' in validation_results:
            verification = validation_results['pass_2'].get('verification_result', {})
            if verification.get('correct_answer_verified'):
                scores.append(verification.get('verification_confidence', 0.5))
            else:
                scores.append(0.0)
        
        # Calculate average
        return sum(scores) / len(scores) if scores else 0.0
    
    @classmethod
    def determine_final_status(cls, quality_score: float, issues_count: int) -> str:
        """
        Determine final validation status based on quality score and issues
        """
        if quality_score >= 0.8 and issues_count == 0:
            return 'approved'
        elif quality_score >= 0.6 and issues_count <= 2:
            return 'needs_revision'
        else:
            return 'rejected'
    
    @classmethod
    def generate_revision_summary(cls, validation_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a summary of what needs to be revised
        """
        revision_items = []
        priority = 'low'
        
        # Check each validation component
        if not validation_results.get('structure_valid', True):
            revision_items.extend(validation_results.get('structure_issues', []))
            priority = 'high'
        
        if not validation_results.get('ambiguity_clear', True):
            revision_items.extend(validation_results.get('ambiguity_issues', []))
            priority = 'high' if priority != 'high' else priority
        
        if not validation_results.get('content_current', True):
            revision_items.extend(validation_results.get('outdated_issues', []))
            priority = 'medium' if priority == 'low' else priority
        
        # Add AI-identified issues
        for pass_key in ['pass_1', 'pass_2', 'pass_3']:
            if pass_key in validation_results:
                pass_data = validation_results[pass_key]
                if 'issues_found' in pass_data.get('verification_result', {}):
                    revision_items.extend(pass_data['verification_result']['issues_found'])
        
        return {
            'revision_needed': len(revision_items) > 0,
            'revision_items': revision_items,
            'priority': priority,
            'estimated_effort': 'minor' if len(revision_items) <= 2 else 'major'
        }
    
    @classmethod
    def validate_feedback_captions(cls, feedback_captions: Dict[str, Any]) -> bool:
        """
        Validate that feedback captions are properly formatted
        """
        if not feedback_captions:
            return False
        
        required_keys = ['a', 'b', 'c', 'd']
        for key in required_keys:
            if key not in feedback_captions:
                return False
            
            caption = feedback_captions[key]
            if not isinstance(caption, dict):
                return False
            
            if 'correct' not in caption or 'incorrect' not in caption:
                return False
            
            # Check captions aren't empty
            if not caption['correct'] or not caption['incorrect']:
                return False
        
        return True