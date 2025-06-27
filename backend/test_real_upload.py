#!/usr/bin/env python3
"""
Test real file upload and analysis with the enhanced QuokkaAI agent.
"""

import asyncio
import sys
import os
from pathlib import Path
import pandas as pd

# Add src to path
sys.path.append('src')

from data_analize.api import get_enhanced_root_agent, get_rag_agent

async def test_real_upload():
    """Test real file upload and analysis."""
    
    print("🤖 Testing Real File Upload & Analysis\n")
    print("=" * 50)
    
    # Create test data file
    test_file = "test_sales_data.csv"
    
    # Create sample sales data
    data = {
        'Month': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        'Revenue': [10000, 12000, 11500, 13000, 14500, 16000],
        'Customers': [100, 120, 115, 130, 145, 160],
        'Product_Category': ['Electronics', 'Clothing', 'Electronics', 'Books', 'Electronics', 'Clothing'],
        'Region': ['North', 'South', 'North', 'East', 'West', 'South']
    }
    
    df = pd.DataFrame(data)
    df.to_csv(test_file, index=False)
    print(f"✅ Created test file: {test_file}")
    print(f"Data preview:\n{df}")
    print()
    
    # Get agents
    enhanced_agent = get_enhanced_root_agent()
    rag_agent = get_rag_agent()
    
    if not enhanced_agent or not rag_agent:
        print("❌ Failed to create agents")
        return
    
    try:
        # Upload file to RAG agent
        print("📤 Uploading file to RAG agent...")
        upload_result = await rag_agent.upload_file(test_file, test_file)
        print(f"Upload result: {upload_result['status']}")
        
        if upload_result['status'] == 'success':
            # Add file to enhanced agent's memory
            enhanced_agent.add_uploaded_file(test_file, {
                "file_type": upload_result.get("file_type", ".csv"),
                "size": upload_result.get("size", 0),
                "chunks_count": upload_result.get("chunks_count", 0),
                "summary": upload_result.get("summary", "Sales data"),
                "upload_status": "success"
            })
            print("✅ File added to conversation memory")
            print()
            
            # Test conversation flow
            print("💬 Testing Conversation Flow")
            print("-" * 35)
            
            # Test 1: Ask about uploaded files
            result1 = await enhanced_agent.process_query("What files do I have? What can you analyze?")
            print(f"User: What files do I have? What can you analyze?")
            print(f"Agent: {result1['response'][:300]}...")
            print()
            
            # Test 2: Request analysis
            result2 = await enhanced_agent.process_query("Analyze my sales data. What trends and insights do you see?")
            print(f"User: Analyze my sales data. What trends and insights do you see?")
            print(f"Agent: {result2['response'][:400]}...")
            print()
            
            # Test 3: Follow-up question
            result3 = await enhanced_agent.process_query("What about the relationship between revenue and customers?")
            print(f"User: What about the relationship between revenue and customers?")
            print(f"Agent: {result3['response'][:400]}...")
            print()
            
            print("=" * 50)
            print("🎉 Real Upload Test Complete!")
            
        else:
            print(f"❌ Upload failed: {upload_result.get('message', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        
    finally:
        # Clean up
        if os.path.exists(test_file):
            os.remove(test_file)
            print(f"🧹 Cleaned up {test_file}")

if __name__ == "__main__":
    asyncio.run(test_real_upload()) 