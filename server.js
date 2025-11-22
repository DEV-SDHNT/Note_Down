const express=require('express');
const http=require('http');
const WebSocket=require('ws');
const socketIo=require('socket.io');
const cors=require('cors');

const app=express();
//const frontendAPI="https://dev-sdhnt.github.io/Note_Down/";
const frontendAPI="https://notedown-qjw0.onrender.com";
//const frontendAPI="http://localhost:3021"; 
app.use(cors({origin:frontendAPI}));
const server=http.createServer(app);
//const wss=new WebSocket.Server({server});
const wss=socketIo(server,{
    cors:{
        origin:frontendAPI,
        methods:['GET','POST']
        
    },
});
const users=new Map();

wss.on('connection',(ws)=>{
    console.log('New Connection');

    ws.on('register',(data)=>{
        const reg=JSON.parse(data);
        const {type,userId}=reg;
        users.set(userId,ws);
        ws.userId=userId;
        ws.join(userId);
        console.log(`User Registered : ${userId}`);
    });
    
    ws.on('message',(data)=>{
        try{
            const msg=JSON.parse(data);
            const {type,userId,targetId,payload}=msg;
          
            if(targetId && payload){
                wss.to(targetId).emit('collab',JSON.stringify({
                    from:ws.userId,
                    payload,
                }));
                console.log('From: ',ws.userId,'| To: ',targetId);
                //const targetSocket=users.get(targetId);
                // if(targetSocket){
                //     console.log('|-->Payload send to ',targetId);
                //     targetSocket.emit('message',JSON.stringify({
                //         from:userId,
                //         payload,
                //     }));
                // }else{
                //     ws.on('message',JSON.stringify({error:"User Not Found | Invalid Targed ID "}));
                // }
            }
        } catch(err){
            console.log('Error:',err);
        }
    });
    ws.on('disconnect',()=>{
        if(ws.userId){
            users.delete(ws.userId);
            console.log(`User Disconnected: ${ws.userId}`);
        }
    });
})

app.get('/',(req,res)=>{
    res.send('Websocket Server Running');
});
const PORT=5000;
server.listen(PORT,"0.0.0.0",()=>console.log(`Server Started at: ${PORT}`));
