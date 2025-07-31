import os
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path

from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_core.messages import HumanMessage, AIMessage
from langchain.memory import ConversationBufferWindowMemory
from langchain.schema import BaseMessage

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RAGSystem:
    def __init__(self, knowledge_file_path: str = None, model_name: str = "gpt-3.5-turbo"):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        
        self.model_name = model_name
        self.knowledge_file_path = knowledge_file_path or self._get_default_knowledge_path()
        
        self.embeddings = OpenAIEmbeddings(openai_api_key=self.openai_api_key)
        self.llm = ChatOpenAI(
            model=self.model_name,
            temperature=0.7,
            openai_api_key=self.openai_api_key
        )
        
        self.vector_store = InMemoryVectorStore(self.embeddings)
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        
        self.memory = ConversationBufferWindowMemory(
            k=10,
            return_messages=True,
            memory_key="chat_history"
        )
        
        self.rag_chain = None
        self._initialize_system()
    
    def _get_default_knowledge_path(self) -> str:
        current_dir = Path(__file__).parent
        return str(current_dir.parent.parent / "data" / "demo_knowledge.txt")
    
    def _initialize_system(self):
        try:
            self._load_and_index_documents()
            self._setup_rag_chain()
            logger.info("RAG system initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize RAG system: {e}")
            raise
    
    def _load_and_index_documents(self):
        if not os.path.exists(self.knowledge_file_path):
            raise FileNotFoundError(f"Knowledge file not found: {self.knowledge_file_path}")
        
        with open(self.knowledge_file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        documents = [Document(
            page_content=content,
            metadata={"source": self.knowledge_file_path, "type": "knowledge_base"}
        )]
        
        splits = self.text_splitter.split_documents(documents)
        self.vector_store.add_documents(splits)
        
        logger.info(f"Indexed {len(splits)} document chunks")
    
    def _setup_rag_chain(self):
        retriever = self.vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 3}
        )
        
        prompt_template = """You are a professional data analyst with deep expertise in analysis, pattern detection, and strategic insights. 
Provide detailed, comprehensive, and professional responses that directly address the user's query.

Your responses should be:
- Direct and focused on answering the specific question
- Detailed with thorough analysis and insights
- Professional in tone and presentation
- Evidence-based using the provided context
- Practical with actionable information when relevant

Context from knowledge base:
{context}

Conversation History:
{chat_history}

Current Question: {question}

Provide a detailed, professional response that directly addresses the question.

Answer:"""
        
        prompt = ChatPromptTemplate.from_template(prompt_template)
        
        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)
        
        def format_chat_history(messages):
            if not messages:
                return "No previous conversation."
            
            formatted = []
            for msg in messages[-6:]:  # Last 6 messages for context
                if isinstance(msg, HumanMessage):
                    formatted.append(f"Human: {msg.content}")
                elif isinstance(msg, AIMessage):
                    formatted.append(f"Assistant: {msg.content}")
            return "\n".join(formatted)
        
        self.rag_chain = (
            {
                "context": retriever | format_docs,
                "question": RunnablePassthrough(),
                "chat_history": lambda x: format_chat_history(
                    self.memory.chat_memory.messages
                )
            }
            | prompt
            | self.llm
            | StrOutputParser()
        )
    
    def query(self, question: str) -> Dict[str, Any]:
        try:
            response = self.rag_chain.invoke(question)
            
            self.memory.chat_memory.add_user_message(question)
            self.memory.chat_memory.add_ai_message(response)
            
            retrieved_docs = self.vector_store.similarity_search(question, k=3)
            sources = [doc.metadata.get("source", "Unknown") for doc in retrieved_docs]
            
            return {
                "answer": response,
                "sources": list(set(sources)),
                "conversation_id": len(self.memory.chat_memory.messages) // 2
            }
        
        except Exception as e:
            logger.error(f"Error processing query: {e}")
            return {
                "answer": "I apologize, but I encountered an error processing your question. Please try again.",
                "sources": [],
                "conversation_id": None,
                "error": str(e)
            }
    
    def get_conversation_history(self) -> List[Dict[str, str]]:
        messages = self.memory.chat_memory.messages
        history = []
        
        for i in range(0, len(messages), 2):
            if i + 1 < len(messages):
                history.append({
                    "question": messages[i].content,
                    "answer": messages[i + 1].content,
                    "timestamp": getattr(messages[i], 'timestamp', None)
                })
        
        return history
    
    def clear_memory(self):
        """Clear conversation memory"""
        try:
            self.memory.clear()
            logger.info("Conversation memory cleared")
        except Exception as e:
            logger.error(f"Error clearing memory: {str(e)}")
    
    def get_memory_summary(self):
        """Get summary of current conversation memory"""
        try:
            history = self.get_conversation_history()
            return {
                "total_messages": len(history),
                "memory_buffer_size": self.memory.k,
                "has_conversation": len(history) > 0
            }
        except Exception as e:
            logger.error(f"Error getting memory summary: {str(e)}")
            return {"error": str(e)}
    
    def update_knowledge_base(self, file_path: str):
        """Update knowledge base with new file"""
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # Load and process new documents
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            # Split into chunks
            chunks = self.text_splitter.split_text(content)
            documents = [Document(page_content=chunk, metadata={"source": file_path}) for chunk in chunks]
            
            # Add to existing vector store
            self.vector_store.add_documents(documents)
            
            logger.info(f"Added {len(documents)} chunks from {file_path} to knowledge base")
            return {"success": True, "chunks_added": len(documents)}
            
        except Exception as e:
            logger.error(f"Error updating knowledge base: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def add_document(self, content: str, metadata: Dict[str, Any] = None) -> bool:
        try:
            if metadata is None:
                metadata = {"type": "user_added", "source": "runtime"}
            
            document = Document(page_content=content, metadata=metadata)
            splits = self.text_splitter.split_documents([document])
            self.vector_store.add_documents(splits)
            
            logger.info(f"Added {len(splits)} new document chunks")
            return True
        
        except Exception as e:
            logger.error(f"Error adding document: {e}")
            return False
    
    def search_knowledge_base(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        try:
            docs = self.vector_store.similarity_search(query, k=k)
            return [
                {
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                    "relevance_score": "similarity_based"
                }
                for doc in docs
            ]
        except Exception as e:
            logger.error(f"Error searching knowledge base: {e}")
            return []


if __name__ == "__main__":
    # Example usage for testing
    rag = RAGSystem()
    
    # Test query
    result = rag.query("What is QuokkaAI?")
    print(f"Answer: {result['answer']}")
    print(f"Sources: {', '.join(result['sources'])}")