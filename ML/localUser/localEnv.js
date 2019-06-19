//get the neccessary libaries
const util = require("util");
const {exec} = require('child_process');
const fs = require('fs');
const EventEmitter = require('events');

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


if(process.argv[2] === "--provider"){
  provider = true;
}
else if(process.argv[2] === "--validator"){
  provider = false;
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
        exec('python3 train.py ' + fname , (err,stdout,stderr)=>{
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
        exec('python3 comp.py ' , (err,stdout,stderr)=>{
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

if(provider){
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
