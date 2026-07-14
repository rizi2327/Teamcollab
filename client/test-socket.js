const {io} = require('socket.io-client');

const TOKEN = 'JWT TOKEN'

const socket = io('htt',{
    auth:{token:TOKEN},
    transports:['websocket']
});

socket.on('connect',()=>{
    console.log('connected',socket.id);
    socket.emit('join-workspace','WorkspaceId');

    socket.io('workspace-online-users',(data)=>{
        console.log('Online Users in Workspace',data.onlineUser)
    });
    socket.on('user-joined-workspace',(data)=>{
        console.log('User joined',data.name)
    });
    socket.on('connect-error', (err)=>{
        console.error('connection error', err.message)
    });
    socket.on('disconnect',(reason)=>{
        console.log('Disconnected', reason)
    })
})