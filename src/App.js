import './App.css';
import { useState, } from 'react';
import { Editor, } from './components/Editor';
import { Canvas, } from './components/Canvas';
import { Home } from './components/Home';
import { Tester } from './components/Tester';
import { HomeIcon, AlignLeft, Brush,  } from 'lucide-react';

const App=()=> {
    const [page,setPage]=useState('Editor');    
    return (
        <>
            {<>
                <span className='dynamic-navbar'>
                <div className='nav-bar'>
                    <button onClick={()=>setPage('Home')}><HomeIcon size={28}></HomeIcon></button>
                    <button onClick={()=>setPage('Editor')}><AlignLeft size={28}></AlignLeft></button>        
                    <button onClick={()=>setPage('Canvas')}><Brush size={28}></Brush></button>                    
                </div>
                </span>
             </>
            }
            <div className="app">
                {page==='Home' && <Home></Home>}
                {page==='Editor' && <Editor></Editor>}
                {page==='Canvas' && <Canvas></Canvas>}
                {page==='Test' && <Tester></Tester>}
            </div>
        </>
    );
}
export default App;
