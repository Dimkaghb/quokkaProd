# React Flow - Complete Implementation Guide

## 📋 Table of Contents
- [Overview](#overview)
- [Installation & Setup](#installation--setup)
- [Basic Implementation](#basic-implementation)
- [Core Concepts](#core-concepts)
- [Custom Nodes](#custom-nodes)
- [Edge Management](#edge-management)
- [State Management](#state-management)
- [Advanced Features](#advanced-features)
- [Styling & Theming](#styling--theming)
- [Performance Optimization](#performance-optimization)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

React Flow is a powerful library for building interactive node-based graphs, diagrams, and flowcharts in React applications. This guide provides comprehensive documentation on how to implement React Flow in any React project, covering everything from basic setup to advanced customization.

### Key Capabilities:
- **Interactive Graphs**: Drag, zoom, and pan functionality
- **Custom Nodes**: Create any type of node component
- **Edge Connections**: Visual connections between nodes
- **Real-time Updates**: Dynamic graph manipulation
- **TypeScript Support**: Full type safety and IntelliSense
- **Extensible**: Plugin system and custom components

## 🚀 Installation & Setup

### Prerequisites
- React 16.8+ (hooks support required)
- Node.js and npm/yarn
- TypeScript (optional but recommended)

### Installation

#### Using npm
```bash
npm install @xyflow/react
```

#### Using yarn
```bash
yarn add @xyflow/react
```

#### With TypeScript types (included by default)
```bash
# Types are included in the main package
npm install @xyflow/react
```

### Basic Setup

#### 1. Import Required Components
```typescript
import {
  ReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Controls,
  Background,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
```

#### 2. Create Your First Flow
```typescript
import React, { useCallback } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Controls,
  Background,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  {
    id: '1',
    position: { x: 0, y: 0 },
    data: { label: 'Node 1' },
  },
  {
    id: '2',
    position: { x: 0, y: 100 },
    data: { label: 'Node 2' },
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
];

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}

export default Flow;
```

## 🧩 Core Concepts

### Nodes
Nodes are the building blocks of your flow. Each node has:
- **id**: Unique identifier
- **position**: x, y coordinates
- **data**: Custom data object
- **type**: Node type (default, input, output, or custom)

```typescript
interface Node {
  id: string;
  position: { x: number; y: number };
  data: any;
  type?: string;
  style?: React.CSSProperties;
  className?: string;
  targetPosition?: Position;
  sourcePosition?: Position;
  hidden?: boolean;
  selected?: boolean;
  dragging?: boolean;
  dragHandle?: string;
  width?: number;
  height?: number;
  parentNode?: string;
  zIndex?: number;
  extent?: 'parent' | CoordinateExtent;
  expandParent?: boolean;
  positionAbsolute?: { x: number; y: number };
  ariaLabel?: string;
  focusable?: boolean;
  resizing?: boolean;
}
```

### Edges
Edges connect nodes and represent relationships:
- **id**: Unique identifier
- **source**: Source node id
- **target**: Target node id
- **type**: Edge type (default, straight, step, smoothstep, or custom)

```typescript
interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  style?: React.CSSProperties;
  className?: string;
  animated?: boolean;
  hidden?: boolean;
  deletable?: boolean;
  data?: any;
  label?: string | React.ReactNode;
  labelStyle?: React.CSSProperties;
  labelShowBg?: boolean;
  labelBgStyle?: React.CSSProperties;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
  markerStart?: EdgeMarker;
  markerEnd?: EdgeMarker;
  pathOptions?: any;
  interactionWidth?: number;
}
```

### Handles
Handles are connection points on nodes:

```typescript
import { Handle, Position } from '@xyflow/react';

function CustomNode({ data }) {
  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <div>{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

## 🎨 Custom Nodes

### Creating Custom Node Types

#### 1. Define Node Component
```typescript
import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface CustomNodeData {
  label: string;
  value: number;
  color?: string;
}

function CustomNode({ data, isConnectable }: NodeProps<CustomNodeData>) {
  return (
    <div className="custom-node" style={{ backgroundColor: data.color }}>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />
      <div>
        <strong>{data.label}</strong>
        <div>Value: {data.value}</div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
      />
    </div>
  );
}

export default CustomNode;
```

#### 2. Register Node Type
```typescript
import CustomNode from './CustomNode';

const nodeTypes = {
  customNode: CustomNode,
};

function Flow() {
  const nodes = [
    {
      id: '1',
      type: 'customNode',
      position: { x: 100, y: 100 },
      data: { label: 'Custom Node', value: 42, color: '#ff6b6b' },
    },
  ];

  return (
    <ReactFlow
      nodes={nodes}
      nodeTypes={nodeTypes}
      // ... other props
    />
  );
}
```

### Advanced Node Features

#### Multiple Handles
```typescript
function MultiHandleNode({ data }) {
  return (
    <div className="multi-handle-node">
      {/* Input handles */}
      <Handle type="target" position={Position.Top} id="input-1" />
      <Handle type="target" position={Position.Left} id="input-2" />
      
      <div>{data.label}</div>
      
      {/* Output handles */}
      <Handle type="source" position={Position.Right} id="output-1" />
      <Handle type="source" position={Position.Bottom} id="output-2" />
    </div>
  );
}
```

#### Conditional Handles
```typescript
function ConditionalNode({ data }) {
  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <div>{data.label}</div>
      
      {data.showOutput && (
        <Handle type="source" position={Position.Bottom} />
      )}
    </div>
  );
}
```

## 🔗 Edge Management

### Custom Edge Types

#### 1. Create Custom Edge
```typescript
import React from 'react';
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react';

function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button onClick={() => console.log(`Delete edge ${id}`)}>
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default CustomEdge;
```

#### 2. Register Edge Type
```typescript
const edgeTypes = {
  customEdge: CustomEdge,
};

const edges = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'customEdge',
    data: { label: 'Custom Edge' },
  },
];

<ReactFlow edgeTypes={edgeTypes} edges={edges} />
```

### Edge Styling
```typescript
const styledEdges = [
  {
    id: 'e1',
    source: '1',
    target: '2',
    style: { stroke: '#f6ab6c', strokeWidth: 3 },
    animated: true,
  },
  {
    id: 'e2',
    source: '2',
    target: '3',
    type: 'smoothstep',
    label: 'Smooth Step Edge',
    labelStyle: { fill: '#f6ab6c', fontWeight: 700 },
  },
];
```

## 🔄 State Management

### Using React Flow Hooks

#### useNodesState
Manages node state with built-in change handlers:

```typescript
import { useNodesState } from '@xyflow/react';

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  
  // Add a new node
  const addNode = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: 'New Node' },
    };
    setNodes((nds) => [...nds, newNode]);
  };
  
  // Update node data
  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
  };
  
  return (
    <ReactFlow
      nodes={nodes}
      onNodesChange={onNodesChange}
      // ... other props
    />
  );
}
```

#### useEdgesState
Manages edge state with built-in change handlers:

```typescript
import { useEdgesState, addEdge } from '@xyflow/react';

function Flow() {
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Add edge programmatically
  const addCustomEdge = (source: string, target: string) => {
    const newEdge = {
      id: `${source}-${target}`,
      source,
      target,
      animated: true,
    };
    setEdges((eds) => addEdge(newEdge, eds));
  };
  
  // Remove edge
  const removeEdge = (edgeId: string) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
  };
  
  return (
    <ReactFlow
      edges={edges}
      onEdgesChange={onEdgesChange}
      // ... other props
    />
  );
}
```

### Advanced State Patterns

#### Node Selection Management
```typescript
const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

const onSelectionChange = useCallback(({ nodes }) => {
  setSelectedNodes(nodes.map((node) => node.id));
}, []);

<ReactFlow onSelectionChange={onSelectionChange} />
```

#### Undo/Redo Functionality
```typescript
import { useUndoRedo } from '@xyflow/react';

function Flow() {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  
  return (
    <div>
      <button onClick={undo} disabled={!canUndo}>
        Undo
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo
      </button>
      <ReactFlow />
    </div>
  );
}
```

## 🚀 Advanced Features

### Minimap
Add a minimap for navigation in large flows:

```typescript
import { MiniMap } from '@xyflow/react';

<ReactFlow>
  <MiniMap
    nodeColor={(node) => {
      switch (node.type) {
        case 'input': return '#0041d0';
        case 'output': return '#ff0072';
        default: return '#1a192b';
      }
    }}
    nodeStrokeWidth={3}
    zoomable
    pannable
  />
</ReactFlow>
```

### Node Toolbar
Add contextual toolbars to nodes:

```typescript
import { NodeToolbar, Position } from '@xyflow/react';

function CustomNodeWithToolbar({ data, selected }) {
  return (
    <>
      <div className="custom-node">
        {data.label}
      </div>
      <NodeToolbar
        isVisible={selected}
        position={Position.Top}
      >
        <button>Delete</button>
        <button>Copy</button>
        <button>Edit</button>
      </NodeToolbar>
    </>
  );
}
```

### Subflows
Create nested flows within nodes:

```typescript
import { useReactFlow } from '@xyflow/react';

function SubFlowNode({ data }) {
  const { getNodes, getEdges } = useReactFlow();
  
  return (
    <div className="subflow-node">
      <div className="subflow-header">{data.label}</div>
      <div className="subflow-content">
        <ReactFlow
          nodes={data.subNodes}
          edges={data.subEdges}
          fitView
        />
      </div>
    </div>
  );
}
```

### Node Resizing
Enable node resizing:

```typescript
import { NodeResizer } from '@xyflow/react';

function ResizableNode({ data, selected }) {
  return (
    <>
      <NodeResizer
        color="#ff0071"
        isVisible={selected}
        minWidth={100}
        minHeight={30}
      />
      <div style={{ padding: 10 }}>
        {data.label}
      </div>
    </>
  );
}
```

## 🎨 Styling & Theming

### CSS Custom Properties
React Flow uses CSS custom properties for theming:

```css
.react-flow {
  --rf-node-color: #1a192b;
  --rf-node-bg: #fff;
  --rf-node-border: 1px solid #1a192b;
  --rf-connection-line: #b1b1b7;
  --rf-edge: #b1b1b7;
}
```

### Custom Node Styling
```css
.custom-node {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  border: 2px solid #fff;
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.custom-node:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.custom-node.selected {
  border-color: #ff6b6b;
  box-shadow: 0 0 0 2px #ff6b6b;
}
```

### Dark Theme Implementation
```css
.dark-theme .react-flow {
  --rf-node-color: #fff;
  --rf-node-bg: #2d3748;
  --rf-node-border: 1px solid #4a5568;
  --rf-connection-line: #718096;
  --rf-edge: #718096;
}

.dark-theme .react-flow__background {
  background-color: #1a202c;
}

.dark-theme .react-flow__controls {
  background-color: #2d3748;
  border: 1px solid #4a5568;
}
```

## ⚡ Performance Optimization

### Virtualization for Large Flows
```typescript
import { ReactFlow } from '@xyflow/react';

function LargeFlow() {
  return (
    <ReactFlow
      nodes={largeNodeArray}
      edges={largeEdgeArray}
      // Enable virtualization for better performance
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      // Optimize rendering
      onlyRenderVisibleElements={true}
    />
  );
}
```

### Memoization
```typescript
import React, { memo } from 'react';

const OptimizedNode = memo(({ data, isConnectable }) => {
  return (
    <div className="optimized-node">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <div>{data.label}</div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
});
```

### Lazy Loading
```typescript
import { lazy, Suspense } from 'react';

const HeavyNode = lazy(() => import('./HeavyNode'));

function LazyNode(props) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyNode {...props} />
    </Suspense>
  );
}
```

## 📋 Best Practices

### 1. Node ID Management
```typescript
// Use consistent ID generation
const generateNodeId = () => `node_${Date.now()}_${Math.random()}`;

// Or use a proper UUID library
import { v4 as uuidv4 } from 'uuid';
const nodeId = uuidv4();
```

### 2. Type Safety with TypeScript
```typescript
interface MyNodeData {
  label: string;
  value: number;
  type: 'input' | 'output' | 'process';
}

interface MyNode extends Node {
  data: MyNodeData;
}

const typedNodes: MyNode[] = [
  {
    id: '1',
    position: { x: 0, y: 0 },
    data: { label: 'Start', value: 0, type: 'input' },
  },
];
```

### 3. Event Handling
```typescript
const onNodeClick = useCallback((event, node) => {
  console.log('Node clicked:', node);
}, []);

const onEdgeClick = useCallback((event, edge) => {
  console.log('Edge clicked:', edge);
}, []);

<ReactFlow
  onNodeClick={onNodeClick}
  onEdgeClick={onEdgeClick}
/>
```

### 4. Error Boundaries
```typescript
import React from 'react';

class FlowErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Flow error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong with the flow.</div>;
    }

    return this.props.children;
  }
}

// Usage
<FlowErrorBoundary>
  <ReactFlow />
</FlowErrorBoundary>
```

## 🔧 Common Patterns

### 1. Dynamic Node Creation
```typescript
function DynamicFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [nodeId, setNodeId] = useState(1);

  const addNode = useCallback((type: string) => {
    const newNode = {
      id: `${type}-${nodeId}`,
      type,
      position: {
        x: Math.random() * 400,
        y: Math.random() * 400,
      },
      data: { label: `${type} ${nodeId}` },
    };
    
    setNodes((nds) => [...nds, newNode]);
    setNodeId((id) => id + 1);
  }, [nodeId, setNodes]);

  return (
    <div>
      <button onClick={() => addNode('input')}>Add Input</button>
      <button onClick={() => addNode('default')}>Add Default</button>
      <ReactFlow nodes={nodes} onNodesChange={onNodesChange} />
    </div>
  );
}
```

### 2. Save and Load Flow
```typescript
function SaveLoadFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const saveFlow = useCallback(() => {
    const flow = { nodes, edges };
    localStorage.setItem('react-flow', JSON.stringify(flow));
  }, [nodes, edges]);

  const loadFlow = useCallback(() => {
    const saved = localStorage.getItem('react-flow');
    if (saved) {
      const { nodes: savedNodes, edges: savedEdges } = JSON.parse(saved);
      setNodes(savedNodes);
      setEdges(savedEdges);
    }
  }, [setNodes, setEdges]);

  return (
    <div>
      <button onClick={saveFlow}>Save</button>
      <button onClick={loadFlow}>Load</button>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
      />
    </div>
  );
}
```

### 3. Validation and Constraints
```typescript
const onConnect = useCallback((connection) => {
  // Validate connection
  if (connection.source === connection.target) {
    console.warn('Cannot connect node to itself');
    return;
  }

  // Check if connection already exists
  const existingEdge = edges.find(
    (edge) => edge.source === connection.source && edge.target === connection.target
  );
  
  if (existingEdge) {
    console.warn('Connection already exists');
    return;
  }

  setEdges((eds) => addEdge(connection, eds));
}, [edges, setEdges]);
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Nodes Not Rendering
**Problem**: Nodes appear but content is missing
**Solution**: 
- Check if CSS is imported: `import '@xyflow/react/dist/style.css';`
- Verify node data structure
- Check for JavaScript errors in console

#### 2. Handles Not Connecting
**Problem**: Cannot create connections between nodes
**Solution**:
- Ensure `isConnectable` prop is true
- Check handle types (source/target)
- Verify `onConnect` callback is provided

#### 3. Performance Issues
**Problem**: Slow rendering with many nodes
**Solution**:
- Use `onlyRenderVisibleElements={true}`
- Implement node virtualization
- Memoize custom components
- Reduce unnecessary re-renders

#### 4. TypeScript Errors
**Problem**: Type errors with custom nodes/edges
**Solution**:
```typescript
// Extend base types properly
interface CustomNodeProps extends NodeProps {
  data: {
    label: string;
    customField: string;
  };
}
```

### Debugging Tips

#### 1. React Flow DevTools
```typescript
import { ReactFlowProvider } from '@xyflow/react';

function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
```

#### 2. Console Logging
```typescript
const onNodesChange = useCallback((changes) => {
  console.log('Node changes:', changes);
  onNodesChangeDefault(changes);
}, [onNodesChangeDefault]);
```

#### 3. Flow Validation
```typescript
import { isValidConnection } from '@xyflow/react';

const isValidConnectionCustom = (connection) => {
  // Add custom validation logic
  const isValid = isValidConnection(connection);
  console.log('Connection valid:', isValid, connection);
  return isValid;
};

<ReactFlow isValidConnection={isValidConnectionCustom} />
```

## 📚 Resources & References

### Official Documentation
- **Main Documentation**: [reactflow.dev](https://reactflow.dev)
- **API Reference**: [reactflow.dev/api-reference](https://reactflow.dev/api-reference)
- **Examples**: [reactflow.dev/examples](https://reactflow.dev/examples)
- **GitHub Repository**: [github.com/xyflow/xyflow](https://github.com/xyflow/xyflow)

### Community Resources
- **Discord Community**: [discord.gg/RVg2HkM](https://discord.gg/RVg2HkM)
- **Stack Overflow**: Tag `react-flow`
- **NPM Package**: [@xyflow/react](https://www.npmjs.com/package/@xyflow/react)

### Learning Path
1. **Start with Basic Setup**: Create your first flow
2. **Learn Core Concepts**: Understand nodes, edges, and handles
3. **Create Custom Components**: Build custom nodes and edges
4. **Add Interactivity**: Implement event handlers and state management
5. **Optimize Performance**: Apply best practices for large flows
6. **Advanced Features**: Explore minimap, toolbar, and subflows

---

## 🎉 Conclusion

React Flow is a powerful and flexible library for creating interactive node-based interfaces. This guide covers the essential concepts and patterns needed to build sophisticated flow-based applications. Whether you're creating flowcharts, diagrams, or complex data visualization tools, React Flow provides the foundation for building engaging and interactive user experiences.

**Happy Flowing! 🚀**