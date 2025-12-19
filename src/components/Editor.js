import "./Editor.css";
import React, { useState, useEffect, useRef } from 'react';
import { Remarkable } from 'remarkable';
import {openDB} from 'idb';
import { Trash,Plus,Save,Trash2,FolderOpen,Eye,EyeClosed,Moon,Sun } from "lucide-react";

const md = new Remarkable({breaks:true});

const DB_NAME="notesDB";
const STORE_NAME="files";

export function initDB() {
    const db=openDB(DB_NAME,1,{
        upgrade(db){
            if(!db.objectStoreNames.contains(STORE_NAME) && !db.objectStoreNames.contains('canvas') ) {
                db.createObjectStore(STORE_NAME,{keyPath:'filename'});
                db.createObjectStore('canvas',{keyPath:'filename'});
                console.log("Store Created");
            }
        },
    });
    return db;
}


export const loadMarkdown=async (name)=>{
    const db=await initDB();
    const index=db.transaction("files").store.index("name");
    return index.get(name);
};

export const getAllMarkdown=async ()=>{
    const db=await initDB();
    return db.getAll("files");
};

export function Editor() {
    
    const [markdown,setMarkdown]=useState("");
    const [preview,setPreview]=useState("");
    const [showModal,setShowModal]=useState(false);
    const [showSaveModal,setSaveModal]=useState(false);
    
    const [filename,setFilename]=useState("untitled.md");
    const [fileList,setFileList]=useState([]);
    const [fullScreen,setFullScreen]=useState(false);
    const [darkMode,setDarkMode]=useState(true);
    const [fontSize,setFontSize]=useState(50);
    const textareaRef=useRef(null);
    const dbRef=useRef(null);
    
    async function loadFileList() {
        const tx=dbRef.current.transaction(STORE_NAME,"readonly");
        const store=tx.objectStore(STORE_NAME);
        const keys=await store.getAllKeys();
        setFileList(keys);
    }
    
    useEffect(()=>{
        (async ()=>{
            dbRef.current=await initDB();
            await loadFileList();
        })();
    },[]);
    
    useEffect(()=>{
        setPreview(md.render(markdown));
    },[markdown]);
    useEffect(()=>{
        console.log(fullScreen);
    })
    
    async function handleNewFile(name){
        if (markdown!=="") {
            setMarkdown("");
            setFilename("untitled.md");
        }
        
//        const tx=dbRef.current.transaction(STORE_NAME,"readonly");
  //      const store =tx.objectStore(STORE_NAME);
    //    const file=await store.get(name);
      //  console.log(file);   
    };
    
    async function openFile(name) {
        const tx=dbRef.current.transaction(STORE_NAME,"readonly");
        const store =tx.objectStore(STORE_NAME);
        const file=await store.get(name);
        if(file) {
            setFilename(file.filename);
            setMarkdown(file.content);
            setShowModal(false);
            if (textareaRef.current) {
                textareaRef.current.focus();
            }
        }
    };
    
    async function saveFile(name,content) {
        if (!filename || filename==="untitled.md"){
            alert("Please enter a filename before saving");
            return;
        }
        const tx=dbRef.current.transaction(STORE_NAME,"readwrite");
        const store=tx.objectStore(STORE_NAME);
        const updatedAt=Date.now();
        await store.put({filename:name,content,updatedAt:updatedAt});
        await tx.done;
        await loadFileList();
        alert(`File ${filename} Saved`);
        setSaveModal(false);
    }
    
    async function deleteFile(name){
        const tx=dbRef.current.transaction(STORE_NAME,"readwrite");
        const store=tx.objectStore(STORE_NAME);
        await store.delete(name);
        await tx.done;
        await loadFileList();
        if (name===filename){
            setFilename('untitled.md');
            handleNewFile();
        }
    };
    
    return (
        <div className="main">
            <div className="dynamicbar">
                <div className="menu-bar">
                    <div className="file">
                        <p className="file-name">{filename}</p>
                    </div>
                    <div className="menu-buttons">
                        <button onClick={()=>handleNewFile(filename)}><Plus size={18}/></button>
                        <button onClick={()=>setShowModal(true)}><FolderOpen size={18}/></button>
                        <button onClick={()=>setSaveModal(true)}><Save size={18}/></button>
                        <button onClick={()=>{setShowModal(true)}}><Trash2 size={18}/></button>
                    </div>
                </div>
            </div>
                
            <div className="workspace"
                 style={{
                     background:darkMode?'#222':'white',
                     color:darkMode?'white':'black'
                 }}>
                <textarea
                    ref={textareaRef}
                    className="editor"
                    default=" "
                    placeholder="Write Markdown notes here..."
                    value={markdown}
                    onChange={(e)=>setMarkdown(e.target.value)}
                    style={{
                        background:darkMode?'#030303':'#fffffd',
                        color:darkMode?'#fffffd':'#030303',
                        fontSize:`${fontSize}px`
                    }}
                ></textarea>

                <div
                    className="preview"
                    style={{
                        display:fullScreen?'block':'none',
                        position:fullScreen?'fixed':'relative',
                        height:fullScreen?'98vh':'fit-content',
                        width:fullScreen?'96vw':'96vw',
                        background:darkMode?'#030303':'#fffffd',
                        color:darkMode?'#fffffd':'#030303'
                    }}
                    dangerouslySetInnerHTML={{__html:preview}}>
                </div>
            </div>
            <div className="fontsize">
                <input type='range' min={20} max={60} step={1} value={fontSize} onChange={(e)=>setFontSize(e.target.value)}></input>
            </div>
                <div className="theme">
                    {darkMode===true &&
                     <button
                         name="Darkmode"
                         style={{background:'#030303',color:'#fffffd'}}
                         onClick={()=>{setDarkMode(false)}}
                     >
                         <Moon size={18}/>
                     </button>}
                    {darkMode===false &&
                     <button
                         name='Lightmode'
                         style={{background:'transparent',color:'#030303'}}
                         onClick={()=>setDarkMode(true)}
                     >
                         <Sun size={18}/>
                     </button>}

                    <div className="mode">
                        {fullScreen===true &&
                         <button
                             name="FullScreen "
                             style={{
                                 background:darkMode?'#030303':'transparent',
                                 color:darkMode?'#fffffd':'#030303'
                             }}
                             onClick={()=>{setFullScreen(false)}}
                         >
                             <EyeClosed size={18}/>
                         </button>}
                        {fullScreen===false &&
                         <button
                             name='Normal'
                             style={{
                                 background:darkMode?'#030303':'transparent',
                                 color:darkMode?'#fffffd':'#030303'
                             }}
                             onClick={()=>setFullScreen(true)}
                         >
                             <Eye size={18}/>
                         </button>}
                    </div>
                </div>
                

            
            { showModal && (
                <div className="modal">
                    <div className="modal-container">
                        <h2>Select a File</h2>
                        <ul>
                            {fileList.map((file)=>(
                                <li key={file}>
                                    <span onClick={()=>openFile(file)} style={{cursor:'pointer',flexGrow:1}}>{file}</span>
                                    <button onClick={()=>{deleteFile(file)}} className="delete-button"><Trash size={14}></Trash></button>
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
                        <input type="text" value={filename} onChange={(e)=>setFilename(e.target.value)}></input>
                        <div className="buttons">
                            <button onClick={()=>saveFile(filename,markdown)} >Save</button>
                            <button onClick={()=>setSaveModal(false)} >Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
