const util = require("util");
const {exec} = require('child_process');
const fs = require('fs');
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var buffer;
var version = '';
var name = '';
var mode; 
var ip;
var training = false;
var ver = false;
var flag = true; // this flag will be shared between the provider and the validator
var conns = [];
//structure of a conn
//ip        -> (string)  the ip address of the connection
//startTime -> (integer) the time when the connection has been started
//endTime   -> (integer) the time when the connection should time out /***/This will not be implemented yet/***/
//socket    -> (object)  the given socket (need a way to reconnect)
//status    -> (boolean) shows if the connections is live (true) or needs to be closed (false)

//structure of modes that will be used throughout the entire file
//0-provider
//1-validator
//2-user

//////////////////////////////////////////////////////////////////////input section////////////////////////////////////////////////////////////////////////////////
if(process.argv[2] === undefined){
    console.log("Invalid format, must include a valid IP address")
    return;
}
else{
    ip = process.argv[2];
}
//////////////////////////////////////////////////////////////////////server section/////////////////////////////////////////////////////////////////////////////
function closeSocket(pos){
  conns[pos].socket.disconnect(true);
  conns.splice(pos,1);
  console.log('connection has been closed, there are:' + conns.length + ' left');
  for(var i = 0 ; i < conns.length ; i++){
    console.log(conns[i].ip);
  }
}

  io.on('connection', function(socket){
    console.log(socket.handshake.address);
    //s[s.length] = socket;

    if(socket.handshake.address.search('127.0.0.1') >= 0) {
      console.log("Hello User")
      socket.emit("whoAmI", ip); 
      conns.push({
        ip        : ip,
        startTime : Date.now(),
        ///end time to be implemented in timeout update
        socket    : socket
        });
    }

    socket.on("setUp", function(msg){
      //this will check with the browser to make sure that this connection is the one that we want
      //might have to adjust the contract so that the dataID and resultID also have connectorIDs for both sections]
      //making this strucuture will allow for the the time out function to be implemented with a event listener for the time to fit specific sections (timeout update)
      console.log(msg);
      var exists = false;
      for(var i = 0 ; i < conns.length ; i++){
        if(conns[i].ip && conns[i].ip === msg){
          exists = true;
          conns[i].socket = socket;
          console.log("Connection updating")
        }
      }
      if(exists === false){
        conns.push({
        ip        : msg,
        startTime : Date.now(),
        ///end time to be implemented in timeout update
        socket    : socket
        });
        console.log("New Connection");
      }
    });
    socket.on("goodBye", function(msg){
      for(var i = 0; i < conns.length; i ++){
        if(conns[i].socket.id === socket.id && conns[i].ip === msg){
          closeSocket(i);
        }
      }
    });
    socket.on('data', function(msg){
      if(socket.handshake.address.search('127.0.0.1') >= 0){ 
        if(msg === undefined){
          socket.emit('resendData');
        }
        else{
          console.log("Data recieved sending to be ran...");
          console.log(msg);
          exec('rm data.zip' , (err,stdout,stderr)=>{ 
            console.log(stdout);
            fs.writeFile("data.zip",msg, (err) => {
              if(err){
                console.log(err);
              }
            });
          });
        }
      }
    });
    socket.on('result', function(msg){
      if(socket.handshake.address.search('127.0.0.1') >= 0){
        if(msg === undefined){
          socket.emit('resendResult');
        }
        else{
          exec('rm result.zip' , (err,stdout,stderr)=>{
            fs.writeFileSync("result.zip", msg, (err) => {
              if(err){
                //console.log(err);
              }
            });
          });
        }
      }
    });
    socket.on("setupBuffer", msg => {
      if(socket.handshake.address.search('127.0.0.1') >= 0){
        buffer = msg;
      }
    });
    socket.on("setupMode", msg => { 
      if(socket.handshake.address.search('127.0.0.1') >= 0 && msg === "WORKER"){
        mode = 0;
      }
      else if(socket.handshake.address.search('127.0.0.1') >= 0 && msg === "VALIDATOR"){
        mode = 1;
      }
      else if(socket.handshake.address.search('127.0.0.1') >= 0 && msg === "USER"){
        mode = 2;
      }

      console.log("Your Mode is now: " + mode);
    });
    socket.on('request', (msg) =>{
      console.log("Got:request and msg:" + msg);
      var tag = "data";
      var type = "WORKER";
      if(mode === 0){
        tag = "result";
        type = "VALIDATOR";
      }
      if(buffer !== undefined){
        socket.emit('transmitting' + msg, tag, buffer); 
        console.log("emit:transmitting to:" + msg + " with tag:" + tag );
      }
      else{
        console.log("NO FILE FOUND!!", "Please put the results within the field.", "warning");
      }
      socket.emit('fin'+ msg , tag);
      console.log("emit:fin to:" + msg + " with tag:" + tag);
    });
    socket.on('recieved', (msg) => {
      console.log("message was recieved");          
    });
});

http.listen(3001 , function(){
    console.log('listening on: ' + ip);
});
///////////////////////////////////////////////////////////////execution functions/////////////////////////////////////////////////////////////////////////////////////
async function run(file, versionA){
  console.log("executing: " + file)
  if(versionA === ""){
    console.log('error!!!');
  }
  await exec('sudo docker run -i --rm -v $PWD:/tmp -w /tmp tensorflow/tensorflow:'+versionA+' python ./'+ file, (err,stdout,stderr)=>{ 
    if(err){
      //return;
      console.log(err);
    }
    console.log(stdout);
    if(mode === 0){
      rem(name);
    }
    else if(!err){
      ver = true;
    }
  });
}
async function unzipF(file){
    await exec('unzip ' + file , (err,stdout,stderr)=>{
        if(err){
            //console.log(err);
            //return;
            var s;
            for(var i = 0 ; i < conns.length; i++){
              if(conns[i].socket.handshake.address.search('127.0.0.1') >= 0){
                s = conns[i].socket;
                if(mode === 0 ){
                  s.emit('resendData');
                  training = false;
                }
                if(mode === 1 || mode === 2 ){
                  s.emit('resendResult');
                  training = false;
                }
              }
            }
        }
        console.log(stdout);
    });
}
async function genFiles(file){
    await exec('sudo docker run -i --rm -v $PWD:/tmp -w /tmp tensorflow/tensorflow:1.12.0 python train.py ' + file , (err,stdout,stderr)=>{
        if(err){
            return;
        }
        console.log(stdout);
    });
}
async function comp(){
    if(mode !== 0){
        await exec('sudo docker run -i --rm -v $PWD:/tmp -w /tmp tensorflow/tensorflow:1.12.0 python  comp.py ' , (err,stdout,stderr)=>{
            if(err){
              return;
            }
            console.log(stdout);
        });
    }
}
async function rem(file){
    if(mode === 0){
        await exec('rm execute.py' , (err,stdout,stderr)=>{
            if(err){
              return;
            }
            console.log(stdout);
          });
          exec('zip result.zip result.h5 result.txt eval.py version.json' , (err,stdout,stderr)=>{
            if(err){
              return;
            }
            console.log(stdout);
            exec('rm result.h5 result.txt eval.py version.json data.zip '+ file , (err,stdout,stderr)=>{
                if(err){
                  return;
                }
                training = false;
                version = '';
                name = '';
                console.log(stdout);
            });
          }); 
    }
    else{
        await    exec('rm result.h5 result.txt version.json eval.py result.zip eval.txt' , (err,stdout,stderr)=>{
                if(err){
                  return;
                }
                ver = false;
                console.log(stdout);
            });
    }
}
async function getVer(file){
    var obj = await JSON.parse(fs.readFileSync(file , 'utf8'));
    version = obj.ver;
    console.log(version);
    if(mode === 1){
      run("eval.py", version);
    }
}
async function uploadVal(){
  if(flag){
    flag = false;
    var f = false; 
    if(fs.readFileSync('fin.txt' , 'utf8').search('True') >= 0){
      f = true;
    }
    var s;
    for(var i = 0 ; i < conns.length; i++){
      if(conns[i].socket.handshake.address.search('127.0.0.1') >= 0){
        s = conns[i].socket;
      }
    }
    s.emit('uploadVal', f);
    exec('rm fin.txt' , (err,stdout,stderr)=>{});
  }
}
//need a resend function
async function uploadResult(){
  if(flag){
    flag = false;
    fs.readFile('result.zip', (err,data)=>{
      //console.log(data);
      //console.log(typeof data);
      //fs.writeFile('../result.zip', data, (err)=>{if(err){console.log(err)}});
      if(data !== undefined){ 
        console.log('uploading result');
        var s;
        for(var i = 0 ; i < conns.length; i++){
          if(conns[i].socket.handshake.address.search('127.0.0.1') >= 0){
            s = conns[i].socket;
            s.emit('uploadResult', data);
            console.log('uploading...');
          }
        }
      }
      else {
        flag = true;
        console.log("upload failed... Trying again now")
        uploadResult();
      }
    });
  }
}
/////////////////////////////////////////////////////////////////////////////file management section//////////////////////////////////////////////////////////////////////
fs.watch('.', (event, file)=>{
    //user mode case
    if(event === 'change' && file === 'result.zip' && mode === 2){ //user recieves files
        exec('mv result.zip ~/Downloads' , (err,stdout,stderr)=>{
            if(err){
              //console.log(err);
              //return;
            } 
            console.log(stdout);
          });
    }
    //validator mode cases
    else if(event === 'change' && file === 'result.zip' && mode === 1){
        unzipF(file);
        flag = true;
    }
    else if(event === 'change' && file === 'version.json' && mode === 1 && ver === false){
      ver = true;
      getVer(file);
    }
    else if(event === 'change' && file === 'eval.txt' && mode == 1){
        comp();
    }
    else if(event === 'change' && file === 'fin.txt' && mode === 1){
        rem('');
        uploadVal();
    }
    //provider mode cases
    else if(event === 'change' && file === 'data.zip' && mode === 0){
        unzipF(file);
        flag = true;
    }
    else if(event === 'change' && file.search('.py') >= 0 && file != 'execute.py' && file != 'eval.py' &&  mode === 0){
        genFiles(file); 
        name = file;
    }
    else if(event === 'change' && file === 'version.json' && mode === 0 && version === ''){
        getVer(file);
    }
    else if(event === 'change' && file === 'execute.py' && mode === 0){
        if(training === false){
            training = true;
            run(file, version);
        }
    }
    else if(event === 'change' && file === 'result.zip' && mode === 0){
      uploadResult();
    }
    //once the files have been run and excess has been deleted send back to the browser for submission
});