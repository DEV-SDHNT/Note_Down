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
    GitCompareArrows
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
    
    const [drawingName, setDrawingName]=useState('untitled');
    const [tool, setTool] = useState(TOOL_POINTER); 
    const [isDrawing, setIsDrawing] = useState(false);
    const [grid, setGrid] = useState(true);
    const [paths, setPaths] = useState([])
    const [selectedIds, setSelectedIds] = useState(null)

    const [currentPath, setCurrentPath] = useState(null);

    const [links, setLinks]=useState([]);
    const [selectedNode,setSelectedNode]=useState(null);
    
    const [editingTextId, setEditingTextId] = useState(null);
    const [editingTextValue, setEditingTextValue] = useState([]);
    const [textPosition, setTextPosition]=useState({x:0,y:0});
    const [longestWordSize, setLongestWordSize]=useState(0);

    const [history, setHistory] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    const [showModal, setShowModal]=useState(false);
    const [showSaveModal, setSaveModal]=useState(false);
    const [drawingList, setDrawingList]=useState([]);    
    const [dragging, setDragging]=useState(null);

    const [offset, setOffset]=useState({x:0,y:0});
    
    const [last, setLast]=useState({x:0,y:0});
    const [panningEnabled, setPanningEnabled]=useState(false);
    
    const [darkMode, setDarkMode]=useState(false);
    const [color, setColor]=useState("#000000");
    
    const dbRef=useRef(null);
    const textareaRef=useRef(null);

    const [collab, setCollab]=useState(false);
    const [socket, setSocket]=useState(null);
    const [connection, setConnection]=useState(false);
    const [userId, setUserId]=useState('');
    const [targetId, setTargetId]=useState('');
    const [receivedPaths, setReceivedPaths]=useState([]);

    // For Zoom ::
    //const touchDist=useRef(0);
    //const scale=useRef(1);
    //const offsetX=useRef(0);
    //const offsetY=useRef(0);

    
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

    const handleNew=()=>{
	setPaths([]);	
	setDrawingName('');
    };
    
    async function openFile(name) {
        const tx=dbRef.current.transaction('canvas',"readonly");
        const store =tx.objectStore('canvas');
        const file=await store.get(name);
        if(file) {
            setDrawingName(file.filename);
            setPaths(file.paths);            
            setShowModal(false);
            if (canvasRef.current) {
                canvasRef.current.focus();
            }
        }
    };

    async function saveFile(name, paths) {
        if (!drawingName || drawingName==="untitled"){
            alert("Please enter a filename before saving");
            return;
        }
        const tx=dbRef.current.transaction('canvas',"readwrite");
        const store=tx.objectStore('canvas');
        const updatedAt=Date.now();
        await store.put({filename:name,paths,updatedAt:updatedAt});
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
        //return {x: 0, y: 0, isTouch: false };
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
        e.preventDefault();
        if(tool===TOOL_LINK){
            const node = paths.find(p => p.tool!=="pointer" &&
                                    p.start && p.end &&
                                    pos.x >= Math.min(p.start.x, p.end.x) -10 &&
                                    pos.x <= Math.max(p.start.x, p.end.x) +10 &&
                                    pos.y >= Math.min(p.start.y, p.end.y) -10 &&
                                    pos.y <= Math.max(p.start.y, p.end.y) +10
                                   );
            if (node) {
                if (!selectedNode) {
                    setSelectedNode(node.id);
                } else if (selectedNode !== node.id) {
                    setLinks((prev) => [...prev, { from: selectedNode, to: node.id }]);
                    setSelectedNode(null);
                }
            }
        }

        if(tool===TOOL_PAN || e.button===1){
            setPanningEnabled(true);
            setIsDrawing(false);
            setLast({x:x,y:y});
            return;
        }

        if(tool===TOOL_SELECT){
            const hit = paths.find(p => p.tool!=="pointer" &&
                                   p.start && p.end &&
                                   pos.x >= Math.min(p.start.x, p.end.x) -10 &&
                                   pos.x <= Math.max(p.start.x, p.end.x) +((p.text.length>0)?(p.text.split('\n').reduce((a,b)=>a.length>=b.length?a:b).length*10):10) &&
                                   pos.y >= Math.min(p.start.y, p.end.y) -10 &&
                                   pos.y <= Math.max(p.start.y, p.end.y) +((p.text.length>0)?(p.text.split('\n').length*30):10)
                                  );
            if (hit) {
                setSelectedIds([hit.id]);
                setDragging({x:pos.x,y:pos.y});
                return;
            }
        }
	
        if(tool===TOOL_ERASER){
            const hit = paths.find(p => p.tool!=="pointer" &&
                                   p.start && p.end &&
                                   pos.x >= Math.min(p.start.x, p.end.x) -10  &&
                                   pos.x <= Math.max(p.start.x, p.end.x) +((p.text.length>0)?(p.text.split('\n').reduce((a,b)=>a.length>=b.length?a:b).length*10):10) &&
                                   pos.y >= Math.min(p.start.y, p.end.y) -10 &&
                                   pos.y <= Math.max(p.start.y, p.end.y) +((p.text.length>0)?(p.text.split('\n').length*30):10)
                                  );
            if (hit) {
                setPaths(prev=>prev.filter(p=>p.id!==hit.id));
                return;
            }
            else{
                return;
            }
        }


        if(tool===TOOL_POINTER){
            const hitTxt=paths.find(p=>p.tool==="text" &&
                                    pos.x >= Math.min(p.start.x,p.end.x)-10 &&
                                    pos.x <= Math.max(p.start.x,p.end.x)+p.text.split('\n').reduce((a,b)=>a.length>=b.length?a:b).length*10 &&
                                    pos.y >= Math.min(p.start.y,p.end.y)-10 &&
                                    pos.y <= Math.max(p.start.y,p.end.y)+p.text.split('\n').length*30
                                   );
            if(hitTxt){
                setSelectedIds([hitTxt.id]);
                setDragging({x:pos.x,y:pos.y});
                return;
            }
        }
        
        setSelectedIds([]);
        setIsDrawing(true);

        const id = Date.now();
        const newPath = {
            id,
            tool:tool,
            points:[pos],
            start: pos,
            end: pos,
            text: '',
            links:links,
            color: color,
        };
        if( tool===TOOL_TEXT ){
            setEditingTextId(id);
            setEditingTextValue('Text');
            setTimeout(()=>{
                textareaRef.current?.focus();
            },1000);
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
            const ctx = canvasRef.current.getContext("2d");
            const pos=toWorld(e);
            e.preventDefault();
            const hit=paths.find(p=>
                p.tool==="text" &&
                    pos.x >= Math.min(p.start.x,p.end.x)-20 &&
                    pos.x <= Math.max(p.start.x,p.end.x)+ctx.measureText(p.text).width*2 &&
                    pos.y >= Math.min(p.start.y,p.end.y)-10 &&
                    pos.y <= Math.max(p.start.y,p.end.y)+30 
            );
            if(hit){
                setEditingTextId(hit.id);
                setEditingTextValue(hit.text);
                setTextPosition({x:hit.start.x,y:hit.start.y});
            }
       
    }
    
    const handlePointerMove = (e) => { 
        const { x, y } = getEventCoords(e);
        const pos=toWorld(e);
        e.preventDefault();
        if(socket!=null) sendData(paths);
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
            setOffset((prev)=>({x:prev.x+dx,y:prev.y+dy}));
            //offsetX.current+=dx;
            //offsetY.current+=dy;
            setLast({x,y});
            return;
        }

	if (!isDrawing || !currentPath) return;
        
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
        return (Math.random()+0.9)*1.6*j/1;
    }   

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
            ctx.globalAlpha=1;
            if(rx<0){
                rx=rx*-1;
            }
            if(ry<0){
                ry=ry*-1;
            }
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
                ctx.fill("evenodd");
                ctx.stroke();
                ctx.fill();
            }
        }
    
        
        function sketchyArrow(ctx,x1,y1,x2,y2,opts={}){
            const {strokes=4,jitter=2}=opts;
            const headlen=25/1;
            const angle=Math.atan2(y2-y1,x2-x1);
            for(let i=0; i < strokes; i++){
                ctx.beginPath();
                ctx.moveTo(x1+rand(jitter),y1+rand(jitter));
                ctx.lineTo(x2+rand(jitter),y2+rand(jitter));
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
            const headlen=25/1;
            const dx=x2-x1;
            const dy=y2-y1;
            const midx=(x1+x2)/2;
            const midy=(y1+y2)/2;
            const offset=60+rand(jitter);
            //const angle1=Math.atan2(y2-y1,x2-x1);
            const controlx=midx+(dx/2.5)/Math.sqrt((dx*dx)/2.3+(dy*dy)/2)*offset+rand(jitter);
            const controly=midy+(dx/2.5)/Math.sqrt((dx*dx)/2.4+(dy*dy)/2)*offset+rand(jitter);
            const angle=Math.atan2(y2-controly+rand(jitter),x2-controlx+rand(jitter));

            for(let i = 0; i < strokes; i++){
                ctx.beginPath();
                ctx.moveTo(x1+rand(jitter),y1+rand(jitter));                
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
   
        // const getTouchCenter = (t1, t2) => ({
        //     x: (t1.clientX + t2.clientX) / 2,
        //     y: (t1.clientY + t2.clientY) / 2
        // });
        
        //const distance = (t1, t2) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);                   

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);
       
        ctx.save();
        
        if(grid){
            const gridSize=30;
            ctx.strokeStyle=darkMode?'#2224':'#9994';
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

        const fontSize=29/1;
        const drawPath = (path) => {
            if (!path) return;
            ctx.beginPath();
            const { tool, points, start, end, text, color } = path;
            switch (tool) {
            case TOOL_PEN:
                ctx.strokeStyle=color;
                ctx.lineWidth=3/1;
                ctx.fillStyle=color+"05";
                ctx.lineJoin="round";
                ctx.lineCap="round";
                ctx.moveTo(points[0].x, points[0].y);
                points.forEach(p => ctx.lineTo(p.x, p.y));
                ctx.fill("evenodd");
                ctx.stroke();
                break;
            case TOOL_LINE:
                ctx.strokeStyle=color;
                ctx.fillStyle=color+"09";
                ctx.lineWidth=2.3/1;
                sketchyLine(ctx,start.x,start.y,end.x,end.y);
                ctx.stroke();
                break;
            case TOOL_RECT:
                ctx.strokeStyle=color;
                ctx.fillStyle=color+"02";
                ctx.lineWidth=2.3/1;
                sketchyRect(ctx,start.x, start.y, end.x - start.x, end.y - start.y);
                break;
            case TOOL_CIRCLE:
                ctx.strokeStyle=color;
                ctx.fillStyle=color+"03";
                ctx.lineWidth=2.3/1;
                sketchyCircle(ctx,start.x,start.y,end.x,end.y);
                break;
            case TOOL_ARROW:
                ctx.strokeStyle=color;
                ctx.lineWidth=2/1;
                sketchyArrow(ctx,start.x,start.y,end.x,end.y);
                break;
            case TOOL_TEXT:
                if (text) {
                    ctx.strokeStyle=color;
                    ctx.fillStyle=color;
                    ctx.font = fontSize+"px Schoolbell,Single Day, Monospace,cursive";
                    ctx.textAlign="left";
                    ctx.textBaseLine="bottom";                   
                    const lines=text.split('\n');
                    lines.forEach((line,i)=>ctx.fillText(line,start.x*1,start.y+28*(i)+28));                    
                }
                break;
            case TOOL_SPLINEARROW:
                ctx.strokeStyle=color;
                ctx.lineWidth=2.4/1;
                sketchyCurvedArrow(ctx,start.x,start.y,end.x,end.y);
                break;
            default:
                break;
            }
        };
        if(receivedPaths[0]) receivedPaths[0].forEach(drawPath);

        paths.forEach(drawPath);
        
        const getBorderPoint=(path,angle)=>{
            const sin=Math.sin(angle);
            const cos=Math.cos(angle);
            
            const w=(path.end.x-path.start.x)/2;
            const h=(path.end.y-path.start.y)/2;
            switch (path.tool){
            case "circle":
            case "ellipse":
                const r=Math.max(w,h)/0.8;
                const cx=(path.end.x+path.start.x)/2;
                const cy=(path.end.y+path.start.y)/2;
                return {
                    x:cx+cos*r,
                    y:cy+sin*r,
                };
            case "rect":
                const rcx=(path.end.x+path.start.x)/2;
                const rcy=(path.end.y+path.start.y)/2;
                const dx=Math.abs(w/cos);
                const dy=Math.abs(h/sin);
                const min=Math.min(dx,dy)/0.8;
                return {
                    x:rcx+cos*min,
                    y:rcy+sin*min,
                };
            default:
                const dcx=(path.end.x+path.start.x)/2;
                const dcy=(path.end.y+path.start.y)/2;
                return {
                    x:dcx,
                    y:dcy,
                }
            }
        }

        const drawLink = (from,to) => {
            const dx=to.end.x-from.end.x;
            const dy=to.end.y-from.end.y;
            const angle=Math.atan2(dy,dx);
            const strokes=3;
            const jitter=2;
            const headlen=25/1;
            const start=getBorderPoint(from,angle);
            const end=getBorderPoint(to,angle+Math.PI);
            for(let i=0;i<strokes;i++){
                ctx.beginPath();
                ctx.moveTo(start.x+rand(jitter), start.y+rand(jitter));
                ctx.lineTo(end.x+rand(jitter), end.y+rand(jitter));
                ctx.strokeStyle = color;
                ctx.lineWidth = 2/1;
                ctx.stroke();

                ctx.beginPath();
                ctx.strokeStyle=color;
                ctx.moveTo(end.x+rand(jitter), end.y+rand(jitter));
                ctx.lineTo(
                    end.x - headlen * Math.cos(angle - Math.PI/5)+rand(jitter),
                    end.y - headlen * Math.sin(angle - Math.PI/5)+rand(jitter)
                );
                ctx.moveTo(end.x+rand(jitter), end.y+rand(jitter));
                ctx.lineTo(
                    end.x - headlen * Math.cos(angle + Math.PI/5)+rand(jitter),
                    end.y - headlen * Math.sin(angle + Math.PI/5)+rand(jitter)
                );
                ctx.stroke();
                ctx.closePath();
            }
        };

        links.forEach((link) => {
            const a = paths.find((n) => (n.id === link.from && n.tool!==TOOL_POINTER));
            const b = paths.find((n) => (n.id === link.to && n.tool!==TOOL_POINTER));
            if (a && b) drawLink(a,b);
            });
        ctx.restore();
    }, [paths,color,receivedPaths,links,selectedNode,offset,darkMode,grid]);
        
    
    useEffect(()=>{
        if(editingTextId){
            setLongestWordSize(editingTextValue.split('\n').reduce((a,b)=>a.length>=b.length?a:b).length);
            setPaths(prev => prev.map(p => p.id === editingTextId ? { ...p, text: editingTextValue } : p) );           
        }
        else return;        
    },[editingTextId, editingTextValue, longestWordSize]);

    const  applyTextEdit = () => {
        if (!editingTextId) return ;
        setPaths(prev => prev.map(p => p.id === editingTextId ? { ...p, text: editingTextValue } : p) ); 
        setTool(TOOL_POINTER);
        setEditingTextId(null);
        setEditingTextValue('');
    }
    
    const backendAPI=process.env.SOCKET_API;
    useEffect(()=>{
        const newSocket=io(backendAPI,{transport:["websocket"],secure:true});
        setSocket(newSocket);
        newSocket.on('collab',(msg)=>{
            const data=JSON.parse(msg);
            if(data.payload){setReceivedPaths(data.payload);setConnection(true);}
            if(data.error){alert(data.error);setConnection(false);}
        });
        return ()=>newSocket.disconnect();
    },[backendAPI]);


    const registerUser=()=>{
        if(userId===targetId) {alert("User ID & Target ID cannot be same.");return ;}
        socket.emit('register',JSON.stringify({type:'register',userId}));
        setConnection(true);
        setCollab(false);
    };

    const sendData=()=>{
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
            <button name={TOOL_POINTER} onClick={() => setTool(TOOL_POINTER)} style={{color:darkMode?'#fffffd':'black'}}><MousePointer2 size={18}></MousePointer2></button>
            <button name={TOOL_ERASER} onClick={() => setTool(TOOL_ERASER)} style={{color:darkMode?'#fffffd':'black'}}><Eraser size={18}></Eraser></button>
            <button name={TOOL_PEN} onClick={() => setTool(TOOL_PEN)} style={{color:darkMode?'#fffffd':'black'}}><LineSquiggle size={18}></LineSquiggle></button>
            <button name={TOOL_LINE} onClick={() => setTool(TOOL_LINE)} style={{color:darkMode?'#fffffd':'black'}}><PencilLineIcon size={18}></PencilLineIcon></button>
            <button name={TOOL_RECT} onClick={() => setTool(TOOL_RECT)} style={{color:darkMode?'#fffffd':'black'}}><SquareIcon size={18}></SquareIcon></button>
            <button name={TOOL_CIRCLE} onClick={() => setTool(TOOL_CIRCLE)} style={{color:darkMode?'#fffffd':'black'}}><Circle size={18}></Circle></button>
            <button name={TOOL_ARROW} onClick={() => setTool(TOOL_ARROW)} style={{color:darkMode?'#fffffd':'black'}}><ArrowUpLeft size={18}></ArrowUpLeft></button>
            <button name={TOOL_TEXT} onClick={() => setTool(TOOL_TEXT)} style={{color:darkMode?'#fffffd':'black'}}><Baseline size={18}></Baseline></button>
            <button name={TOOL_SPLINEARROW} onClick={() => setTool(TOOL_SPLINEARROW)} style={{color:darkMode?'#fffffd':'black'}}><Undo size={18}/></button>
            <button name={TOOL_LINK} onClick={() => setTool(TOOL_LINK)} style={{color:darkMode?'#fffffd':'black'}}><GitCompareArrows size={18}/></button>
            <button name={TOOL_SELECT} onClick={() => setTool(TOOL_SELECT)} style={{color:darkMode?'#fffffd':'black'}}><LucideSquareDashedMousePointer size={18}></LucideSquareDashedMousePointer></button>
            <button name={TOOL_PAN} onClick={() => setTool(TOOL_PAN)} style={{color:darkMode?'#fffffd':'black'}}><Move size={18}></Move></button>
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
                    opacity:'0.5',
                    position:'absolute',
                    color:'white',
                    caretColor:'black',
                    left:textPosition.x+offset.x,
                    top:textPosition.y+offset.y,
                    resize:'none',
                    overflow:'hidden',                    
                    width:`${longestWordSize}ch`,
                    fontSize:'27.5px',
                    padding:'4px',
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
            width={window.innerWidth*2}
            height={window.innerHeight*2}
            style={{background:darkMode?'#030303':'#fffffd', touchAction: "none",cursor:tool==="select" || tool==="pan"?"grab":tool==="pointer" ? "default":"crosshair",display:"block" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            // onTouchStart={handlePointerDown}
            // onTouchMove={handlePointerMove}
            // onTouchEnd={handlePointerUp}
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
