//this is a server application used to talk to the browser application
//version v1.0.0



//this file creates a socket using socket.io then listens for events from the webapp
//when the events are triggered it will unzip the file and the rest done by localenv.js
//this file can be combined with localenv.js in the future






var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var fs = require('fs');
var {exec} = require('child_process')

if(process.argv[2] === undefined){
  console.log("Invalid format, must include a valid IP address")
  return;
}

io.on('connection', function(socket){
  socket.emit("whoAmI", process.argv[2]); // this assumes that the person can put a valid ip (this can be checked by some how parsing ifconfig bash command for this input)
  socket.on('data', function(msg){
    console.log(msg);
    console.log("Data recieved sending to be ran...");
    fs.writeFile("data.zip",msg, (err) => {
      if(err){
        console.log(err);
      }
      exec('unzip data.zip' , (err,stdout,stderr)=>{
        if(err){
          console.log(err);
          return;
        }
        console.log(stdout);
      });
    });
  });

  socket.on('result', function(msg){
    console.log("Your Results are in!!!!");

    console.log(msg)
    fs.writeFile("result.zip", msg[0].content, (err) => {
      if(err){
        console.log(err);
      }
      exec('unzip result.zip' , (err,stdout,stderr)=>{
        if(err){
          console.log(err);
          return;
        } 
        console.log(stdout);
      });

    });
  });


});

http.listen(3001 , function(){
  console.log('listening on *:3001');
});
