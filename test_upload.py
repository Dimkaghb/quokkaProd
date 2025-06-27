#!/usr/bin/env python3
"""
Test script for uploading files to QuokkaAI RAG agent.
"""

import requests
import os

def test_upload():
    """Test file upload functionality."""
    
    # API base URL
    base_url = "http://localhost:8000"
    
    # Test file path
    test_file = "test_data.csv"
    
    if not os.path.exists(test_file):
        print(f"Test file {test_file} not found!")
        return
    
    print(f"Testing file upload for {test_file}...")
    
    try:
        # Test health endpoint first
        health_response = requests.get(f"{base_url}/agents/health")
        print(f"Health check: {health_response.status_code} - {health_response.json()}")
        
        # Test files listing (should be empty initially)
        files_response = requests.get(f"{base_url}/agents/files")
        print(f"Files list: {files_response.status_code}")
        if files_response.status_code == 200:
            print(f"Current files: {files_response.json()}")
        else:
            print(f"Files endpoint error: {files_response.text}")
        
        # Test file upload
        with open(test_file, 'rb') as f:
            files = {'file': (test_file, f, 'text/csv')}
            upload_response = requests.post(f"{base_url}/agents/upload", files=files)
            
        print(f"Upload response: {upload_response.status_code}")
        if upload_response.status_code == 200:
            print(f"Upload successful: {upload_response.json()}")
        else:
            print(f"Upload failed: {upload_response.text}")
        
        # Test files listing again
        files_response = requests.get(f"{base_url}/agents/files")
        if files_response.status_code == 200:
            print(f"Files after upload: {files_response.json()}")
        
        # Test analysis
        if upload_response.status_code == 200:
            analysis_data = {'query': 'Analyze this employee data and provide insights about salary distribution'}
            analysis_response = requests.post(f"{base_url}/agents/analyze", data=analysis_data)
            
            print(f"Analysis response: {analysis_response.status_code}")
            if analysis_response.status_code == 200:
                result = analysis_response.json()
                print(f"Analysis summary: {result.get('summary', 'No summary')}")
                print(f"Insights: {result.get('insights', [])}")
            else:
                print(f"Analysis failed: {analysis_response.text}")
        
    except Exception as e:
        print(f"Test failed with error: {e}")

if __name__ == "__main__":
    test_upload() 