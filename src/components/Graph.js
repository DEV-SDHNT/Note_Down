import "./Graph.css";
import React, { useRef, useEffect, useState } from "react";
import {
    Plus,
    MousePointer2,
    Workflow,
    Shapes,
    Circle,
    Square,
    Triangle,
    Pentagon,
    Egg,
    Diamond,
    
} from 'lucide-react';

const tools={
    'pointer':<MousePointer2 size={21}/>,
    'circle':<Circle size={21}/>,
    'rectangle':<Square size={21}/>,
    'diamond':<Diamond size={21}/>,
    'triangle':<Triangle size={21}/>,
    'ellipse':<Egg size={21}/>,
    'pentagon':<Pentagon size={21}/>
}

export function Graph() {
    const canvasRef = useRef(null);
    const [ctx, setCtx] = useState(null);
    const [nodes, setNodes] = useState([]);
    const [links, setLinks] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [linkMode, setLinkMode] = useState(false);
    const [linkStart, setLinkStart] = useState(null);
    const [shape, setShape] = useState("rectangle");
    const [nodeText, setNodeText] = useState("");
    const [editingNode, setEditingNode] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [lastPos, setLastPos] = useState(null);
    const [color,setColor] = useState('#444444');
    const [path,setPath]=useState([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        setCtx(canvas.getContext("2d"));
    }, []);
    
    useEffect(() => {
        drawAll();
    }, [nodes, links, pan, zoom]);
    
    
    const drawNode = (node) => {
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = node.color;
        ctx.fillStyle = node.color+'22';
        
        ctx.font = "19px sans-serif";
        const textWidth = ctx.measureText(node.text).width;
        const padding = 20;
        const width = textWidth + padding;
        const height = 40;
        node.width = width+40;
        node.height = height+40;
        const strokes=3;
        const jitter=2;
        switch (node.shape) {
        case "rectangle":
            for(let i=0;i<strokes;i++){
                ctx.rect(rand(jitter)+node.x - width / 2,rand(jitter)+ node.y - height / 2, width, height);
            }
            break;
        case "diamond":
            for(let i=0;i<strokes;i++){
                ctx.moveTo(node.x+rand(jitter), rand(jitter)+node.y - height/1.3 );
                ctx.lineTo(rand(jitter)+node.x + width /1.3,rand(jitter)+ node.y);
                ctx.lineTo(rand(jitter)+node.x,rand(jitter)+ node.y + height/1.3 );
                ctx.lineTo(rand(jitter)+node.x - width/1.3 ,rand(jitter)+ node.y);
                ctx.closePath();
            }
            break;
        case "triangle":
            for(let i=0;i<strokes;i++){
                ctx.moveTo(node.x+rand(jitter), node.y - height/1.3 +rand(jitter));
                ctx.lineTo(node.x + width/1.3+rand(jitter), rand(jitter)+node.y + height/1.3 );
                ctx.lineTo(node.x - width/1.3+rand(jitter), rand(jitter)+node.y + height/1.3 );
                ctx.closePath();
            }
            break;
        case "ellipse":
            for(let i=0;i<strokes;i++){
                ctx.ellipse(node.x+rand(jitter), node.y+rand(jitter), width /1.3, height/1.3 , 0, 0, 2 * Math.PI);
            }
            break;
        case "pentagon": {
            const sides = 5;
            const angle = (2 * Math.PI) / sides;
            const radius = Math.max(width, height)/1.3;
            for(let i=0;i<strokes;i++){
                for (let i = 0; i < sides; i++) {
                    const x = node.x + radius * Math.cos(i * angle - Math.PI / 2);
                    const y = node.y + radius * Math.sin(i * angle - Math.PI / 2);
                    if (i === 0) ctx.moveTo(x+rand(jitter), y+rand(jitter));
                    else ctx.lineTo(x+rand(jitter), y+rand(jitter));
                }
            }
            ctx.closePath();
            break;
        }
        default:
            for(let i=0;i<strokes;i++){
                ctx.arc(node.x+rand(jitter), node.y+rand(jitter), Math.max(width, height) /1.7, 0, Math.PI * 2);
            }
        }

        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = node.color;
        ctx.textAlign = "center";
        ctx.font = "19px Schoolbell,Single Day, Monospace,cursive";
        ctx.textBaseline = "middle";
        ctx.fillText(node.text, node.x+rand(jitter),node.shape==='triangle' ?node.y+rand(jitter)+10:node.y+rand(jitter));
        ctx.restore();
    };
//-----------------------------------------------------------------------------
        // case "diamond":
        //     const ratio=h/w;
        //     let tx=w/(Math.abs(cos)+ratio*Math.abs(sin))+10;
        //     let ty=h/(Math.abs(sin)+(1/ratio)* Math.abs(cos));
        //     let t=Math.max(tx,ty);
        //     return {
        //         x:node.x+cos*t,
        //         y:node.y+sin*t+10,
        //     };
        // case "triangle":
        //     return {
        //         x:node.x+cos*w*1.3,
        //         y:node.y+sin*h*1.6
        //     };
        // case "pentagon":
        //     const r=Math.max(w,h)/1.2;
        //     return {
        //         x:node.x+cos*r,
        //         y:node.y+sin*r,
    //     };
    //---------------------------------------------------------------------------------------------
    
    // const getBorderPoint=(path,angle)=>{
    //     const sin=Math.sin(angle);
    //     const cos=Math.cos(angle);

    //     const w=(path.end.x-path.start.x)/2.4;
    //     const h=(path.end.y-path.start.y)/2.4;
    //     switch (path.tool){
    //     case "circle":
    //     case "ellipse":
    //         return {
    //             x:node.x+cos*w,
    //             y:node.y+sin*h,
    //         };
    //     case "rectangle":
    //         const dx=Math.abs(w/cos);
    //         const dy=Math.abs(h/sin);
    //         const min=Math.min(dx,dy);
    //         return {
    //             x:node.x+cos*min,
    //             y:node.y+sin*min,
    //         };
    //     default:
    //         return {
    //             x:node.x,
    //             y:node.y,
    //         }
    //     }
    // }
    
    const drawLink = (link) => {
        const dx=link.to.x-link.from.x;
        const dy=link.to.y-link.from.y;
        const angle=Math.atan2(dy,dx);
        const strokes=3;
        const jitter=2;
        const start=0;//getBorderPoint(link.from,angle);
        const end=0;//getBorderPoint(link.to,angle+Math.PI);
        for(let i=0;i<strokes;i++){
            ctx.beginPath();
            ctx.moveTo(start.x+rand(jitter), start.y+rand(jitter));
            ctx.lineTo(end.x+rand(jitter), end.y+rand(jitter));
            ctx.strokeStyle = link.color;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.strokeStyle=link.color;
            ctx.moveTo(end.x+rand(jitter), end.y+rand(jitter));
            ctx.lineTo(
                end.x - 20 * Math.cos(angle - Math.PI/4)+rand(jitter),
                end.y - 20 * Math.sin(angle - Math.PI/4)+rand(jitter)
            );
            ctx.moveTo(end.x+rand(jitter), end.y+rand(jitter));
            ctx.lineTo(
                end.x - 20 * Math.cos(angle + Math.PI/6)+rand(jitter),
                end.y - 20 * Math.sin(angle + Math.PI/6)+rand(jitter)
            );
            ctx.stroke();
            ctx.closePath();
        }
    };

  const screenToWorld = (x, y) => {
    return {
      x: (x - pan.x) / zoom,
      y: (y - pan.y) / zoom,
    };
  };

  const handleDown = (e) => {
    e.preventDefault();
    const pos = getPos(e);
    const worldPos = screenToWorld(pos.x, pos.y);

    for (let node of nodes) {
        if (isInside(node, worldPos.x, worldPos.y)) {
            if (linkMode) {
                if (!linkStart) setLinkStart(node);
                else if(linkStart!==node) {
                    setLinks([...links, { from: linkStart, to: node, color:color }]);
                    setLinkStart(null);
                    //setLinkMode(false);
                }
            } else {
                setSelectedNode(node);
                setDragOffset({ x: worldPos.x - node.x, y: worldPos.y - node.y });
            }
            return;
            
        }
    }
      const id = Date.now();
	    const newPath = {
	        id:id,
	        nodes:nodes,
          links:links
	    };
      setPath([newPath]);

    // Pan if clicked on empty space
      setIsPanning(true);
      setLastPos(pos);
  };

    const handleMove = (e) => {
        if (!selectedNode && !isPanning) return;
        e.preventDefault();
        const pos = getPos(e);
        const worldPos = screenToWorld(pos.x, pos.y);
        
        if (selectedNode) {
            selectedNode.x = worldPos.x - dragOffset.x;
            selectedNode.y = worldPos.y - dragOffset.y;
            setNodes([...nodes]);
        } else if (isPanning && lastPos) {
            const dx = pos.x - lastPos.x;
            const dy = pos.y - lastPos.y;
            setPan({ x: pan.x + dx, y: pan.y + dy });
            setLastPos(pos);
        }
    };
    
    const handleUp = () => {
        setSelectedNode(null);
        setIsPanning(false);
    };
    
    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(Math.min(Math.max(zoom * delta, 0.3), 3));
    };

    const handleDoubleClick = (e) => {
        const pos = getPos(e);
        const worldPos = screenToWorld(pos.x, pos.y);
        for (let node of nodes) {
            if (isInside(node, worldPos.x, worldPos.y)) {
                setEditingNode(node);
                setNodeText(node.text);
                return;
            }
        }
    };

    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (editingNode) {
            editingNode.text = nodeText;
            setEditingNode(null);
            setNodes([...nodes]);
        }
    };

    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        if (e.touches && e.touches.length > 0)
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const isInside = (node, x, y) => {
        if (node.shape === "circle") {
            const dx = x - node.x;
            const dy = y - node.y;
            return Math.sqrt(dx * dx + dy * dy) < Math.min((path.end.x-path.start.x), (path.end.y-path.start.y)) ;
        } else {
            return (
                x >= node.x - (path.end.x-path.start.x) / 2 &&
                    x <= node.x + (path.end.x-path.start.x) / 2 &&
                    y >= node.y - (path.end.y-path.start.y) / 2 &&
                    y <= node.y + (path.end.y-path.start.y) / 2
            );
        }
    };

    const addNode = () => {
        const canvas = canvasRef.current;
        const newNode = {
            x: (Math.random() * (canvas.width - 200) + 100 - pan.x) / zoom,
            y: (Math.random() * (canvas.height - 200) + 100 - pan.y) / zoom,
            text: nodeText || "Node",
            shape: shape,
            width: 80,
            height: 50,
            color:color,
        };
        setNodes([...nodes, newNode]);
        
        setNodeText("");
    };
    
    const handleColorChange=(e)=>{
        setColor(e.target.value);
    }
    
    const drawAll = () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        ctx.save();
        if(ctx){
            const gridSize=30;
            const canvas = canvasRef.current;
            const ctx=canvas.getContext('2d');
            ctx.strokeStyle='#aaa3';
            ctx.lineWidth=1;
            for(let x=(pan.x%gridSize);x<=canvas.width;x+=gridSize){
                ctx.beginPath();
                ctx.moveTo(x,0);
                ctx.lineTo(x,canvas.height);
                ctx.stroke();
            }
            for(let y=(pan.y%gridSize);y<=canvas.height;y+=gridSize){
                ctx.beginPath();
                ctx.moveTo(0,y);
                ctx.lineTo(canvas.width,y);
                ctx.stroke();
            }
        }
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);
        const nodesPath=path.filter((p)=>p.type==="nodes");
        const linksPath=path.filter((p)=>p.type==="links");
        nodes.forEach((node)=>drawNode(node));
        links.forEach(drawLink);
        console.log(path.filter((p)=>p.type));
        console.log(linksPath);
        ctx.restore();
    };
    
    function rand(j){
        return (Math.random()+0.9)*1.6*j;
    }
    
  return (
      <div>
          <div className='nodetype'>{linkMode?'LinkMode':shape}</div>
          <div className="nodebar">
              <button onClick={addNode}><Plus size={21}/></button>
              <button onClick={() => nodes.length>1?setLinkMode(true):setLinkMode(false)}><Workflow size={21}/></button>               

              {['pointer',"circle", "rectangle", "diamond", "triangle", "ellipse", "pentagon"].map(
                  (s) => (
                      <button key={s} className="shape" onClick={() => {setShape(s);setLinkMode(false);}}>
                          {tools[s]}
                      </button>
                  )
              )}
              <input className='color-input' type="color" value={color} onChange={handleColorChange}/>
          </div>
          
          {editingNode && (
              <form
                  onSubmit={handleTextSubmit}
                  style={{
                      position: "absolute",
                      top: editingNode.y + pan.y,
                      left: editingNode.x + pan.x,
                      zIndex: 20,
                  }}
              >
                  <input
                      autoFocus
                      value={nodeText}
                      onChange={(e) => setNodeText(e.target.value)}
                      onBlur={handleTextSubmit}
                      onMouseLeave={handleTextSubmit}
                      onFocusChange={handleTextSubmit}
                      style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          background: "white",
                          fontSize:'20px',
                          color: "black",
                          border: "1px solid #000",
                      }}
                  />
              </form>
          )}
          
          <canvas
              ref={canvasRef}
              onMouseDown={handleDown}
              onMouseMove={handleMove}
              onMouseUp={handleUp}
              onDoubleClick={handleDoubleClick}
              onWheel={handleWheel}
              onTouchStart={handleDown}
              onTouchMove={handleMove}
              onTouchEnd={handleUp}
              style={{ width: "100vw", height: "100vh", background: "#fff" }}
          />
      </div>
  );
};

