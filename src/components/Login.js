import './Login.css';
import { useEffect, useState } from 'react';
import axios from 'axios';

export function Login(){
    const [username,setUsername]=useState('');
    const [password,setPassword]=useState('');
    const [message,setMessage]=useState('');
    useEffect(()=>{
        if(password===''|| username===''){
            setMessage("Enter the details");
        }
        else{
            setMessage('');
        }
    });
    const handleLogin=async (e)=>{
        e.preventDefault();
        try{
            const res=await axios.post('http://localhost:5000/login',{'username':username,'password':password});
            console.log(res.data.message);
            setMessage(res.data.message);
        }
        catch(error){
            console.log(error)
            setMessage('Server Error');
        }
    };

    return (
        <>
        <div className='container'>
            <h1>Login</h1>
            <form name='login'>
                <p>Name</p>
                <input type='text' onChange={(e)=>setUsername(e.target.value)} value={username} required></input><br></br>
                <p>Password</p>
                <input type='password' onChange={(e)=>setPassword(e.target.value)} value={password} required></input><br></br>
                <p>{message}</p>        
                <button onClick={handleLogin}>Login</button>
                
            </form>
        </div>
       </>
    )
}
