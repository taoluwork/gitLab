//var app = require('express')();
//var http = require('http').createServer(app);
//var io = require('socket.io')(http);
const io = require('socket.io-client'); 
//var fs = require('fs');
//var {exec} = require('child_process')


var letter = "A";
var data  = undefined;
var result= undefined;
var mode  = undefined;
var storedData = undefined;
var released = undefined;




var socket =   io('http://localhost:3001');

socket.on('connection', ()=> {console.log("connected")})


if(letter === "A"){       
    socket.emit("request", letter);
    socket.on('transmitting' + letter, (tag , dat)=>{
        console.log("Got:transmitting and tag:" + tag + " and data was received.")
        if(dat !== undefined){                     
            socket.emit('recieved', letter); 
            console.log("emit:recieved msg:" + letter);
            if(tag =="data"){
                data = dat;
            }
            if(tag =="result"){
                result = dat;
            }
        }
        else{ 
            socket.emit('request', letter);
            console.log('emit:request msg:' + letter); 
        }
    });
    socket.on('fin' + letter , (msg) => {
        console.log("Got:fin and msg:" + msg);
        if((msg === "data" && data === undefined) || (msg === "result" && result === undefined)){ 
            socket.emit('request', letter); 
            console.log('emit:request msg:' + letter);
        }
        else{
            console.log("Finished and the socket will close now")
            socket.close();
        }
    });
}
else{
    socket.on('whoAmI', (msg) =>{
        console.log("whoAmI just fired")
    });
    socket.on('request', (msg) =>{
        console.log("Got:request and msg:" + msg);
        var tag = "data";
        if(mode === "WORKER"){
            tag = "result";
        }
        if(storedData !== undefined){
            socket.emit('transmitting' + msg, tag, storedData); 
            console.log("emit:transmitting to:" + msg + " with tag:" + tag + " storedData:" + storedData);
        }
        else{
            console.log("NO FILE FOUND!!", "Please put the results within the field.", "warning");
        }
        socket.emit('fin' + msg, tag);
        console.log("emit:fin to:" + msg + "with tag:" + tag);
    });
    socket.on('recieved', (msg) => {
        console.log("message was recieved");            
        released = true;
    });
}                  

  
//http.listen(3001 , '130.39.223.54' ,  function(){
//    console.log('listening on *:3001');
//});
  
