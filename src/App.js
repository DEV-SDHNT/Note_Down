

import './App.css';
import { useState, } from 'react';
import { Editor, } from './components/Editor';
import { Canvas, } from './components/Canvas';
import { Home} from './components/Home';
import { HomeIcon, LetterTextIcon, PenBox,  } from 'lucide-react';

const App=()=> {
    const [page,setPage]=useState('home');
    return (
        <>
            {
                <div className='nav-bar'>
                    <button onClick={()=>setPage('home')}><HomeIcon size={28}></HomeIcon></button>
                    <button onClick={()=>setPage('Editor')}><LetterTextIcon size={28}></LetterTextIcon></button>        
                    <button onClick={()=>setPage('Canvas')}><PenBox size={28}></PenBox></button>
                    
                </div> 
            }
            <div className="app">
                {page==='home' && <Home></Home>}
                {page==='Editor' && <Editor></Editor>}
                {page==='Canvas' && <Canvas></Canvas>}
            </div>
        </>
    );
}
export default App;



