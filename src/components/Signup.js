import './Signup.css';
import { useEffect, useState } from 'react';
import axios from 'axios';

export function Signup(){
    const [username,setUsername]=useState('');
    const [password,setPassword]=useState('');
    const [confirmPassword,setConfirmPassword]=useState('');
    const [message,setMessage]=useState('');
    const [formData,setFormData]=useState({'username':username,'password':password});
    useEffect(()=>{
        if(password===''|| username===''){
            setMessage("Enter the details");
        }
        else{
        if(password!==confirmPassword){
            setMessage('Passwords Do Not Match');
        }
        else{
            setMessage('Passwords Matched');
        }
    }
        
    })
    const handleSignup=async (e)=>{
        e.preventDefault();
        if (password!==confirmPassword){ 
            setMessage('Password Do Not Match');
            return;
        }
        try{
            
            const res=await axios.post('http://localhost:5000/signup',{'username':username,'password':password});
            console.log(res.data.message);
            setMessage(res.data.message);
        }
        catch(error){
            setMessage('Server Error');
        }

    };

    return (
        <>
        <div className='container'>
            <h1>Sign-up</h1>
            <form name='sign-up'>
                <p>Name</p>
                <input type='text' onChange={(e)=>setUsername(e.target.value)} value={username} required></input><br></br>
                <p>Password</p>
                <input type='password' onChange={(e)=>setPassword(e.target.value)} value={password} required></input><br></br>
                <p>Confirm Password </p>
                <input type='password' onChange={(e)=>{setConfirmPassword(e.target.value)}} value={confirmPassword} required></input><br></br>
                <p>{message}</p>        
                <button onClick={handleSignup}>Signup</button>
                
            </form>
        </div>
       </>
    )
}
