import {useRef,useEffect,useState} from 'react';
import "./Home.css";
export function Home(){
    const [mdfiles,setMdFiles]=useState([]);
    const [canvasFiles,setCanvasFiles]=useState([]);
    const dbRef=useRef(null);
    // const [fileList,setFileList]=useState([]);
    // const STORE_NAME='files';
    // useEffect(()=>{
    //     (async ()=>{
    //         dbRef.current=await initDB();
    //         await loadFileList();
    //     })();
    // },[]);
    
    // async function loadFileList() {
    //     const tx=dbRef.current.transaction(STORE_NAME,"readonly");
    //     const store=tx.objectStore(STORE_NAME);
    //     const keys=await store.getAllKeys();
    //     setFileList(keys);
    // };
    
    return (
        <div className='home-container '>
            <div className='grad'></div>
            <div className="home-text">
                <h1 className='heading'>NoteDown!</h1>
                <div className='intro'>
                    <h1>Welcome to NoteDown!</h1>
                    <div>
                        The fresh, fast, and fun way to capture everything that matters.
                    </div>
                    <br></br>
                    {/* <br></br> */} 
                    <div>
                        Ideas strike when you least expect them — and now you’ve got the perfect place to keep them! <br></br>
                        Whether it’s quick thoughts, to-dos, class notes, or your next big plan, NoteDown is here to help you stay on top of it all.<br></br>
                        ✨ Why You’ll Love It:<br></br>
                        📝 Super simple note-taking.<br></br>
                        🧠 Smart organization with IndexedDB.<br></br>
                    </div>
                    🚀 We’re just getting started — and we’d love to have you along for the ride.
                    👉 Try it now!
                </div>
            </div>
        </div>
    );
};
