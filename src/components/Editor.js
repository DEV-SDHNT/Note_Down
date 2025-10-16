import "./Editor.css";
import React, { useState, useEffect, useRef } from 'react';
import { Remarkable } from 'remarkable';
import {openDB} from 'idb';
import { Trash,Plus,Save,Trash2,FolderOpen,Maximize2,Minimize2 } from "lucide-react";

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
        await store.put({filename:name,content});
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
                        <button onClick={()=>handleNewFile(filename)}><Plus size={21}/></button>
                        <button onClick={()=>setShowModal(true)}><FolderOpen size={21}/></button>
                        <button onClick={()=>setSaveModal(true)}><Save size={21}/></button>
                        <button onClick={()=>{setShowModal(true)}}><Trash2 size={21}/></button>
                    </div>
                </div>
            </div>
                
            <div className="workspace">
                <textarea
                    ref={textareaRef}
                    className="editor"
                    default=" "
                    placeholder="Write notes here..."
                    value={markdown}
                    onChange={(e)=>setMarkdown(e.target.value)}
                ></textarea>

                <div
                    className="preview"
                    style={{
                        position:fullScreen?'fixed':'relative',
                        height:fullScreen?'98vh':'fit-content',
                        width:fullScreen?'96vw':'96vw'
                        
                    }}
                    dangerouslySetInnerHTML={{__html:preview}}>
                </div>
                <div className="mode">
                    {fullScreen===true &&
                     <button
                         name="FullScreen "
                         onClick={()=>{setFullScreen(false)}}
                     >
                        <Minimize2/>
                    </button>}
                    {fullScreen===false &&
                     <button
                         name='Normal'
                         onClick={()=>setFullScreen(true)}
                     >
                        <Maximize2/>
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
