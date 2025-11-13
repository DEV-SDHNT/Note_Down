import React, { useRef, useEffect, useState } from "react";

export function Tester() {
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [shape, setShape] = useState("circle");
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState(null);
  const [draggingCanvas, setDraggingCanvas] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // --- IndexedDB setup ---
  useEffect(() => {
    const openDB = indexedDB.open("DSVisualizerDB", 1);
    openDB.onupgradeneeded = e => {
      const db = e.target.result;
      db.createObjectStore("data", { keyPath: "id" });
    };
    openDB.onsuccess = e => {
      const db = e.target.result;
      const tx = db.transaction("data", "readonly");
      const store = tx.objectStore("data");
      const req = store.get("state");
      req.onsuccess = e => {
        const res = e.target.result;
        if (res) {
          setNodes(res.nodes);
          setLinks(res.links);
        }
      };
    };
  }, []);

  const saveToIndexedDB = (newNodes, newLinks) => {
    const openDB = indexedDB.open("DSVisualizerDB", 1);
    openDB.onsuccess = e => {
      const db = e.target.result;
      const tx = db.transaction("data", "readwrite");
      const store = tx.objectStore("data");
      store.put({ id: "state", nodes: newNodes, links: newLinks });
    };
  };

  // --- Drawing ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const drawGrid = () => {
      const gridSize = 50;
      ctx.strokeStyle = "#333";
      const startX = (-pan.x / zoom) % gridSize;
      const startY = (-pan.y / zoom) % gridSize;
      for (let x = startX; x < canvas.width / zoom; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height / zoom);
        ctx.stroke();
      }
      for (let y = startY; y < canvas.height / zoom; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width / zoom, y);
        ctx.stroke();
      }
    };

    const drawNode = node => {
      ctx.beginPath();
      const text = node.text;
      ctx.font = "14px sans-serif";
      const textWidth = ctx.measureText(text).width + 20;
      const textHeight = 30;
      const w = textWidth / 2;
      const h = textHeight / 2;
      ctx.fillStyle = "#2b8ef3";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;

      switch (node.shape) {
        case "circle":
          ctx.arc(node.x, node.y, Math.max(w, h), 0, Math.PI * 2);
          break;
        case "rectangle":
          ctx.rect(node.x - w, node.y - h, textWidth, textHeight);
          break;
        case "diamond":
          ctx.moveTo(node.x, node.y - h);
          ctx.lineTo(node.x + w, node.y);
          ctx.lineTo(node.x, node.y + h);
          ctx.lineTo(node.x - w, node.y);
          ctx.closePath();
          break;
        case "triangle":
          ctx.moveTo(node.x, node.y - h);
          ctx.lineTo(node.x + w, node.y + h);
          ctx.lineTo(node.x - w, node.y + h);
          ctx.closePath();
          break;
        case "ellipse":
          ctx.ellipse(node.x, node.y, w, h, 0, 0, Math.PI * 2);
          break;
        case "pentagon":
          for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const px = node.x + w * Math.cos(angle);
            const py = node.y + h * Math.sin(angle);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          break;
        default:
          ctx.arc(node.x, node.y, Math.max(w, h), 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, node.x, node.y);
    };

    const drawLink = link => {
      const n1 = nodes.find(n => n.id === link.from);
      const n2 = nodes.find(n => n.id === link.to);
      if (!n1 || !n2) return;
      const midX = (n1.x + n2.x) / 2;
      const midY = (n1.y + n2.y) / 2;
      let bend = 0;
      for (const n of nodes) {
        if (n.id !== n1.id && n.id !== n2.id) {
          const dist =
            Math.abs(
              (n2.y - n1.y) * n.x -
              (n2.x - n1.x) * n.y +
              n2.x * n1.y -
              n2.y * n1.x
            ) / Math.hypot(n2.x - n1.x, n2.y - n1.y);
          if (dist < 60) bend = 80;
        }
      }
      const controlX =
        midX + bend * (n2.y - n1.y) / Math.hypot(n2.x - n1.x, n2.y - n1.y);
      const controlY =
        midY - bend * (n2.x - n1.x) / Math.hypot(n2.x - n1.x, n2.y - n1.y);

      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.quadraticCurveTo(controlX, controlY, n2.x, n2.y);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    ctx.save();
    ctx.setTransform(zoom, 0, 0, zoom, pan.x, pan.y);
    ctx.clearRect(-pan.x / zoom, -pan.y / zoom, canvas.width / zoom, canvas.height / zoom);
    drawGrid();
    links.forEach(drawLink);
    nodes.forEach(drawNode);
    ctx.restore();
  }, [nodes, links, pan, zoom]);

  // --- Undo/Redo + Save ---
  const saveHistory = (newNodes, newLinks) => {
    setHistory(h => [...h, JSON.stringify({ nodes: newNodes, links: newLinks })]);
    setRedoStack([]);
  };

  const addNode = () => {
    const id = Date.now();
    const newNodes = [...nodes, { id, x: 200, y: 200, text: "Node", shape }];
    saveHistory(newNodes, links);
    saveToIndexedDB(newNodes, links);
    setNodes(newNodes);
  };

  const undo = () => {
    setHistory(h => {
      if (h.length <= 1) return h;
      const prev = JSON.parse(h[h.length - 2]);
      setNodes(prev.nodes);
      setLinks(prev.links);
      setRedoStack(r => [...r, h[h.length - 1]]);
      return h.slice(0, -1);
    });
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = JSON.parse(redoStack[redoStack.length - 1]);
    setNodes(next.nodes);
    setLinks(next.links);
    setHistory(h => [...h, JSON.stringify(next)]);
    setRedoStack(r => r.slice(0, -1));
  };

  // --- Pointer Events (unified for mouse + touch) ---
  const getPointerPos = e => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  };

  const handlePointerDown = e => {
    e.preventDefault();
    const { x, y } = getPointerPos(e);
    const node = nodes.find(n => Math.hypot(n.x - x, n.y - y) < 40);
    if (e.button === 2 && node) {
      setSelectedNode(node);
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
      return;
    }
    if (node) {
      setDraggingNode(node);
      setOffset({ x: x - node.x, y: y - node.y });
    } else {
      setDraggingCanvas(true);
      setOffset({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handlePointerMove = e => {
    if (draggingNode) {
      const { x, y } = getPointerPos(e);
      setNodes(ns =>
        ns.map(n =>
          n.id === draggingNode.id ? { ...n, x: x - offset.x, y: y - offset.y } : n
        )
      );
    } else if (draggingCanvas) {
      setPan({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handlePointerUp = () => {
    if (draggingNode || draggingCanvas) {
      saveToIndexedDB(nodes, links);
      saveHistory(nodes, links);
      setDraggingNode(null);
      setDraggingCanvas(false);
    }
  };

  const handleWheel = e => {
    const factor = 1.1;
    if (e.deltaY < 0) setZoom(z => Math.min(z * factor, 3));
    else setZoom(z => Math.max(z / factor, 0.3));
  };

  const handleContextAction = action => {
    if (!selectedNode) return;
    let newNodes = [...nodes];
    if (action === "edit") {
      const text = prompt("Edit text:", selectedNode.text);
      if (text !== null)
        newNodes = newNodes.map(n =>
          n.id === selectedNode.id ? { ...n, text } : n
        );
    } else if (action === "shape") {
      const newShape = prompt("Enter shape:", selectedNode.shape);
      newNodes = newNodes.map(n =>
        n.id === selectedNode.id ? { ...n, shape: newShape } : n
      );
    } else if (action === "delete") {
      newNodes = newNodes.filter(n => n.id !== selectedNode.id);
      setLinks(ls =>
        ls.filter(l => l.from !== selectedNode.id && l.to !== selectedNode.id)
      );
    }
    setNodes(newNodes);
    saveToIndexedDB(newNodes, links);
    saveHistory(newNodes, links);
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  return (
    <div onContextMenu={e => e.preventDefault()}>
      <div
        style={{
          position: "fixed",
          top: 10,
          left: 10,
          display: "flex",
          gap: 10,
          zIndex: 10,
        }}
      >
        <button onClick={addNode}>Add Node</button>
        <select value={shape} onChange={e => setShape(e.target.value)}>
          <option value="circle">Circle</option>
          <option value="rectangle">Rectangle</option>
          <option value="diamond">Diamond</option>
          <option value="triangle">Triangle</option>
          <option value="ellipse">Ellipse</option>
          <option value="pentagon">Pentagon</option>
        </select>
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
      </div>

      {contextMenu.visible && (
        <div
          style={{
            position: "absolute",
            top: contextMenu.y,
            left: contextMenu.x,
            background: "#222",
            border: "1px solid #555",
            borderRadius: "5px",
            zIndex: 20,
          }}
        >
          <button onClick={() => handleContextAction("edit")}>Edit Text</button>
          <button onClick={() => handleContextAction("shape")}>
            Change Shape
          </button>
          <button onClick={() => handleContextAction("delete")}>
            Delete Node
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{
          background: "#1c1c1c",
          cursor: draggingCanvas ? "grabbing" : "grab",
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onClick={() => setContextMenu({ visible: false, x: 0, y: 0 })}
      />
    </div>
  );
};

