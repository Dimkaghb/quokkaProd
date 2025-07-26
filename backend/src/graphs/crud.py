"""
CRUD operations for graph management.
"""

import logging
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

from .models import UserGraph, GraphCreateRequest, GraphUpdateRequest, GraphSummary

logger = logging.getLogger(__name__)

# In-memory storage for development when MongoDB is not available
_graphs_storage: Dict[str, Dict[str, Any]] = {}


async def get_database():
    """Get database instance with fallback to in-memory storage."""
    try:
        from src.auth.database import get_database
        db = get_database()
        if db.mongodb_connected:
            return db
    except ImportError:
        pass
    return None


async def create_graph(user_id: str, graph_data: GraphCreateRequest) -> UserGraph:
    """Create a new graph for a user."""
    graph_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    graph = UserGraph(
        id=graph_id,
        user_id=user_id,
        name=graph_data.name,
        description=graph_data.description or "",
        nodes=graph_data.nodes,
        edges=graph_data.edges,
        files=graph_data.files,
        thumbnail=graph_data.thumbnail,
        tags=graph_data.tags or [],
        created_at=now,
        updated_at=now
    )
    
    db = await get_database()
    
    if db and db.mongodb_connected:
        try:
            # Store in MongoDB
            graphs_collection = db.db.graphs
            graph_dict = graph.model_dump()
            graph_dict["_id"] = graph_id
            
            await graphs_collection.insert_one(graph_dict)
            logger.info(f"Graph {graph_id} created in MongoDB for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to create graph in MongoDB: {e}")
            # Fallback to in-memory storage
            if user_id not in _graphs_storage:
                _graphs_storage[user_id] = {}
            _graphs_storage[user_id][graph_id] = graph.model_dump()
            logger.info(f"Graph {graph_id} created in memory for user {user_id}")
    else:
        # Use in-memory storage
        if user_id not in _graphs_storage:
            _graphs_storage[user_id] = {}
        _graphs_storage[user_id][graph_id] = graph.model_dump()
        logger.info(f"Graph {graph_id} created in memory for user {user_id}")
    
    return graph


async def get_user_graphs(user_id: str, skip: int = 0, limit: int = 100) -> List[UserGraph]:
    """Get all graphs for a user."""
    db = await get_database()
    
    if db and db.mongodb_connected:
        try:
            graphs_collection = db.db.graphs
            cursor = graphs_collection.find(
                {"user_id": user_id}
            ).sort("updated_at", -1).skip(skip).limit(limit)
            
            graphs = []
            async for graph_doc in cursor:
                graph_doc["id"] = graph_doc.pop("_id")
                graphs.append(UserGraph(**graph_doc))
            
            logger.info(f"Retrieved {len(graphs)} graphs from MongoDB for user {user_id}")
            return graphs
            
        except Exception as e:
            logger.error(f"Failed to get graphs from MongoDB: {e}")
    
    # Fallback to in-memory storage
    if user_id not in _graphs_storage:
        return []
    
    user_graphs = []
    for graph_data in _graphs_storage[user_id].values():
        user_graphs.append(UserGraph(**graph_data))
    
    # Sort by updated_at descending
    user_graphs.sort(key=lambda x: x.updated_at, reverse=True)
    
    logger.info(f"Retrieved {len(user_graphs)} graphs from memory for user {user_id}")
    return user_graphs[skip:skip + limit]


async def get_user_graphs_summary(user_id: str, skip: int = 0, limit: int = 100) -> List[GraphSummary]:
    """Get graph summaries for a user (without full node/edge data)."""
    db = await get_database()
    
    if db and db.mongodb_connected:
        try:
            graphs_collection = db.db.graphs
            cursor = graphs_collection.find(
                {"user_id": user_id},
                {
                    "_id": 1,
                    "name": 1,
                    "description": 1,
                    "files": 1,
                    "nodes": 1,
                    "edges": 1,
                    "thumbnail": 1,
                    "tags": 1,
                    "created_at": 1,
                    "updated_at": 1
                }
            ).sort("updated_at", -1).skip(skip).limit(limit)
            
            summaries = []
            async for graph_doc in cursor:
                summary = GraphSummary(
                    id=str(graph_doc["_id"]),
                    name=graph_doc["name"],
                    description=graph_doc["description"],
                    files_count=len(graph_doc.get("files", [])),
                    nodes_count=len(graph_doc.get("nodes", [])),
                    edges_count=len(graph_doc.get("edges", [])),
                    thumbnail=graph_doc.get("thumbnail"),
                    tags=graph_doc.get("tags", []),
                    created_at=graph_doc["created_at"],
                    updated_at=graph_doc["updated_at"]
                )
                summaries.append(summary)
            
            logger.info(f"Retrieved {len(summaries)} graph summaries from MongoDB for user {user_id}")
            return summaries
            
        except Exception as e:
            logger.error(f"Failed to get graph summaries from MongoDB: {e}")
    
    # Fallback to in-memory storage
    if user_id not in _graphs_storage:
        return []
    
    summaries = []
    for graph_data in _graphs_storage[user_id].values():
        summary = GraphSummary(
            id=graph_data["id"],
            name=graph_data["name"],
            description=graph_data["description"],
            files_count=len(graph_data.get("files", [])),
            nodes_count=len(graph_data.get("nodes", [])),
            edges_count=len(graph_data.get("edges", [])),
            thumbnail=graph_data.get("thumbnail"),
            tags=graph_data.get("tags", []),
            created_at=graph_data["created_at"],
            updated_at=graph_data["updated_at"]
        )
        summaries.append(summary)
    
    # Sort by updated_at descending
    summaries.sort(key=lambda x: x.updated_at, reverse=True)
    
    logger.info(f"Retrieved {len(summaries)} graph summaries from memory for user {user_id}")
    return summaries[skip:skip + limit]


async def get_graph_by_id(user_id: str, graph_id: str) -> Optional[UserGraph]:
    """Get a specific graph by ID."""
    db = await get_database()
    
    if db and db.mongodb_connected:
        try:
            graphs_collection = db.db.graphs
            graph_doc = await graphs_collection.find_one({
                "_id": graph_id,
                "user_id": user_id
            })
            
            if graph_doc:
                graph_doc["id"] = graph_doc.pop("_id")
                logger.info(f"Retrieved graph {graph_id} from MongoDB for user {user_id}")
                return UserGraph(**graph_doc)
            
        except Exception as e:
            logger.error(f"Failed to get graph from MongoDB: {e}")
    
    # Fallback to in-memory storage
    if user_id in _graphs_storage and graph_id in _graphs_storage[user_id]:
        graph_data = _graphs_storage[user_id][graph_id]
        logger.info(f"Retrieved graph {graph_id} from memory for user {user_id}")
        return UserGraph(**graph_data)
    
    return None


async def update_graph(user_id: str, graph_id: str, update_data: GraphUpdateRequest) -> Optional[UserGraph]:
    """Update an existing graph."""
    db = await get_database()
    now = datetime.utcnow()
    
    # Prepare update fields
    update_fields = {"updated_at": now}
    if update_data.name is not None:
        update_fields["name"] = update_data.name
    if update_data.description is not None:
        update_fields["description"] = update_data.description
    if update_data.nodes is not None:
        update_fields["nodes"] = [node.model_dump() for node in update_data.nodes]
    if update_data.edges is not None:
        update_fields["edges"] = [edge.model_dump() for edge in update_data.edges]
    if update_data.files is not None:
        update_fields["files"] = [file.model_dump() for file in update_data.files]
    if update_data.thumbnail is not None:
        update_fields["thumbnail"] = update_data.thumbnail
    if update_data.tags is not None:
        update_fields["tags"] = update_data.tags
    
    if db and db.mongodb_connected:
        try:
            graphs_collection = db.db.graphs
            result = await graphs_collection.update_one(
                {"_id": graph_id, "user_id": user_id},
                {"$set": update_fields}
            )
            
            if result.modified_count > 0:
                # Get updated graph
                updated_graph = await get_graph_by_id(user_id, graph_id)
                logger.info(f"Graph {graph_id} updated in MongoDB for user {user_id}")
                return updated_graph
            
        except Exception as e:
            logger.error(f"Failed to update graph in MongoDB: {e}")
    
    # Fallback to in-memory storage
    if user_id in _graphs_storage and graph_id in _graphs_storage[user_id]:
        _graphs_storage[user_id][graph_id].update(update_fields)
        updated_graph = UserGraph(**_graphs_storage[user_id][graph_id])
        logger.info(f"Graph {graph_id} updated in memory for user {user_id}")
        return updated_graph
    
    return None


async def delete_graph(user_id: str, graph_id: str) -> bool:
    """Delete a graph."""
    db = await get_database()
    
    if db and db.mongodb_connected:
        try:
            graphs_collection = db.db.graphs
            result = await graphs_collection.delete_one({
                "_id": graph_id,
                "user_id": user_id
            })
            
            if result.deleted_count > 0:
                logger.info(f"Graph {graph_id} deleted from MongoDB for user {user_id}")
                return True
            
        except Exception as e:
            logger.error(f"Failed to delete graph from MongoDB: {e}")
    
    # Fallback to in-memory storage
    if user_id in _graphs_storage and graph_id in _graphs_storage[user_id]:
        del _graphs_storage[user_id][graph_id]
        logger.info(f"Graph {graph_id} deleted from memory for user {user_id}")
        return True
    
    return False


async def count_user_graphs(user_id: str) -> int:
    """Count total graphs for a user."""
    db = await get_database()
    
    if db and db.mongodb_connected:
        try:
            graphs_collection = db.db.graphs
            count = await graphs_collection.count_documents({"user_id": user_id})
            return count
        except Exception as e:
            logger.error(f"Failed to count graphs in MongoDB: {e}")
    
    # Fallback to in-memory storage
    if user_id in _graphs_storage:
        return len(_graphs_storage[user_id])
    
    return 0