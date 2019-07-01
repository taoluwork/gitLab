//get the neccessary libaries
const util = require("util");
const {exec} = require('child_process');
const fs = require('fs');
const EventEmitter = require('events');
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var version = '';//tensorflow version
var name = '';//name of python file
var nameA= '';
var emit;
var f = 0;
var evalFlag = 0;
var pyFlag  = 0;
var remFlag = 0;
var runFlag = 0;
var provider;
var mode;
var buffer; 
var ip ;
var user;
var transmitCount = 0;
var conns = new Object();
conns.count = 0;
conns.startTime = [];
conns.connID = [];
conns.connType = [];
conns.status = [];
////////////////////////////////////////////////////// server section  ////////////////////////////////////////////////////////////////////////

if(process.argv[3] === undefined){
  console.log("Invalid format, must include a valid IP address")
  return;
}
else{
  ip = process.argv[3];
}

io.on('connection', function(socket){
  conns.startTime[conns.count] = Date.now();
  conns.connID[conns.count] = socket.id;
  conns.status[conns.count] = false; //becomes true when there is a finish
  conns.count++;
  console.log("NEW CONNECTION at time:" + conns.startTime[conns.count-1] + " from socket.id:" + conns.connID[conns.count-1]);

  socket.emit("whoAmI", ip); // this assumes that the person can put a valid ip (this can be checked by some how parsing ifconfig bash command for this input)
  socket.on('data', function(msg){
    console.log("Data recieved sending to be ran...");
    fs.writeFileSync("data.zip",msg, (err) => {
      if(err){
        console.log(err);
      }
    });
    exec('unzip data.zip' , (err,stdout,stderr)=>{
      if(err){
        console.log(err);
        return;
      }
      console.log(stdout);
    });
  });

  socket.on('result', function(msg){
    fs.writeFileSync("result.zip", msg, (err) => {
      if(err){
        console.log(err);
      }
    });
    exec('mv result.zip ~/Downloads' , (err,stdout,stderr)=>{
      if(err){
        console.log(err);
        return;
      } 
      console.log(stdout);
    });
  });
  socket.on("setupBuffer", msg => {
    buffer = msg;
    console.log(typeof msg);
  });
  socket.on("setupMode", msg => {
    mode = msg;
    /*user = true;
    provider = false;
    if(msg === "WORKER"){
      user = false;
      provider = true;
    }*/
  });
  socket.on('request', (msg) =>{
    console.log("Got:request and msg:" + msg);
    var tag = "data";
    var type = "WORKER";
    if(mode === "WORKER"){
      tag = "result";
      type = "VALIDATOR";// or this can be a user gettign the last data maybe base it off of total connection count
    }
    if(buffer !== undefined){
      socket.emit('transmitting' + msg, tag, buffer); 
      console.log("emit:transmitting to:" + msg + " with tag:" + tag + " this.state.buffer:");
    }
    else{
      console.log("NO FILE FOUND!!", "Please put the results within the field.", "warning");
    }
    socket.emit('fin'+ msg , tag);
    console.log("emit:fin to:" + msg + " with tag:" + tag);
  });
  socket.on('recieved', (msg) => {
    console.log("message was recieved");  
    /*if(mode === 'WORKER'){
      transmitCount +=1;
      if(transmitCount >= 4){
        //////////////remove stuff not sure if im done yet or not
        buffer = undefined;
        mode = undefined;
        socket.emit("release" + ip);
      }
    }*/          
  });


});


http.listen(3001 , function(){
  console.log('listening on: ' + ip);
});

////////////////////////////////////////////////////// parsing section ////////////////////////////////////////////////////////////////////////
if(process.argv[2] === "--provider"){
  provider = true;
}
else if(process.argv[2] === "--validator"){
  provider = false;
}
else if(process.argv[2] === "--user"){
  user = true;
}
else{
  console.log("INVALID INPUT (--provider/--validator)");
  return;
}
//run the file from the downloads
function run(file, version){
    exec('sudo docker run -i --rm -v $PWD:/tmp -w /tmp tensorflow/tensorflow:'+version+' python ./'+ file, (err,stdout,stderr)=>{ 
      if(err){
        console.log(err);
        return;
      }
      console.log(stdout);
    });
}

function genFiles(fname){
    if(provider){
        exec('sudo docker run -i --rm -v $PWD:/tmp -w /tmp tensorflow/tensorflow:1.12.0 python train.py ' + fname , (err,stdout,stderr)=>{
        if(err){
            console.log(err);
            return;
        }
        console.log(stdout);
        });
    }
    else{
        exec('unzip ' + fname , (err,stdout,stderr)=>{
            if(err){
              console.log(err);
            return;
            }
            console.log(stdout);
        });
    }
}

function comp(){
    if(!provider){
        exec('sudo docker run -i --rm -v $PWD:/tmp -w /tmp tensorflow/tensorflow:1.12.0 python  comp.py ' , (err,stdout,stderr)=>{
            if(err){
              console.log(err);
              return;
            }
            console.log(stdout);
        });
    }
}

function rem(){
    if(provider){
        exec('rm execute.py' , (err,stdout,stderr)=>{
            if(err){
              console.log(err);
              return;
            }
            console.log(stdout);
          });
          exec('zip result.zip result.h5 result.txt eval.py version.json' , (err,stdout,stderr)=>{
            if(err){
              console.log(err);
              return;
            }
            console.log(stdout);
            //console.log(nameA);
            exec('rm result.h5 result.txt eval.py version.json '+nameA , (err,stdout,stderr)=>{
                if(err){
                  console.log(err);
                  return;
                }
                console.log(stdout);
            });
            nameA = '';
          }); 
    }
    else{
        exec('zip fin.zip result.h5 fin.txt' , (err,stdout,stderr)=>{
            if(err){
              console.log(err);
              return;
            }
            console.log(stdout);
            //console.log(nameA);
            exec('rm result.h5 result.txt fin.txt eval.txt version.json eval.py '+nameA , (err,stdout,stderr)=>{
                if(err){
                  console.log(err);
                  return;
                }
                console.log(stdout);
            });
            nameA = '';
          }); 
    }
}

function genEmit(){
    const emitter = new EventEmitter();
      emitter.once('getFile', (fname)=>{
        name = fname;
        //console.log(name)
      });
      emitter.once('getVer', (path)=>{
        var obj = JSON.parse(fs.readFileSync(path , 'utf8'));
        version = obj.ver;
      });
      emitter.once('runProg', (ver, nam)=>{
        run(nam,ver);
      });
      emitter.once('resetVal',()=>{
        version = '';
        name = '';
        f=0;
      });
      return emitter
}

function runEmits(){
    emit.emit('runProg',version,name);
    emit.emit('resetVal');
    f=0;
    evalFlag = 0;
    remFlag = 0;
    pyFlag = 0;
    runFlag = 0;
}
if(user){
  console.log("Welcome user!!!! Please wait for your results. Please wait for your results to appear in your downloads folder");
}
else if(provider){
    //watch for there to be a change in the current file
    fs.watch('.', (event, fname)=>{
        if(f === 0){
          emit = genEmit();
          f = 1;
        }
        //when the unprepared file is loaded
        if(event === 'change' && fname.search('.py') >= 0 && fname != 'execute.py' && fname!= 'eval.py'){
            if(pyFlag === 0){
                console.log("generting files");
                genFiles(fname);
                nameA = fname;
                pyFlag = 1;
            }
        }
        //when the file is loaded
        if(event === 'change' && fname === 'execute.py' && name === ''){
          console.log("getting execute.py");
          emit.emit('getFile', fname);
        }
        //when the version is loaded
        if(event === 'change' && fname === 'version.json' && version === ''){
          console.log("getting version.json");
          emit.emit('getVer', fname);
        }
        //when result.h5 is made remove the generated stuff
        if(event === 'change' && fname === 'result.txt'){
                if(remFlag === 0){
                console.log("removing generated files and zipping");
                rem();
                remFlag=1;
            }
        }
        //when both have been loaded
        if(version != '' && name != ''){
          if(runFlag === 0){
            console.log('Executing TF code');
            setTimeout(runEmits, 1000);
            runFlag = 1;
          }
        }
    });
}
else{
    //watch for there to be a change in downloads
    fs.watch('.', (event, fname)=>{
        if(f === 0){
          emit = genEmit();
          f = 1;
        }
        //when the unprepared file is loaded
        if(event === 'change' && fname=== 'result.zip'){
          if(pyFlag === 0){
            console.log("generting files");
            genFiles(fname);
            nameA = fname;
            pyFlag = 1;
          }
        }
        //when the file is loaded
        if(event === 'change' && fname === 'eval.py' && name === ''){
          console.log("getting eval.py");
          emit.emit('getFile', fname);
        }
        //when the version is loaded
        if(event === 'change' && fname === 'version.json' && version === ''){
          console.log("getting version.json");
          emit.emit('getVer', fname);
        }
        //when result.h5 is made remove the generated stuff
        if(event === 'change' && fname === 'eval.txt'){
          if(evalFlag === 0){
                console.log("comparing");
                comp();
                evalFlag=1;
            }
        }
        //when result.h5 is made remove the generated stuff
        if(event === 'change' && fname === 'fin.txt'){
            if(remFlag === 0){
                console.log("removing generated files and zipping");
                rem();
                remFlag=1;
            }
        }
        //when both have been loaded
        if(version != '' && name != ''){
          console.log('Executing TF code');
          setTimeout(runEmits, 1000);
        }
      });  
}