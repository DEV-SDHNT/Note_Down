import React, { useRef, useState, useEffect } from "react";

export function Test() {
  const canvasRef = useRef(null);

  // camera offset
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // drawing state
  const [paths, setPaths] = useState([]);       // [{tool,color,points,start,end,text}]
  const [currentPath, setCurrentPath] = useState(null);
  const [mode, setMode] = useState("freehand"); // "freehand" | "rect" | "text"
  const [color, setColor] = useState("#ff0000");

  const [isPanning, setIsPanning] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  // Convert screen -> world coordinates
  const toWorld = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left - offset.x,
      y: e.clientY - rect.top - offset.y,
    };
  };

  // Draw everything
  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offset.x, offset.y); // Pan camera

    paths.forEach((path) => {
      ctx.strokeStyle = path.color;
      ctx.fillStyle = path.color;
      ctx.lineWidth = 2;

      if (path.tool === "freehand") {
        ctx.beginPath();
        path.points.forEach((p, i) =>
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
        );
        ctx.stroke();
      }

      if (path.tool === "rect" && path.start && path.end) {
        ctx.strokeRect(
          path.start.x,
          path.start.y,
          path.end.x - path.start.x,
          path.end.y - path.start.y
        );
      }

      if (path.tool === "text" && path.text) {
        ctx.font = "20px sans-serif";
        ctx.fillText(path.text, path.start.x, path.start.y);
      }
    });

    // live preview for rectangles
    if (currentPath && mode === "rect" && currentPath.start && currentPath.end) {
      ctx.strokeStyle = color;
      ctx.strokeRect(
        currentPath.start.x,
        currentPath.start.y,
        currentPath.end.x - currentPath.start.x,
        currentPath.end.y - currentPath.start.y
      );
    }

    ctx.restore();
  };

  useEffect(() => {
    draw();
  }, [paths, offset, currentPath]);

  const handleMouseDown = (e) => {
    if (e.button === 1 || mode === "pan") {
      // middle click or pan mode
      setIsPanning(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
      return;
    }

    const pos = toWorld(e);

    if (mode === "freehand") {
      setCurrentPath({ tool: "freehand", color, points: [pos] });
    } else if (mode === "rect") {
      setCurrentPath({ tool: "rect", color, start: pos, end: pos });
    } else if (mode === "text") {
      const text = prompt("Enter text:");
      if (text) {
        setPaths((prev) => [
          ...prev,
          { tool: "text", color, text, start: pos },
        ]);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMouse({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!currentPath) return;
    const pos = toWorld(e);

    if (mode === "freehand") {
      setCurrentPath((prev) => ({
        ...prev,
        points: [...prev.points, pos],
      }));
    } else if (mode === "rect") {
      setCurrentPath((prev) => ({ ...prev, end: pos }));
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (currentPath) {
      setPaths((prev) => [...prev, currentPath]);
      setCurrentPath(null);
    }
  };

  return (
    <div style={{ userSelect: "none" }}>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setMode("freehand")}>Freehand</button>
        <button onClick={() => setMode("rect")}>Rectangle</button>
        <button onClick={() => setMode("text")}>Text</button>
        <button onClick={() => setMode("pan")}>Pan</button>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{
            width: 32,
            height: 32,
            border: "none",
            borderRadius: "50%",
            padding: 0,
            overflow: "hidden",
            WebkitAppearance: "none",
          }}
        />
      </div>

      <canvas
        ref={canvasRef}
        width={window.innerWidth - 20}
        height={window.innerHeight - 80}
        style={{ border: "1px solid black", cursor: isPanning ? "grabbing" : "crosshair" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
