const { rejects } = require('assert');
const express = require('express');
var redis = require('redis')
var fs = require('fs')
var https = require('https');
var path = require('path');
var client = redis.createClient(6379, '127.0.0.1')
client.on('error', function (err) {
  console.log('Error ' + err);
});

var options = {
  key: fs.readFileSync(path.join(__dirname, './security/5290807_shengruo.top.key')),
  cert: fs.readFileSync(path.join(__dirname, './security/5290807_shengruo.top.pem')),
}


const { resolve, join } = require('path');
const app = express()
const server = require('http').createServer(app)
// const server = https.createServer(options, app)
const io = require('socket.io')(server)
const port = process.env.PORT || 8000;

var ref = require("ref");
var ffi = require("ffi");
var ArrayType = require('ref-array');
const { log } = require('console');

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

function time () {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, 200)
  })

}


io.on('connection', socket => {
  function getOffMsg (msgName) {
    // 循环出来一个数组
    client.lrange(`${msgName}${socket.user.userId}`, 0, -1, function (err, items) {
      if (err) throw err;
      console.log(msgName, items);
      // items:是一个数组，里面是json数据 
      io.to(socket.user.roomId).emit('receiveMessage', msgName, { data: items });
      client.del(`${msgName}${socket.user.userId}`)
    });
  }
  function storageOffMsg (msgName, userId, data) {
    client.rpush(`${msgName}${userId}`, JSON.stringify(data), redis.print);
  }

  function updateOffMsg (msgName, userId, msgId) {
    client.lrange(`${msgName}${userId}`, 0, -1, function (err, items) {
      if (err) throw err;
      console.log(msgName, items);
      // items:是一个数组，里面是json数据 
      let flag = false
      items.forEach((item, index) => {
        item = JSON.parse(item)
        if (item.message.id === msgId) {
          // 删除
          items.splice(index, 1)
          flag = true
          return
        }
      })
      if (flag) {
        client.del(`${msgName}${userId}`)
        items.forEach(item => {
          client.rpush(`${msgName}${userId}`, item, redis.print);
        })
      }
    });
  }

  function sendMsg (msgName, roomId, item) {
    // io.to(socket.user.roomId).emit('receiveMessage', msgName, { data: [JSON.stringify(item)] });
    socket.broadcast.to(roomId).emit('receiveMessage', msgName, { data: [JSON.stringify(item)] });
  }


  // client 即是连接上来的一个客户端
  console.log(socket.id) // id 是区分客户端的唯一标识
  //创建用户链接
  socket.on('login', (user) => {
    user.roomId = socket.id;
    socket.user = user;
    console.log("登录成功！", user)
    users[user.userId] = user

    // 获取消息
    getOffMsg('pageRefresh')
    getOffMsg('systemMsg')

  });
  socket.on('sendPageRefresh', (from, to, control) => {
    if (users[to.userId]) {
      let user = users[to.userId]
      sendMsg('pageRefresh', user.roomId, { from, to, control })
    } else {
      storageOffMsg('pageRefresh', to.userId, { from, to, control })
    }
  })
  socket.on('sendSystemMsg', (from, to, message) => {
    console.log(to.userIdList);
    to.userIdList.forEach((item, index) => {
      if (users[item.userId]) {
        let user = users[item.userId]
        console.log(user);
        sendMsg('systemMsg', user.roomId, { from, to, message })
      } else {
        storageOffMsg('systemMsg', item.userId, { from, to, message })
      }
    })
  });

  socket.on('updateSystemMsg', (from, to, message) => {
    to.userIdList.forEach((item, index) => {
      if (users[item.userId]) {
        // 在线，发送给终端和redis都需修改
        updateOffMsg('systemMsg', item.userId, message.msgId)
        let user = users[item.userId]
        sendMsg('updateSystemMsg', user.roomId, { from, to, message })
      } else {
        // redis修改
        updateOffMsg('systemMsg', item.userId, message.msgId)
      }
    })
  });

  // socket.on('getmessage', () => {
  //     // 用户一上线，离线信息中有，则循环发送信息
  //     console.log('leave[socket.user.userId]', leave[socket.user.userId])
  //     if (leave[socket.user.userId]) {
  //         let p = Promise.resolve()
  //         leave[socket.user.userId].forEach(async element => {
  //             // 防止客户端无法push异常
  //             p = p.then(() => time()).then(() => {
  //                 io.to(socket.user.roomId).emit('message', element.from, element.to, element.message);
  //                 console.log("发送")
  //                 return
  //             }).catch(err => reject(err))
  //         });
  //         leave[socket.user.userId] = null
  //     }
  // })

  // //发送私信
  // socket.on('message', (from, to, message) => {
  //     console.log(users)
  //     console.log('------------------------------------')
  //     console.log(from, to, message)
  //     console.log(users[to.userId])
  //     if (users[to.userId]) {
  //         let user = users[to.userId]
  //         socket.broadcast.to(user.roomId).emit('message', from, to, message);
  //     } else {
  //         if (!leave[to.userId]) {
  //             leave[to.userId] = []
  //         }
  //         leave[to.userId].push({
  //             from,
  //             to,
  //             message
  //         })
  //         console.log('leave', leave)
  //         console.log('离线了')
  //     }
  // });
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
    io.to(socket.id).emit('completeAnalysis', result);
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
    io.to(socket.id).emit('completeAnalysis2', result);
  })
  socket.on('disconnect', () => {
    if (socket.user) {
      users[socket.user.userId] = null
      console.log('disconnect')
    }
  }) // 客户端断开连接时调用(可能是关掉页面，网络不通了等)
})

server.listen(port, () => {
  console.log('Server listening at port %d', port);
})


// 情况一、必须<script src="/socket.io/socket.io.js"></script>，且index必须是服务器返回的

// 情况二、小程序需要Socket.IO v2.3.0 不能是Socket.IO v3.0.1，这里估计需要与小程序引入的版本一致