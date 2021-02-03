const { rejects } = require('assert');
const express = require('express');
const { resolve } = require('path');
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const port = process.env.PORT || 8000;


var ref = require("ref");
var ffi = require("ffi");
var ArrayType = require('ref-array')

var double = ref.types.double
var DoubleArray = ArrayType(double)

var detail = new DoubleArray([0, 0, 0])
var tone = ['C', '#C', 'D', '#D', 'E', 'F', '#F', 'G', '#G', 'A', '#A', 'B'];

// var MyLibrary = ffi.Library('./Dll/return_fin_result1221.dll', {
//     "return_result": ['double', [DoubleArray, 'int', 'double']],
//     "return_detail": [DoubleArray, ['double', DoubleArray]]
// });

// let PUBLIC_PATH = resolve(__dirname, './Dll/return_result_lib.so');
// var MyLibrary = ffi.Library(PUBLIC_PATH, {
//     "return_result": ['double', [DoubleArray, 'int', 'double']],
//     "return_detail": [DoubleArray, ['double', DoubleArray]]
// });


// let PUBLIC_PATH2 = resolve(__dirname, './Dll/return_result_lib2.so');
// var MyLibrary2 = ffi.Library(PUBLIC_PATH2, {
//     "can_return_result_flag": ['int', [DoubleArray, 'int']],
//     "return_result": ['double', [DoubleArray, 'int', 'double']],
//     "can_return_detail_flag": ['int', ['double']],
//     "return_detail": [DoubleArray, ['double', DoubleArray]]
// });



let users = {}
let leave = {}

let messagePass = {
    'systemMsg': []
}

let leaveDate = {}

function time() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, 200)
    })

}

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
    socket.on('getLeaveDate', () => {
        if (leaveDate[socket.user.userId]) {
            for (key in messagePass) {
                let p = Promise.resolve()
                leaveDate[socket.user.userId][key].forEach(async element => {
                    p = p.then(() => time()).then(() => {
                        io.to(socket.user.roomId).emit(key, element.from, element.to, element.message);
                        return
                    }).catch(err => reject(err))
                });
                leaveDate[socket.user.userId][key] = []
            }
        }
    });
    socket.on('applyJoin', (from, to, message) => {
        if (users[to.userId]) {
            let user = users[to.userId]
            io.to(user.roomId).emit('systemMsg', from, to, message);
            // socket.broadcast.to(user.roomId).emit('systemMsg', from, to, message);
        } else {
            if (!leaveDate[to.userId]) {
                leaveDate[to.userId] = messagePass
            }
            leaveDate[to.userId]['systemMsg'].push({
                from,
                to,
                message
            })
            console.log('leaveDate', leaveDate)
            console.log('离线了')
        }
    });

    socket.on('getmessage', () => {
        // 用户一上线，离线信息中有，则循环发送信息
        console.log('leave[socket.user.userId]', leave[socket.user.userId])
        if (leave[socket.user.userId]) {
            let p = Promise.resolve()
            leave[socket.user.userId].forEach(async element => {
                // 防止客户端无法push异常
                p = p.then(() => time()).then(() => {
                    io.to(socket.user.roomId).emit('message', element.from, element.to, element.message);
                    console.log("发送")
                    return
                }).catch(err => reject(err))
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
    // 发送解析音频
    socket.on('analysis', (data) => {
        // var rtn = MyLibrary.return_result(data, data.length, 8000)
        var rtn = MyLibrary.return_result(data, 8000)
        MyLibrary.return_detail(rtn, detail)
        console.log(' Frequency: ', rtn, '\n', 'Pitch Names: ', tone[parseInt(detail[1]) - 1], '\n', 'Group: ', detail[0], '\n', 'Cent: ', detail[2])
        let result = {
            frequency: rtn,
            pitch: tone[parseInt(detail[1]) - 1],
            group: detail[0],
            cent: detail[2]
        }
        io.to(socket.user.roomId).emit('completeAnalysis', result);
    })
    // 音频解析接口2
    socket.on('analysis2', (data) => {
        // "can_return_result_flag": ['int', [DoubleArray, 'int']],
        // "return_result": ['double', [DoubleArray, 'int', 'double']],
        // "can_return_detail_flag": ['int', ['double']],
        // "return_detail":  ['int', ['double',DoubleArray]]
        console.log('data', data)
        let result_flag = MyLibrary2.can_return_result_flag(data, data.length)
        console.log('result_flag', result_flag)
        if (!result_flag) {
            return
        }
        var rtn = MyLibrary2.return_result(data, data.length, 8000)
        console.log('rtn', rtn)
        let detail_flag = MyLibrary2.can_return_detail_flag(rtn)
        console.log('detail_flag', detail_flag)
        if (!detail_flag) {
            return
        }
        MyLibrary2.return_detail(rtn, detail)
        console.log('detail', detail)
        console.log(' Frequency: ', rtn, '\n', 'Pitch Names: ', tone[parseInt(detail[1]) - 1], '\n', 'Group: ', detail[0], '\n', 'Cent: ', detail[2])
        let result = {
            frequency: rtn,
            pitch: tone[parseInt(detail[1]) - 1],
            group: detail[0],
            cent: detail[2]
        }
        io.to(socket.user.roomId).emit('completeAnalysis2', result);
    })
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