import "./Canvas.css";
import React, { useState, useRef, useEffect } from "react";
import { 
    LineSquiggle,
    MousePointer2,
    PencilLineIcon,
    SquareIcon,
    Circle,
    ArrowUpLeft,
    Baseline,
    LucideSquareDashedMousePointer,
    // CheckIcon,
    Undo2,
    Redo2,
    Plus,
    Save,
    FolderOpen,
    Trash2,
    Delete,
    Move,
} from "lucide-react";
import {openDB} from 'idb';


const TOOL_POINTER="pointer";
const TOOL_PEN = "pen";
const TOOL_LINE = "line";
const TOOL_RECT = "rect";
const TOOL_CIRCLE = "circle";
const TOOL_TEXT = "text";
const TOOL_ARROW = "arrow";
const TOOL_SELECT = "select";
const TOOL_PAN="pan";


const DB_NAME="notesDB";
const STORE_NAME="canvas";

export function initDB() {
    const db=openDB(DB_NAME,1,{
        upgrade(db){
            if(!db.objectStoreNames.contains('canvas') && !db.objectStoreNames.contains('files')) {
                db.createObjectStore('files',{keyPath:'filename'});
                db.createObjectStore('canvas',{keyPath:'filename'});
            }
        },
    });
    return db;
}


export const loadDrawing=async (name)=>{
    const db=await initDB();
    const index=db.transaction('canvas').store.index('filename');
    return index.get(name);
};

export const getAllDrawing=async ()=>{
    const db=await initDB();
    return db.getAll('canvas');
};


export function Canvas() { 
    const canvasRef = useRef(null); 
    const [drawingId, setDrawingId]=useState(null);
    const [drawingName, setDrawingName]=useState('untitled');
    const [tool, setTool] = useState(TOOL_POINTER); 
    const [isDrawing, setIsDrawing] = useState(false);
    
    const [paths, setPaths] = useState([])
    const [selectedIds, setSelectedIds] = useState(null)

    const [currentPath, setCurrentPath] = useState(null);

    const [editingTextId, setEditingTextId] = useState(null);
    const [editingTextValue, setEditingTextValue] = useState([]);
    const [textPosition,setTextPosition]=useState({x:0,y:0});

    const [color,setColor]=useState("#222222");
    
    const [history, setHistory] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    const [showModal, setShowModal]=useState(false);
    const [showSaveModal, setSaveModal]=useState(false);
    const [drawingList, setDrawingList]=useState([]);    
    const [dragging,setDragging]=useState(null);

    const [startPos,setStartPos]=useState({x:0,y:0});
    const [offset,setOffset]=useState({x:0,y:0});
    const [isDragging,setIsDragging]=useState(false);
    const [last,setLast]=useState({x:0,y:0});
    const [panningEnabled,setPanningEnabled]=useState(false);
    const [rects,setRects]=useState([]);
    const [scale,setScale]=useState(1);
    
    
    const pinch=useRef({dist:0,scale:1});
    const initialOffset=useRef({x:0,y:0});
    const dbRef=useRef(null);
    const textareaRef=useRef(null);
        
    async function loadFileList() {
        const tx=dbRef.current.transaction('canvas',"readonly");
        const store=tx.objectStore('canvas');
        const keys=await store.getAllKeys();
        setDrawingList(keys);
    }
    
    useEffect(()=>{
        (async ()=>{
            dbRef.current=await initDB();
            await loadFileList();
        })();
    },[]);

    // useEffect(()=>{
    //     if(!textareaRef.current) return;
    //     textareaRef.current.textContent=editingTextValue||" ";
    //     textareaRef.current.style.width=textareaRef.current.offsetWidth+6+"px";
    // },[editingTextValue])
    
    
    const handleNew=()=>{
	      setPaths([]);
	      setDrawingId(null);
	      setDrawingName('');
    };
    
    async function openFile(name) {
        const tx=dbRef.current.transaction('canvas',"readonly");
        const store =tx.objectStore('canvas');
        const file=await store.get(name);
        if(file) {
            setDrawingName(file.filename);
            setPaths(file.paths);
            console.log("Opened : ",name,", Paths: ",file.paths);

            setShowModal(false);
            if (canvasRef.current) {
                canvasRef.current.focus();
            }
        }
    };
    
    async function saveFile(name,paths) {
        if (!drawingName || drawingName==="untitled"){
            alert("Please enter a filename before saving");
            return;
        }
        const tx=dbRef.current.transaction('canvas',"readwrite");
        const store=tx.objectStore('canvas');
        //console.log("inSavefunc");
        await store.put({filename:name,paths});
        console.log("Saved",name,", Paths: ",paths);
        await tx.done;
        await loadFileList();
        alert(`File ${drawingName} Saved`);
        setSaveModal(false);
    }
    
    async function deleteFile(name){
        const tx=dbRef.current.transaction('canvas',"readwrite");
        const store=tx.objectStore('canvas');
        await store.delete(name);
        await tx.done;
        await loadFileList();
        if (name===drawingName){
            handleNew();
        }
    };
    
    const getEventCoords = (e) => { 
	      const canvas = canvasRef.current;
	      const rect = canvas.getBoundingClientRect();
	      if (e.touches && e.touches[0]) {
            return { 
		            x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top, isTouch: true, };
	      }
	      else if (e.nativeEvent) { 
            return { 
		            x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, isTouch: false, };
	      }
	      return {x: 0, y: 0, isTouch: false };
    };
    
    
    const toWorld=(e)=>{
        const {x,y}=getEventCoords(e);
        return { x:x-offset.x, y:y-offset.y };    
    }
    
    const handleColorChange=(e)=>{
        setColor(e.target.value);
    }
    
    const handleDoubleClick=(e)=>{
        const {x,y}=getEventCoords(e);
        const ctx = canvasRef.current.getContext("2d");
        console.log("Double Clicked");
        const pos=toWorld(e);
        const hit=paths.find(p=>
            p.tool==="text" &&
                pos.x >= Math.min(p.start.x,p.end.x)-20 &&
                pos.x <= Math.max(p.start.x,p.end.x)+ctx.measureText(p.text).width*2 &&
                pos.y >= Math.min(p.start.y,p.end.y)-10 &&
                pos.y <= Math.max(p.start.y,p.end.y)+30 
            );
        if(hit){
            //console.log([hit.id,hit.start.x,hit.start.y,hit.text]);
            setEditingTextId(hit.id);
            setEditingTextValue(hit.text);
            setTextPosition({x:hit.start.x,y:hit.start.y});
            return;
        }
    }
    
    const handlePointerDown = (e) => { 
	      const { x, y } = getEventCoords(e);
        const pos=toWorld(e);

        const ctx = canvasRef.current.getContext("2d");	      
        if(tool===TOOL_PAN || e.button===1){
            setPanningEnabled(true);
            setIsDrawing(false);
            setLast({x,y});
            return;
        }

        
	      if(tool===TOOL_SELECT){
            const hit = paths.find(p => p.tool!=="pointer" &&
                                   p.start && p.end &&
		                               pos.x >= Math.min(p.start.x, p.end.x) -10 &&
		                               pos.x <= Math.max(p.start.x, p.end.x) +10 &&
		                               pos.y >= Math.min(p.start.y, p.end.y) -10 &&
		                               pos.y <= Math.max(p.start.y, p.end.y) +10
                                  );
            if (hit) {
                //console.log("Shape hit:: ",hit);
                setSelectedIds([hit.id]);
                setDragging({x:pos.x,y:pos.y});
                return;
            }
            else{
                console.log("Shaped undefined/Not Found");
            }
        }
        
        
        if(tool===TOOL_POINTER || tool===TOOL_SELECT){
            const ctx = canvasRef.current.getContext("2d");
            const hitTxt=paths.find(p=>p.tool==="text" &&
                                    pos.x >= Math.min(p.start.x,p.end.x)-10 &&
                                    pos.x <= Math.max(p.start.x,p.end.x)+ctx.measureText(p.text).width*2 &&
                                    pos.y >= Math.min(p.start.y,p.end.y)-20 &&
                                    pos.y <= Math.max(p.start.y,p.end.y)+30 
                                   );
            if(hitTxt){
                //console.log("hitted");
                //console.log("Text hit:: ",hitTxt.tool);
                //console.log([hitTxt.id]);
                setSelectedIds([hitTxt.id]);
                setDragging({x:pos.x,y:pos.y});
                return;
            }else{
                console.log("Text not found!!!")
            }
        }
	    
	      setSelectedIds([]);
	      setIsDrawing(true);
	    
	      const id = Date.now();
	      const newPath = {
	          id,
	          tool,
	          //points: [{ x, y }], //default No Panning
            points:[pos],
	          start: pos,
	          end: pos,
	          text: '',
            color: color,
	      };
        
        if( tool===TOOL_TEXT ){
            setEditingTextId(id);
            setEditingTextValue('');
            setTextPosition({x,y});
            setPaths(prev=>[...prev,newPath]);
            return;
        }


        
	    setCurrentPath(newPath);
	    setPaths(prev => {
	        const updated = [...prev, newPath];
	        setHistory([...history, prev]);
	        setRedoStack([]);
	        return updated;
	    });

    };

    
    const handlePointerMove = (e) => { 
	      const { x, y } = getEventCoords(e);
        const pos=toWorld(e);
        
	      if(dragging && selectedIds.length>0){
            const dx=pos.x-dragging.x;
            const dy=pos.y-dragging.y;
            setPaths(prev=>prev.map(
                p=>selectedIds.includes(p.id) ?
                    {
                        ...p,
                        start:{
                            x:p.start.x+dx,y:p.start.y+dy
                        },
                        end:{
                            x:p.end.x+dx,y:p.end.y+dy
                        },
                        points:p.points.map(pt=>(
                            {x:pt.x+dx,y:pt.y+dy}
                        ))
                    }
                :p));
            setDragging({x:pos.x,y:pos.y});
        };	    

        if(tool===TOOL_PAN && panningEnabled){
            const dx=x-last.x;
            const dy=y-last.y;
            //console.log("Panning moved");
            setOffset((prev)=>({x:prev.x+dx,y:prev.y+dy}));
            setLast({x:x,y:y});
            return;
        }
	      if (!isDrawing || !currentPath) return;
        //setLast(toWorld);
      
	      setPaths(prev => prev.map(path => {
	          if (path.id !== currentPath.id) return path;
	          return {
		            ...path,
		            points: [...path.points, pos],
		            end: pos,
	          };
	      }));  
    };
    
    const handlePointerUp = () => { 
        setCurrentPath(null);
        setIsDrawing(false);
        setDragging(null);
        if(panningEnabled){
            setPanningEnabled(false);
            return;
        }    
    };
    
    const undo = () => {
        if (history.length > 0) {
            const last = history[history.length - 1];
            setRedoStack(prev => [paths, ...prev]);
            setPaths(last);
            setHistory(history.slice(0, -1));
        }
    };
    
    const redo = () => {
        if (redoStack.length > 0) {
	          const next = redoStack[0];
	          setHistory(prev => [...prev, paths]);
	          setPaths(next);
	          setRedoStack(redoStack.slice(1));
	      }
    };
    
    function rand(j){
        return (Math.random()+0.8)*2*j;
    }

    
    useEffect(() => { 
        function sketchyRect(ctx,x,y,w,h,opts={}){
            const {strokes=4,jitter=2}=opts;
            ctx.globalAlpha=1;
            for(let i=0;i<strokes;i++){
                ctx.beginPath();
                ctx.moveTo(x+rand(jitter),y+rand(jitter));
                ctx.lineTo(x+w+rand(jitter),y+rand(jitter));
                ctx.lineTo(x+w+rand(jitter),y+h+rand(jitter));
                ctx.lineTo(x+rand(jitter),y+h+rand(jitter));
                ctx.closePath();
                ctx.stroke();
                ctx.fill();
            }
        }
        
        function sketchyCircle(ctx,startx,starty,endx,endy,opts={}){
            const {strokes=4,jitter=2}=opts;
            var rx=(endx-startx)/2;
            var ry=(endy-starty)/2;
            if(rx<0){
                rx=rx*-1;
            }
            if(ry<0){
                ry=ry*-1;
            }
            //ctx.strokeRect(startx,starty,(endx-startx),(endy-starty));
             for(let i=0;i<strokes;i++){
                 ctx.beginPath();
                 ctx.ellipse(
                     (startx+endx)/2+rand(jitter),
                     (starty+endy)/2+rand(jitter),
                     rx+rand(jitter),
                     ry+rand(jitter),
                     0,
                     0,
                     Math.PI*2
                 );
                 ctx.stroke();
                 ctx.fill();
             }
        }
        
        function sketchyLine(ctx,x1,y1,x2,y2,opts={}){
            const {strokes=4,jitter=2}=opts;
            ctx.globalAlpha=1;
            for(let i=0; i < strokes; i++){
                ctx.beginPath();
                ctx.moveTo(x1+rand(jitter),y1+rand(jitter));
                ctx.lineTo(x2+rand(jitter),y2+rand(jitter));
                ctx.closePath();
                ctx.stroke();
                ctx.fill();
            }
        }
    
        function sketchyArrow(ctx,x1,y1,x2,y2,opts={}){
            const {strokes=4,jitter=2}=opts;
            const headlen=25;
            const controlx=(x2-x1);
            const controly=(y2-y1);
            const angle=Math.atan2(y2-y1,x2-x1);
            for(let i=0; i < strokes; i++){
                ctx.beginPath();
                ctx.moveTo(x1+rand(jitter),y1+rand(jitter));
                ctx.lineTo(x2+rand(jitter),y2+rand(jitter));
                //ctx.quadraticCurveTo(controlx,controly,x2,y2);
                ctx.stroke();
                ctx.closePath();
                               
                const hx=x2+rand(jitter);
                const hy=y2+rand(jitter);
                ctx.beginPath();
                ctx.moveTo(hx,hy);
                ctx.lineTo(hx-headlen*Math.cos(angle-Math.PI/6),hy-headlen*Math.sin(angle-Math.PI/6));
                ctx.moveTo(hx,hy);
                ctx.lineTo(hx-headlen*Math.cos(angle+Math.PI/6),hy-headlen*Math.sin(angle+Math.PI/6));
                ctx.stroke();
                ctx.closePath();
            }
            return;
        }
    
	      const canvas = canvasRef.current;
	      const ctx = canvas.getContext('2d');
	      ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
                
        ctx.translate(offset.x,offset.y);
//        ctx.strokeStyle=color;
	      const drawPath = (path) => {
	          if (!path) return;
	          ctx.beginPath();
            const { tool, points, start, end, text, color } = path;            
	          switch (tool) {
	          case TOOL_PEN:
                ctx.strokeStyle=color;
	              ctx.lineWidth=3;
                ctx.lineJoin="round";
                ctx.lineCap="round";
		            ctx.moveTo(points[0].x, points[0].y);
		            points.forEach(p => ctx.lineTo(p.x, p.y));
                ctx.stroke();
                break;
	          case TOOL_LINE:
                ctx.strokeStyle=color;
                ctx.lineWidth=2;
                ctx.fillStyle=color+"05";
                sketchyLine(ctx,start.x,start.y,end.x,end.y);
                //ctx.moveTo(start.x, start.y);
                //ctx.lineTo(end.x, end.y);
                //ctx.stroke();
                break;
	          case TOOL_RECT:
                ctx.strokeStyle=color;
                ctx.fillStyle=color+"02";
                ctx.lineWidth=1;
                sketchyRect(ctx,start.x, start.y, end.x - start.x, end.y - start.y,{strokes:8,jitter:3});
                //ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
                break;
	          case TOOL_CIRCLE:
                ctx.strokeStyle=color;
                ctx.fillStyle=color+"03";
                ctx.lineWidth=2;
		            //const radius = Math.hypot(end.x - start.x, end.y - start.y);
                sketchyCircle(ctx,start.x,start.y,end.x,end.y);
		            //ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
		            //ctx.stroke();
		            break;
	          case TOOL_ARROW:
                ctx.strokeStyle=color;
                ctx.lineWidth=2;
                sketchyArrow(ctx,start.x,start.y,end.x,end.y);
		            //drawArrow(ctx, start, end);
		            break;
	          case TOOL_TEXT:
		            if (text) {
                    ctx.strokeStyle=color;
                    ctx.fillStyle=color;
                    ctx.font = "28px Schoolbell,Single Day, Monospace,cursive";
                    const lines=text.split('\n');
                    lines.forEach((line,i)=>ctx.fillText(line,start.x+2,start.y+28*(i)+28));
		            }
		            break;
            default:
                break;
	          }
            
	      };
	      paths.forEach(drawPath);
        ctx.restore();
    }, [paths,offset,scale]);
    
    // const drawArrow = (ctx, start, end) => { 
	  //     const headlen = 20;
	  //     const dx = end.x - start.x;
	  //     const dy = end.y - start.y;
	  //     const angle = Math.atan2(dy, dx);
    //     ctx.beginPath();
	  //     ctx.moveTo(start.x, start.y);
	  //     ctx.lineTo(end.x, end.y);
	  //     ctx.moveTo(end.x, end.y);
	  //     ctx.lineTo(end.x - headlen * Math.cos(angle - Math.PI / 6), end.y - headlen * Math.sin(angle - Math.PI / 6));
	  //     ctx.moveTo(end.x, end.y);
	  //     ctx.lineTo(end.x - headlen * Math.cos(angle + Math.PI / 6), end.y - headlen * Math.sin(angle + Math.PI / 6));
	  //     ctx.stroke();
    //     return;
    // };
    
    const applyTextEdit = () => {
        setPaths(prev => prev.map(p => p.id === editingTextId ? { ...p, text: editingTextValue } : p) ); 
        setEditingTextId(null);
        setEditingTextValue('');
        setTool('pointer');
    };

    return (
          <div>
            <div className="menu">
                <button onClick={handleNew}><Plus></Plus></button>
                <button onClick={()=>setShowModal(true)}><FolderOpen></FolderOpen></button>
                <button onClick={()=>setSaveModal(true)}><Save></Save></button>
                <button onClick={()=>setShowModal(true)}><Trash2></Trash2></button>
            </div>
            
            <div className="hist-tools">
                <button onClick={undo}><Undo2></Undo2></button>
                <button onClick={redo}><Redo2></Redo2></button>
            <button onClick={() => setPaths([])}><Delete/></button>
          </div>

        
        <div className="toolbar">
            <input type="color" value={color} onChange={handleColorChange}/>
            <button onClick={() => setTool(TOOL_POINTER)}><MousePointer2></MousePointer2></button>
            <button onClick={() => setTool(TOOL_PEN)}><LineSquiggle></LineSquiggle></button>
            <button onClick={() => setTool(TOOL_LINE)}><PencilLineIcon></PencilLineIcon></button>
            <button onClick={() => setTool(TOOL_RECT)}><SquareIcon></SquareIcon></button>
            <button onClick={() => setTool(TOOL_CIRCLE)}><Circle></Circle></button>
            <button onClick={() => setTool(TOOL_ARROW)}><ArrowUpLeft></ArrowUpLeft></button>
            <button onClick={() => setTool(TOOL_TEXT)}><Baseline></Baseline></button>
            <button onClick={() => setTool(TOOL_SELECT)}><LucideSquareDashedMousePointer></LucideSquareDashedMousePointer></button>
            <button onClick={() => setTool(TOOL_PAN)}><Move></Move></button>
        </div>

        <div className="toolid" style={{background:"transparent",boxShadow:`0 0 5px ${color}`,color:color}}>
            {tool}
        </div>
        
        {editingTextId && (
            <textarea
                ref={textareaRef}
                style={{
                    position:"absolute",
                    fontSize:"28px",
                    margin:"0",
                    left:textPosition?textPosition.x:0,
                    top:textPosition?textPosition.y:0,
                    background:"white",
                    minWidth:"1ch"
                }}
                row={1}
                value={editingTextValue}
                onChange={(e)=>setEditingTextValue(e.target.value)}
                onMouseLeave={applyTextEdit}
                onTouchEnd={applyTextEdit}
                onKeyDown={(e)=>{if(e.key==="Escape") applyTextEdit();}}
                autoFocus
            />
        )}
        
        <canvas
            ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
            style={{ touchAction: "none",cursor:tool==="select" || tool==="pan"?"grab":tool==="pointer" ? "default":"crosshair",display:"block" }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            onDoubleClick={handleDoubleClick}
        />

        { showModal && (
            <div className="modal">
                <div className="modal-container">
                    <h2>Select a File</h2>
                    <ul>
                        {drawingList.map((name)=>(
                            <li key={name}>
                                <span onClick={()=>openFile(name)} style={{cursor:'pointer',flexGrow:1}}>{name}</span>
                                <button onClick={()=>{deleteFile(name)}} className="delete-button"><Trash2 size={14}></Trash2></button>
                            </li>
                        ))}
                    </ul>
                    <button onClick={()=>setShowModal(false)}>Cancel</button>
                </div>
            </div>
        )}

        { showSaveModal && (
            <div className="modal">
                <div className="modal-container">
                    <h2>Save File</h2>
                    <input type="text" value={drawingName} onChange={(e)=>setDrawingName(e.target.value)}></input>
                    <div className="buttons">
                        <button onClick={()=>saveFile(drawingName,paths)} >Save</button>
                        <button onClick={()=>setSaveModal(false)} >Cancel</button>
                    </div>
                </div>
            </div>
        )}
	      </div>
    );
}
