const express=require('express');
const http=require('http');
const WebSocket=require('ws');

const app=express();
const server=http.createServer(app);

const wss=new WebSocket.Server({server});

const users=new Map();

wss.on('connection',(ws,req)=>{
    console.log('New Connection');

    ws.on('message',(data)=>{
        try{
            const msg=JSON.parse(data);
            const {type,userId,targetId,payload}=msg;

            if(type==='register'){
               
                users.set(userId,ws);
                ws.userId=userId;
                console.log(`User Registered : ${userId}`);
            }
            if(type==='send' && targetId && payload){
                const targetSocket=users.get(targetId);
                if(targetSocket && targetSocket.readyState===WebSocket.OPEN){
                    targetSocket.send(JSON.stringify({
                        from:userId,
                        payload,
                    }));
                }else{
                    ws.send(JSON.stringify({error:"User Not Found | Invalid Targed ID "}));
                }
            }
        } catch(err){
            console.log('Error:',err);
        }
    });
    ws.on('close',()=>{
        if(ws.userId){
            users.delete(ws.userId);
            console.log(`User Disconnected: ${ws.userId}`);
        }
    });
})

app.get('/',(req,res)=>{
    res.send('Websocket Server Running');
});
const PORT=8080;
server.listen(PORT,"0.0.0.0",()=>console.log(`Server Started at: ${PORT}`));
