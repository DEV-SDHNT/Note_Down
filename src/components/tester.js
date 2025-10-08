import React, { useRef, useState, useEffect } from "react";

export function App() {
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pinch = useRef({ dist: 0, scale: 1 });
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // 🖱️ Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.max(0.2, Math.min(scale * zoomFactor, 5));

    const worldX = (mouseX - offset.x) / scale;
    const worldY = (mouseY - offset.y) / scale;

    setScale(newScale);
    setOffset({
      x: mouseX - worldX * newScale,
      y: mouseY - worldY * newScale,
    });
  };

  // ✋ Mouse pan
  const handleMouseDown = (e) => {
    isPanning.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isPanning.current = false;
  };

  // 📱 Touch support
  const getTouches = (e) =>
    Array.from(e.touches).map((t) => ({
      x: t.clientX - canvasRef.current.getBoundingClientRect().left,
      y: t.clientY - canvasRef.current.getBoundingClientRect().top,
    }));

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      isPanning.current = true;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const [p1, p2] = getTouches(e);
      pinch.current.dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      pinch.current.scale = scale;
      isPanning.current = false; // disable pan while pinching
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isPanning.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - lastPos.current.x;
      const dy = touch.clientY - lastPos.current.y;
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPos.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const [p1, p2] = getTouches(e);
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const scaleFactor = dist / pinch.current.dist;
      const newScale = Math.max(0.2, Math.min(pinch.current.scale * scaleFactor, 5));
      const worldX = (midX - offset.x) / scale;
      const worldY = (midY - offset.y) / scale;
      setScale(newScale);
      setOffset({
        x: midX - worldX * newScale,
        y: midY - worldY * newScale,
      });
    }
  };

  const handleTouchEnd = () => {
    isPanning.current = false;
  };

  // 🖼️ Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    window.addEventListener("resize", resize);
    resize();
    return () => window.removeEventListener("resize", resize);
  }, []);

  // 🎨 Render content
  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.setTransform(scale, 0, 0, scale, offset.x, offset.y);
    ctx.clearRect(-offset.x / scale, -offset.y / scale, ctx.canvas.width / scale, ctx.canvas.height / scale);

    // Demo shapes
    ctx.fillStyle = "blue";
    ctx.fillRect(50, 50, 100, 100);

    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(300, 200, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "green";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(100, 0);
    ctx.lineTo(100, 100);
    ctx.closePath();
    ctx.stroke();
  }, [scale, offset]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={400}
      style={{
        width: "100%",
        height: "400px",
        border: "1px solid #aaa",
        touchAction: "none",
        cursor: isPanning.current ? "grabbing" : "grab",
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
}