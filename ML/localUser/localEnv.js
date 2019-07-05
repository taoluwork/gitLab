const util = require("util");
const {exec} = require('child_process');
const fs = require('fs');
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);


var version = '';
var name = '';
var mode = ''; 
var ip;
var training = false;
var s;
var ver = false;
//////////////////////////////////////////////////////////////////////input section////////////////////////////////////////////////////////////////////////////////
//modes
//0-provider
//1-validator
//2-user
//soon will be replaced in automation update for emits from the socket
if(process.argv[2] === "--provider"){
    mode = 0;
}
else if(process.argv[2] === "--validator"){
    mode = 1;
  }
else if(process.argv[2] === "--user"){
    mode = 2;
  }
else{
    console.log("INVALID INPUT (--provider/--validator)");
    return;
}
if(process.argv[3] === undefined){
    console.log("Invalid format, must include a valid IP address")
    return;
}
else{
    ip = process.argv[3];
}
//////////////////////////////////////////////////////////////////////server section/////////////////////////////////////////////////////////////////////////////
  io.on('connection', function(socket){
//    conns.startTime[conns.count] = Date.now();
//    conns.connID[conns.count] = socket.id;
//    conns.status[conns.count] = false; //becomes true when there is a finish
//    conns.count++;
//    console.log("NEW CONNECTION at time:" + conns.startTime[conns.count-1] + " from socket.id:" + conns.connID[conns.count-1]);

    s = socket;
  
    socket.emit("whoAmI", ip); // this assumes that the person can put a valid ip (this can be checked by some how parsing ifconfig bash command for this input)
    socket.on('data', function(msg){
      if(msg === undefined){
        /////////////////resend structure (needs to be added to app.js aswell)
        socket.emit('resendData');
      }
      else{
        console.log("Data recieved sending to be ran...");
        console.log(msg);
        fs.writeFile("data.zip",msg, (err) => {
          if(err){
            console.log(err);
          }
        });
      }
    });
    socket.on('result', function(msg){
      if(msg === undefined){
        socket.emit('resendResult');
      }
      else{
        fs.writeFileSync("result.zip", msg, (err) => {
          if(err){
            //console.log(err);
          }
        });
      }
    });
    socket.on("setupBuffer", msg => {
      buffer = msg;
    });
    socket.on("setupMode", msg => { //partial complete future function
      console.log('setupmode');  
      /*if(process.argv[2] === "WORKER"){
            mode = 0;
        }
        else if(process.argv[2] === "WORKER"){
            mode = 1;
        }
        else if(process.argv[2] === "USER"){
            mode = 2;
        }*/
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
            if(mode === 0 ){
              s.emit('resendData');
            }
            if(mode === 1 || mode === 2 ){
              s.emit('resendResult');
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
    }
    else if(event === 'change' && file === 'version.json' && mode === 1 && ver === false){
      ver = true;
      getVer(file);
    }
    else if(event === 'change' && file === 'eval.txt' && mode == 1){
        comp();
    }
    else if(event === 'change' && file === 'fin.txt' && mode === 1){
        rem('')
    }
    //provider mode cases
    else if(event === 'change' && file === 'data.zip' && mode === 0){
        unzipF(file);
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
});