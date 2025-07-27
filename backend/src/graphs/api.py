"""
API endpoints for graph management.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse

from .models import (
    GraphCreateRequest, 
    GraphUpdateRequest, 
    GraphResponse, 
    GraphListResponse,
    GraphListSummaryResponse,
    UserGraph
)
from .crud import (
    create_graph,
    get_user_graphs,
    get_user_graphs_summary,
    get_graph_by_id,
    update_graph,
    delete_graph,
    count_user_graphs
)

# Import auth dependencies
from src.auth.dependencies import get_current_user
from src.auth.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/graphs", tags=["graphs"])


@router.post("/", response_model=GraphResponse)
async def create_user_graph(
    graph_data: GraphCreateRequest,
    current_user: User = Depends(get_current_user)
):
    """Create a new graph for the current user."""
    try:
        user_id = str(current_user.id)
        
        graph = await create_graph(user_id, graph_data)
        
        logger.info(f"User {current_user.email} created graph: {graph.id}")
        
        return GraphResponse(
            success=True,
            graph=graph,
            message="Graph created successfully"
        )
        
    except Exception as e:
        logger.error(f"Error creating graph: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create graph: {str(e)}"
        )


@router.get("/", response_model=GraphListSummaryResponse)
async def get_user_graphs_list(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """Get list of user's graphs (summary view)."""
    try:
        user_id = str(current_user.id)
        
        graphs = await get_user_graphs_summary(user_id, skip, limit)
        total_count = await count_user_graphs(user_id)
        
        logger.info(f"User {current_user.email} retrieved {len(graphs)} graphs")
        
        return GraphListSummaryResponse(
            success=True,
            graphs=graphs,
            total_count=total_count,
            message=f"Retrieved {len(graphs)} graphs"
        )
        
    except Exception as e:
        logger.error(f"Error getting user graphs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get graphs: {str(e)}"
        )


@router.get("/{graph_id}", response_model=GraphResponse)
async def get_graph(
    graph_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific graph by ID."""
    try:
        user_id = str(current_user.id)
        
        graph = await get_graph_by_id(user_id, graph_id)
        
        if not graph:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Graph not found or you don't have access"
            )
        
        return GraphResponse(
            success=True,
            graph=graph,
            message="Graph retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting graph {graph_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get graph: {str(e)}"
        )


@router.put("/{graph_id}", response_model=GraphResponse)
async def update_user_graph(
    graph_id: str,
    update_data: GraphUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """Update an existing graph."""
    try:
        user_id = str(current_user.id)
        
        updated_graph = await update_graph(user_id, graph_id, update_data)
        
        if not updated_graph:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Graph not found or you don't have access"
            )
        
        logger.info(f"User {current_user.email} updated graph: {graph_id}")
        
        return GraphResponse(
            success=True,
            graph=updated_graph,
            message="Graph updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating graph {graph_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update graph: {str(e)}"
        )


@router.delete("/{graph_id}")
async def delete_user_graph(
    graph_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a graph."""
    try:
        user_id = str(current_user.id)
        
        success = await delete_graph(user_id, graph_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Graph not found or you don't have access"
            )
        
        logger.info(f"User {current_user.email} deleted graph: {graph_id}")
        
        return JSONResponse(
            content={
                "success": True,
                "message": "Graph deleted successfully"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting graph {graph_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete graph: {str(e)}"
        )


# Health check endpoint
@router.get("/health/check")
async def health_check():
    """Health check for graphs service."""
    return {"status": "healthy", "service": "graphs"}