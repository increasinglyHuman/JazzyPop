#!/usr/bin/env python3
import requests
import json

# Test the API endpoint directly
quiz_id = "undefined"  # This is what the frontend is sending
base_url = "https://p0qp0q.com/api"
endpoint = f"{base_url}/quiz/{quiz_id}/validations"

print(f"Testing endpoint: {endpoint}")

try:
    response = requests.get(endpoint, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text[:500]}")
except Exception as e:
    print(f"Request failed: {e}")

# Now let's check what endpoints are actually available
print("\n\nChecking available quiz endpoints:")
docs_response = requests.get("https://p0qp0q.com/docs")
if docs_response.status_code == 200:
    # Look for quiz-related endpoints in the HTML
    content = docs_response.text
    import re
    quiz_endpoints = re.findall(r'/api/[^"]*quiz[^"]*', content)
    for endpoint in set(quiz_endpoints):
        print(f"  {endpoint}")