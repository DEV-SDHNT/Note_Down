import "./Canvas.css";
import io from 'socket.io-client';
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
    Undo2,
    Redo2,
    Plus,
    Save,
    FolderOpen,
    Trash2,
    Delete,
    Move,
    Eraser,
    Sun,
    Moon,
    Grid2x2,
    Undo,
    Cable,
    Merge
} from "lucide-react";
import {openDB} from 'idb';


const TOOL_POINTER = "pointer";
const TOOL_PEN = "pen";
const TOOL_LINE = "line";
const TOOL_RECT = "rect";
const TOOL_CIRCLE = "circle";
const TOOL_TEXT = "text";
const TOOL_ARROW = "arrow";
const TOOL_SELECT = "select";
const TOOL_PAN = "pan";
const TOOL_ERASER = "eraser";
const TOOL_SPLINEARROW="spline";
const TOOL_LINK='link';


const DB_NAME = "notesDB";
const STORE_NAME = "canvas";

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
    const [grid,setGrid]=useState(true);
    const [paths, setPaths] = useState([])
    const [selectedIds, setSelectedIds] = useState(null)

    const [currentPath, setCurrentPath] = useState(null);

    const [links,setLinks]=useState([]);
    
    const [editingTextId, setEditingTextId] = useState(null);
    const [editingTextValue, setEditingTextValue] = useState([]);
    const [textPosition,setTextPosition]=useState({x:0,y:0});
    const [longestWordSize,setLongestWordSize]=useState(0);
    
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
    const [darkMode,setDarkMode]=useState(false);
    const [color,setColor]=useState("#444444");
    const [hovered,setHovered]=useState(false);
    const [linkMode,setLinkMode]=useState(false);
    const pinch=useRef({dist:0,scale:1});
    const initialOffset=useRef({x:0,y:0});
    const dbRef=useRef(null);
    const textareaRef=useRef(null);

    const [collab,setCollab]=useState(false);
    const [socket,setSocket]=useState(null);
    const [connection,setConnection]=useState(false);
    const [userId,setUserId]=useState('');
    const [targetId,setTargetId]=useState('');
    const [receivedPaths,setReceivedPaths]=useState([]);
    

    const ws=useRef(null);

    
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
            //console.log("Opened : ",name,", Paths: ",file.paths);

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
   
        await store.put({filename:name,paths});
        //console.log("Saved",name,", Paths: ",paths);
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

    
    
    const handlePointerDown = (e) => { 
	      const { x, y } = getEventCoords(e);
        const pos=toWorld(e);
        //----------------Start----------------------------------------------------->
        if(tool===TOOL_LINK) {
            
        }
        //---------------| End |---------------------------------------------------->      
        
        const ctx = canvasRef.current.getContext("2d");	      
        if(tool===TOOL_PAN || e.button===1){
            setPanningEnabled(true);
            setIsDrawing(false);
            setLast({x,y});
            return;
        }

        
	      if(tool===TOOL_SELECT){
            const ctx = canvasRef.current.getContext("2d");
            const hit = paths.find(p => p.tool!=="pointer" &&
                                   p.start && p.end &&
		                               pos.x >= Math.min(p.start.x, p.end.x) -10 &&
		                               pos.x <= Math.max(p.start.x, p.end.x) +10 &&
		                               pos.y >= Math.min(p.start.y, p.end.y) -10 &&
		                               pos.y <= Math.max(p.start.y, p.end.y) +10
                                  );
            if (hit) {                
                setSelectedIds([hit.id]);
                setDragging({x:pos.x,y:pos.y});
                return;
            }
            else{
                console.log("Shaped undefined/Not Found");
            }
        }

	      if(tool===TOOL_ERASER){
            const hit = paths.find(p => p.tool!=="pointer" &&
                                   p.start && p.end &&
		                               pos.x >= Math.min(p.start.x, p.end.x) -10 &&
		                               pos.x <= Math.max(p.start.x, p.end.x) -10 &&
		                               pos.y >= Math.min(p.start.y, p.end.y) -10 &&
		                               pos.y <= Math.max(p.start.y, p.end.y) +10
                                  );
            // const hitTxt=paths.find(p=>p.tool==="text" &&
            //                         pos.x >= Math.min(p.start.x,p.end.x)-10 &&
            //                         pos.x <= Math.max(p.start.x,p.end.x)+ctx.measureText(p.text).width*2 &&
            //                         pos.y >= Math.min(p.start.y,p.end.y)-20 &&
            //                         pos.y <= Math.max(p.start.y,p.end.y)+30 
            //                        );
            if (hit) {
                //console.log("Shape hit:: ",hit);
                setPaths(prev=>prev.filter(p=>p.id!==hit.id));
                return;
            }
            else{
                console.log("Shaped undefined/Not Found");
            }
            // else if(hitTxt){
            //     setPaths(prev=>prev.filter(p=>p.id!==hitTxt.id));
            //     return;
            // }
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
            links:[links],
            color: color,
	      };
        
        if( tool===TOOL_TEXT ){
            setEditingTextId(id);
            setEditingTextValue('');
            setTimeout(()=>{
                textareaRef.current?.focus();
            },1);
            setTextPosition({x:pos.x,y:pos.y});
            setPaths(prev=>[...prev,newPath]);
        }


        
	    setCurrentPath(newPath);
	    setPaths(prev => {
	        const updated = [...prev, newPath];
	        setHistory([...history, prev]);
	        setRedoStack([]);
	        return updated;
	    });

    };

    
    const handleDoubleClick=(e)=>{
        if(tool!==TOOL_POINTER) return;
        else{
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
    }
    
    const handlePointerMove = (e) => { 
	      const { x, y } = getEventCoords(e);
        const pos=toWorld(e);
        if(socket!==null) sendData(paths);
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
        return (Math.random()+0.9)*1.6*j;
    }

        // const handleKeyDown=e=>{
        //     if(!editingTextId) return;
        //     e.preventDefault();
        //     console.log("In other Efffffdct");
        //     setPaths(prev=>prev.map(p=>{
        //         if(p.id!==editingTextId) return p;

        //         if(e.key==='Backspace'){
        //             return {...p,text:p.text.slice(0,-1)};
        //         }else if(e.key==='Enter'){
        //             return {...p,text:p.text+"\n"};
        //         }else if(e.key==='Escape'){
        //             setEditingTextId(null);
        //             setTool(TOOL_POINTER);
                   
        //             return p;
        //         }else if(e.key.length===1){
        //             return {...p,text:p.text+e.key};
        //         }
        //         return p;
        //     }));
        // };
    // useEffect(()=>{
    //     if(textareaRef.current) window.addEventListener('keydown',handleKeyDown);
    //     return ()=>window.removeEventListener('keydown',handleKeyDown);
    // },[editingTextId]);

    
    
    
    useEffect(() => { 
        function sketchyRect(ctx,x,y,w,h,opts={}){
            const {strokes=4,jitter=3}=opts;
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
                ctx.lineTo(hx-headlen*Math.cos(angle-Math.PI/6),
                           hy-headlen*Math.sin(angle-Math.PI/6));
                ctx.moveTo(hx,hy);
                ctx.lineTo(hx-headlen*Math.cos(angle+Math.PI/6),
                           hy-headlen*Math.sin(angle+Math.PI/6));
                ctx.stroke();
                ctx.closePath();
            }
            return;
        }

        function sketchyCurvedArrow(ctx,x1,y1,x2,y2,opts={}){
            const {strokes=4,jitter=2}=opts;
            const headlen=25;
            const dx=x2-x1;
            const dy=y2-y1;
            const midx=(x1+x2)/2;
            const midy=(y1+y2)/2;
            const offset=60+rand(jitter);
            const angle1=Math.atan2(y2-y1,x2-x1);
            const controlx=midx+(dx/2.5)/Math.sqrt((dx*dx)/2.3+(dy*dy)/2)*offset+rand(jitter);
            const controly=midy+(dx/2.5)/Math.sqrt((dx*dx)/2.4+(dy*dy)/2)*offset+rand(jitter);
            const angle=Math.atan2(y2-controly+rand(jitter),x2-controlx+rand(jitter));

            for(let i = 0; i < strokes; i++){
                ctx.beginPath();
                ctx.moveTo(x1+rand(jitter),y1+rand(jitter));
                // ctx.lineTo(x2+rand(jitter),y2+rand(jitter));
                ctx.quadraticCurveTo(controlx,controly,x2,y2);
                ctx.stroke();
                ctx.closePath();
                               
                const hx=x2;
                const hy=y2;
                ctx.beginPath();
                ctx.moveTo(hx,hy);
                ctx.lineTo(hx-headlen*Math.cos(angle-Math.PI/6),
                           hy-headlen*Math.sin(angle-Math.PI/6));
                ctx.moveTo(hx,hy);
                ctx.lineTo(hx-headlen*Math.cos(angle+Math.PI/6),
                           hy-headlen*Math.sin(angle+Math.PI/6));
                ctx.stroke();
                ctx.closePath();
            }
            return;
        }

        function sketchyLink(link){
            return;
        }
        
    
	      const canvas = canvasRef.current;
	      const ctx = canvas.getContext('2d');
	      ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        if(grid){
            const gridSize=30;
            ctx.strokeStyle=darkMode?'#2224':'#ddd4';
            ctx.lineWidth=1;
            for(let x=(offset.x%gridSize);x<=canvas.width;x+=gridSize){
                ctx.beginPath();
                ctx.moveTo(x,0);
                ctx.lineTo(x,canvas.height);
                ctx.stroke();
            }
            for(let y=(offset.y%gridSize);y<=canvas.height;y+=gridSize){
                ctx.beginPath();
                ctx.moveTo(0,y);
                ctx.lineTo(canvas.width,y);
                ctx.stroke();
            }
        }
        ctx.translate(offset.x,offset.y);
//        ctx.strokeStyle=color;

        const drawPath = (path) => {
	          if (!path) return;
	          ctx.beginPath();
            const { tool, points, start, end, text, link, color } = path;       
	          switch (tool) {
	          case TOOL_PEN:
                ctx.strokeStyle=color;
	              ctx.lineWidth=4;
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
                ctx.lineWidth=2;
                sketchyRect(ctx,start.x, start.y, end.x - start.x, end.y - start.y);
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
                    ctx.textAlign="left";
                    ctx.textBaseLine="bottom";
                   
                    const lines=text.split('\n');
                    lines.forEach((line,i)=>ctx.fillText(line,start.x*1,start.y+28*(i)+28));                    
		            }
		            break;
            case TOOL_SPLINEARROW:
                ctx.strokeStyle=color;
                ctx.lineWidth=2;
                sketchyCurvedArrow(ctx,start.x,start.y,end.x,end.y);
                break;
            case TOOL_LINK:
                sketchyLink(links);
            default:
                break;
	          }
	      };
        if(receivedPaths[0]) receivedPaths[0].forEach(drawPath);
	      paths.forEach(drawPath);
        ctx.restore();
    }, [paths,receivedPaths,offset,scale,darkMode,grid]);

    useEffect(()=>{
        if(editingTextId){
            setLongestWordSize(editingTextValue.split('\n').reduce((a,b)=>a.length>=b.length?a:b).length);
            setPaths(prev => prev.map(p => p.id === editingTextId ? { ...p, text: editingTextValue } : p) ); 
        }
        else return;
        
    },[editingTextId,editingTextValue,longestWordSize])

    const  applyTextEdit = () => {
        if (!editingTextId) return ;
        setPaths(prev => prev.map(p => p.id === editingTextId ? { ...p, text: editingTextValue } : p) ); 
        setTool(TOOL_POINTER);
        setEditingTextId(null);
        setEditingTextValue('');
    }
    const backendAPI='wss://note-down-backend.onrender.com';
    //const backendAPI='http://localhost:5000';
    useEffect(()=>{
        //ws.current=new WebSocket('https://note-down-backend.onrender.com');
        const newSocket=io(backendAPI);
        setSocket(newSocket);
        // ws.current.onopen=()=> console.log('Connected to Socket server');

        // ws.current.onmessage=(msg)=>{
        //     const data=JSON.parse(msg.data);
        //     if(data.payload) {setReceivedPaths(data.payload);setConnection(true);}
        //     if(data.error) {alert(data.error);setConnection(false);}
        // };
        //console.log("Socket : ",newSocket);
        newSocket.on('message',(msg)=>{
            const data=JSON.parse(msg);

            if(data.payload){setReceivedPaths(data.payload);setConnection(true);}
            if(data.error){alert(data.error);setConnection(false);}
        });
        //return ()=> ws.current.close(); 
        return ()=>newSocket.disconnect();
    },[]);


    const registerUser=()=>{
        if(userId===targetId) {alert("User ID & Target ID cannot be same.");return ;}
        //ws.current.send(JSON.stringify({type:'register',userId}));
        socket.emit('message',JSON.stringify({type:'register',userId}));
        setConnection(true);
        setCollab(false);
    };

    const sendData=()=>{
        // ws.current.send(JSON.stringify({
        //     type:'send',
        //     userId,
        //     targetId,
        //     payload:[paths]
        // }));
        socket.emit('message',JSON.stringify({
            type:'send',
            userId,
            targetId,
            payload:[paths]
        }));
    };
    
    return (
        <div style={{background:darkMode?"black":"#fffffd"}}>
            <div className="menu">
                <button onClick={handleNew} style={{color:darkMode?'#fffffd':'black',background:darkMode?'#00000031':'#ffffff31'}}><Plus size={18}></Plus></button>
                <button onClick={()=>setShowModal(true)} style={{color:darkMode?'#fffffd':'black',background:darkMode?'#00000031':'#ffffff31'}}><FolderOpen size={18}></FolderOpen></button>
                <button onClick={()=>setSaveModal(true)} style={{color:darkMode?'#fffffd':'black',background:darkMode?'#00000031':'#ffffff31'}}><Save size={18}></Save></button>
                <button onClick={()=>setShowModal(true)} style={{color:darkMode?'#fffffd':'black',background:darkMode?'#00000031':'#ffffff31'}}><Trash2 size={18}></Trash2></button>
            </div>
            
            <div className="hist-tools">
                <button onClick={undo} style={{color:darkMode?'#fffffd':'black',background:darkMode?'#00000031':'#ffffff31'}}><Undo2 size={18}></Undo2></button>
                <button onClick={redo} style={{color:darkMode?'#fffffd':'black',background:darkMode?'#00000031':'#ffffff31'}}><Redo2 size={18}></Redo2></button>
                <button onClick={() => setPaths([])} style={{color:darkMode?'#fffffd':'black',background:darkMode?'#00000031':'#ffffff31'}}><Delete size={18}></Delete></button>        
            </div>

        <div className="theme-mode">
            {darkMode===true &&
             <button
                 name="Darkmode"
                 style={{background:'transparent',color:'#fffffd'}}
                 onClick={()=>{setDarkMode(false)}}
             >
                 <Moon size={18}/>
             </button>}
            {darkMode===false &&
             <button
                 name='Lightmode'
                 style={{background:'transparent',color:'black'}}
                 onClick={()=>setDarkMode(true)}
             >
                 <Sun size={18}/>
             </button>}
            <button
                className='gridButton'
                style={{color:darkMode?'#fffffd':'black',background:darkMode?'#00000041':'#ffffff31'}}
                onClick={()=>grid?setGrid(false):setGrid(true)}>
                <Grid2x2 size={18}></Grid2x2>
            </button>
        </div>
        
        <div className="toolbar">
            <input type="color" value={color} onChange={handleColorChange}/>
            <button onClick={() => setTool(TOOL_POINTER)} style={{color:darkMode?'#fffffd':'black'}}><MousePointer2 size={18}></MousePointer2></button>
            <button onClick={() => setTool(TOOL_ERASER)} style={{color:darkMode?'#fffffd':'black'}}><Eraser size={18}></Eraser></button>
            <button onClick={() => setTool(TOOL_PEN)} style={{color:darkMode?'#fffffd':'black'}}><LineSquiggle size={18}></LineSquiggle></button>
            <button onClick={() => setTool(TOOL_LINE)} style={{color:darkMode?'#fffffd':'black'}}><PencilLineIcon size={18}></PencilLineIcon></button>
            <button onClick={() => setTool(TOOL_RECT)} style={{color:darkMode?'#fffffd':'black'}}><SquareIcon size={18}></SquareIcon></button>
            <button onClick={() => setTool(TOOL_CIRCLE)} style={{color:darkMode?'#fffffd':'black'}}><Circle size={18}></Circle></button>
            <button onClick={() => setTool(TOOL_ARROW)} style={{color:darkMode?'#fffffd':'black'}}><ArrowUpLeft size={18}></ArrowUpLeft></button>
            <button onClick={() => setTool(TOOL_TEXT)} style={{color:darkMode?'#fffffd':'black'}}><Baseline size={18}></Baseline></button>
            <button onClick={() => setTool(TOOL_SPLINEARROW)} style={{color:darkMode?'#fffffd':'black'}}><Undo size={18}/></button>               
            <button onClick={() => setTool(TOOL_SELECT)} style={{color:darkMode?'#fffffd':'black'}}><LucideSquareDashedMousePointer size={18}></LucideSquareDashedMousePointer></button>
            <button onClick={() => setTool(TOOL_PAN)} style={{color:darkMode?'#fffffd':'black'}}><Move size={18}></Move></button>
        </div>

        <div className="toolid" style={{background:"transparent",boxShadow:`0 0 4px ${color}`,color:color}}>
            {tool} <br/> 
        </div>

        <div className="collab" style={{background:"transparent"}}>
            <button
                onClick={()=>collab?setCollab(false):setCollab(true)}
                style={{color:(connection)?"green":(darkMode)?"#fffffd":'black'}}
            ><Cable size={18}/></button>
        </div>

        {collab && (
        <div className="ids">
            <input
                placeholder="Your User ID:"
                value={userId}
                style={{color:darkMode?'#fffffd':'#333A'}}
                onChange={(e)=>setUserId(e.target.value)}
            ></input>
            <input
                placeholder="Target User ID:"
                value={targetId}
                style={{color:darkMode?'#fffffd':'#333A'}}
                onChange={(e)=>setTargetId(e.target.value)}
            />
            <button onClick={registerUser} style={{color:darkMode?'#fffffd':'#333A'}} >Register</button><br/>
        </div>
        )}          
        
        {editingTextId && (
            <textarea
                ref={textareaRef}
                rows={editingTextValue.split('\n').length}
                cols={longestWordSize/2}
                style={{
                    opacity:'0.2',
                    position:'absolute',
                    color:'white',
                    caretColor:'black',
                    left:textPosition.x+offset.x,
                    top:textPosition.y+offset.y,
                    resize:'none',
                    overflow:'hidden',
                    //height:`${editingTextValue.split('\n').length}ch`,
                    width:`${longestWordSize}ch`,
                    fontSize:'27.8px',
                    lineHeight:'1.1',
                    border:'solid 1px grey'
                }}
                value={editingTextValue}
                onChange={(e)=>setEditingTextValue(e.target.value)}
                onMouseLeave={(e)=>applyTextEdit()}
                onTouchEnd={(e)=>applyTextEdit()}
                onFocusChange={(e)=>applyTextEdit()}
                autoFocus
            ></textarea>
        )}
        
        <canvas
            ref={canvasRef}
            width={window.innerWidth*2.3}
            height={window.innerHeight*2.3}
            style={{background:darkMode?'#030303':'#fffffd', touchAction: "none",cursor:tool==="select" || tool==="pan"?"grab":tool==="pointer" ? "default":"crosshair",display:"block" }}
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
