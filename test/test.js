const fs = require('fs');
const child_process = require('child_process');
var workerProcess = child_process.exec('E:/python3.7/python C:/Users/Administrator/Desktop/BTC-ISMIR19-master/BTC-ISMIR19-master/test.py', function (error, stdout, stderr) {
    if (error) {
        console.log(error.stack);
        console.log('Error code: '+error.code);
        console.log('Signal received: '+error.signal);
    }
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
});

workerProcess.on('exit', function (code) {
    console.log('子进程已退出，退出码 '+code);
});