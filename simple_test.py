import requests

print("Testing QuokkaAI endpoints...")

try:
    # Test health
    r = requests.get('http://localhost:8000/agents/health')
    print(f"Health: {r.status_code} - {r.json()}")
    
    # Test files
    r = requests.get('http://localhost:8000/agents/files')
    print(f"Files: {r.status_code} - {r.json()}")
    
except Exception as e:
    print(f"Error: {e}") 