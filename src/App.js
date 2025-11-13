import './App.css';
import { useState,useEffect } from 'react';
import { Editor, } from './components/Editor';
import { Canvas, } from './components/Canvas';
import { Home } from './components/Home';
//import { Graph } from './components/Graph';
//import { Tester } from './components/Tester';
import { HomeIcon , FileText, Brush} from 'lucide-react';

const App=()=> {
    const [page,setPage]=useState('Home');
    useEffect(()=>{
        const handleWheel=(e)=>{
            if(e.ctrlKey) e.preventDefault();
        };
        const handleKeyDown=(e)=>{
            if(e.ctrlKey && (e.key==="+" || e.key==="-" || e.key==="_" || e.key==="=")){
                e.preventDefault();
                console.log("zooming")
            }
        };
        window.addEventListener('wheel',handleWheel,{passive:false});
        window.addEventListener('keydown',handleKeyDown);
        return ()=>{window.removeEventListener('wheel',handleWheel);
                    window.removeEventListener('keydown',handleKeyDown);};
    },[]);
    return (
        <div>
            {<div>
                <span className='dynamic-navbar'>
                <div className='nav-bar'>
                    <button onClick={()=>setPage('Home')}><HomeIcon size={25}/></button>
                    <button onClick={()=>setPage('Editor')}><FileText size={25}/></button>        
                    <button onClick={()=>setPage('Canvas')}><Brush size={25}/></button>
                </div>
                </span>
             </div>
            }
            <div className="app">
                {page==='Home' && <Home></Home>}
                {page==='Editor' && <Editor></Editor>}
                {page==='Canvas' && <Canvas></Canvas>}


            </div>
        </div>
    );
}
export default App;
