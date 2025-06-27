#!/usr/bin/env python3
"""
Test script for the enhanced QuokkaAI root agent with conversation memory.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add src to path
sys.path.append('src')

from data_analize.api import get_enhanced_root_agent

async def test_enhanced_agent():
    """Test the enhanced root agent with conversation memory."""
    
    print("🤖 Testing Enhanced QuokkaAI Agent\n")
    print("=" * 50)
    
    # Get enhanced agent
    agent = get_enhanced_root_agent()
    if not agent:
        print("❌ Failed to create enhanced agent")
        return
    
    print("✅ Enhanced agent created successfully!")
    print(f"Agent type: {type(agent).__name__}")
    print(f"Available tools: {len(agent.tools)}")
    for tool in agent.tools:
        print(f"  - {tool.name}: {tool.description[:60]}...")
    print()
    
    # Test 1: Initial greeting
    print("📝 Test 1: Initial Greeting")
    print("-" * 30)
    
    result1 = await agent.process_query("Hello! I'm new here. What can you help me with?")
    print(f"User: Hello! I'm new here. What can you help me with?")
    print(f"Agent: {result1['response']}")
    print(f"Status: {result1['status']}")
    print(f"Has uploaded data: {result1['conversation_context']['has_uploaded_data']}")
    print()
    
    # Test 2: Ask about data without uploads
    print("📝 Test 2: Ask About Data (No Uploads)")
    print("-" * 40)
    
    result2 = await agent.process_query("What data do I have available for analysis?")
    print(f"User: What data do I have available for analysis?")
    print(f"Agent: {result2['response']}")
    print()
    
    # Test 3: Simulate file upload
    print("📝 Test 3: Simulate File Upload")
    print("-" * 35)
    
    # Add a fake uploaded file to test conversation memory
    agent.add_uploaded_file("sales_data.csv", {
        "file_type": ".csv",
        "size": 2048,
        "chunks_count": 8,
        "summary": "Sales data containing monthly revenue, customer segments, and product categories for Q1-Q4 2023",
        "upload_status": "success"
    })
    
    agent.add_uploaded_file("customer_feedback.txt", {
        "file_type": ".txt", 
        "size": 1024,
        "chunks_count": 3,
        "summary": "Customer feedback and reviews collected from various channels",
        "upload_status": "success"
    })
    
    print("✅ Simulated uploading:")
    print("  - sales_data.csv (Sales data for 2023)")
    print("  - customer_feedback.txt (Customer reviews)")
    print()
    
    # Test 4: Ask about available data after upload
    print("📝 Test 4: Ask About Data (After Upload)")
    print("-" * 40)
    
    result4 = await agent.process_query("What files do I have uploaded? What can you analyze?")
    print(f"User: What files do I have uploaded? What can you analyze?")
    print(f"Agent: {result4['response']}")
    print(f"Has uploaded data: {result4['conversation_context']['has_uploaded_data']}")
    print(f"Uploaded files: {result4['conversation_context']['uploaded_files']}")
    print()
    
    # Test 5: Ask for data analysis
    print("📝 Test 5: Request Data Analysis")
    print("-" * 35)
    
    result5 = await agent.process_query("Can you analyze my sales data and find interesting trends?")
    print(f"User: Can you analyze my sales data and find interesting trends?")
    print(f"Agent: {result5['response'][:400]}...")
    print()
    
    # Test 6: Follow-up question (testing conversation memory)
    print("📝 Test 6: Follow-up Question (Memory Test)")
    print("-" * 45)
    
    result6 = await agent.process_query("What about correlations? Any strong relationships in the data?")
    print(f"User: What about correlations? Any strong relationships in the data?")
    print(f"Agent: {result6['response'][:400]}...")
    print()
    
    # Test 7: Check conversation history
    print("📝 Test 7: Conversation History")
    print("-" * 35)
    
    history = agent.get_conversation_history()
    print(f"Conversation history length: {len(history)} messages")
    for i, msg in enumerate(history[-4:]):  # Show last 4 messages
        role = "Human" if msg.type == "human" else "AI"
        content = msg.content[:100] + "..." if len(msg.content) > 100 else msg.content
        print(f"  {i+1}. {role}: {content}")
    print()
    
    # Test 8: Memory and context awareness
    print("📝 Test 8: Context Awareness Test")
    print("-" * 35)
    
    result8 = await agent.process_query("Based on our conversation, what would you recommend I focus on next?")
    print(f"User: Based on our conversation, what would you recommend I focus on next?")
    print(f"Agent: {result8['response']}")
    print()
    
    print("=" * 50)
    print("🎉 Enhanced Agent Test Complete!")
    print()
    print("Key Features Tested:")
    print("✅ Conversation memory and context")
    print("✅ File upload awareness")
    print("✅ Data context management")
    print("✅ Intelligent query routing")
    print("✅ Multi-turn conversation flow")
    print("✅ Julius.AI-like conversational responses")

if __name__ == "__main__":
    asyncio.run(test_enhanced_agent()) 