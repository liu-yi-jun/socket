const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const port = process.env.PORT || 8000;

let users = {}
let leave = {}

io.on('connection', socket => {

    // client 即是连接上来的一个客户端
    console.log(socket.id) // id 是区分客户端的唯一标识
    //创建用户链接
    socket.on('login', (user) => {
        user.roomId = socket.id;
        socket.user = user;
        console.log("登录成功！", user)
        users[user.userId] = user

    });
    socket.on('getmessage', () => {
        // 用户一上线，离线信息中有，则循环发送信息
        console.log('leave[socket.user.userId]',leave[socket.user.userId])
        if (leave[socket.user.userId]) {
            leave[socket.user.userId].forEach(element => {
                console.log(111111111111111111111111111,socket.user.roomId)
                socket.broadcast.to(socket.user.roomId).emit('message', element.from, element.to, element.message);
            });
            leave[socket.user.userId] = null
        }
    })
    //发送私信
    socket.on('message', (from, to, message) => {
        console.log(users)
        console.log('------------------------------------')
        console.log(from, to, message)
        console.log(users[to.userId])
        if (users[to.userId]) {
            let user = users[to.userId]
            socket.broadcast.to(user.roomId).emit('message', from, to, message);
        } else {
            if (!leave[to.userId]) {
                leave[to.userId] = []
            }
            leave[to.userId].push({
                from,
                to,
                message
            })
            console.log('leave', leave)
            console.log('离线了')
        }
    });
    socket.on('disconnect', () => {
        users[socket.user.userId] = null
        console.log('disconnect')
    }) // 客户端断开连接时调用(可能是关掉页面，网络不通了等)
})

server.listen(8000, () => {
    console.log('Server listening at port %d', port);
})


// 情况一、必须<script src="/socket.io/socket.io.js"></script>，且index必须是服务器返回的

// 情况二、小程序需要Socket.IO v2.3.0 不能是Socket.IO v3.0.1，这里估计需要与小程序引入的版本一致