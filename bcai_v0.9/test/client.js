////////////////////////////////////////////////////////////////
//user's js script
//version: 0.9.2
//author: taurus tlu4@lsu.edu
//use: $ node user.js -a 4 --debug --help
/////////////////////////////////////////////////////////////////
var version = "bcai_client v0.9.2     ----  by Taurus"
//NOTE: combine user and worker client together switch using --user, --worker
//Avoid using version earlier than 0.9.2
/////////////////////////////////////////////////////////////////
//edit default parameter here:
var dataID = 31415926;
var target = 90;        //this must be less than workders target limt
var time = 90000;       //this must less than worker's time limit
var money = 800000;      //this must be greater than worker's price

var maxTime = 100000;
var maxTarget = 99;
var minPrice = 500000;
var mode;// = 'user';      //default mode
////////////////////////////////////////////////////////////////////


//get arguments from console
var argv = require('minimist')(process.argv.slice(2));
//argument example:
//node worker.js -u 2 -b 3
//{ _: [], u: 2, b: 3 }
//console.log(argv['u'])
if(argv['help']) {
    console.log("Arguments:")
    console.log(" -a #    : use Account[#]  /  -a @$!$ list address");
    console.log(" -s #    : cancel request # ");
    console.log(" -u #    : update request # ");
    console.log(" -t #    : time ");
    console.log(" -T #    : target ");
    console.log(" -p #    : price");

    console.log(" --view  : view all current requests / no change");
    console.log(" --my    : view all my requests");
    console.log(" --cancel: cancel existing request");
    console.log(" --all   : show all the infomation / use with caution")
    console.log(" --debug : enable more details");
    console.log(" --user / --worker : switch mode")
    //console.log(" --stop :  stop the current provider")
    console.log(" --nl    : no listening for events (default will do)")
    console.log("NOTE: you cannot view other accounts' info, use --my -a#")
	process.exit();
}
if(argv['v'] || argv['version']){
    console.log(version);
    process.exit();
}
if(argv['t'] != undefined) maxTime = argv['t'];
if(argv['T'] != undefined) maxTime = argv['T'];
if(argv['p'] != undefined) maxTime = argv['p'];
if(argv['user']) mode = 'user';
else if(argv['worker']) mode = 'worker';
else {
    console.log("-----------------------------------------------------------------")
    console.log("You must specify worker or user mode.")
    console.log("-----------------------------------------------------------------")
    process.exit();
}
    ////////////////////////////////////////////////////////////////////////
//create web3 instance
var Web3 = require('web3');
//use websocket provider here, http is deprecated.
var web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));

//get contract instance
//NOTE: this is not quite supported by Node.js
//import TaskContract from '../build/contracts/TaskContract.json';
//use this:
var TaskContract = require('../build/contracts/TaskContract.json');
var abi = TaskContract.abi;
var addr = TaskContract.networks[512].address;
const myContract = new web3.eth.Contract(abi, addr);
var myAccount;
var reqID;
//////////////////////////////////////////////////////////////////////////
//note: networkID can be given to ganache by
//ganache-cli -i or --networkId 512
// start your ganache-cli now!
/////////////////////////////////////////////////////////////////////////
web3.eth.getAccounts().then(function(accounts){     //get and use accoutns
    if (argv['a'] > 9){                 //list all accounts
        console.log(accounts);
        process.exit();
    }
    else if(argv['a'] == undefined) {
        if(mode == 'user'){
            myAccount = accounts[0];
            console.log("=================================================================")
            console.log('Using default account: [0]', myAccount);
            console.log('You can infer specific account by passing -a #');
        }
        else if (mode == 'worker'){
            myAccount = accounts[9];
            console.log("=================================================================")
            console.log('Using default account: [9]', myAccount);
            console.log('You can infer specific account by passing -a #');
        }
    }    
    else {      //-a is given
        myAccount = accounts[argv['a']];
        if (myAccount == undefined) throw 'setting account error!';
        console.log("=================================================================")
        console.log('Using account: [',argv['a'], '] ', myAccount);
    }
    console.log("Client Mode: ", mode);
    return accounts;
}).then(
    function(accounts){         //success
        if (argv['all']){
            console.log(accounts);
            if      (mode == 'user')    listAllRequests();
            else if(mode == 'worker')   listAllProviders();
        }
        else if (argv['my']){
            if(mode == 'user')  listRequestOnlyMy(myAccount);
            else if(mode == 'worker') listProviderOnlyMy(myAccount);
        }
        else if (argv['view']){
            console.log(accounts); 
            if (mode == 'user') listPoolRequests();
            if (mode == 'worker') listPoolProviders();
        }
        else {  //real state change
            if (mode == 'user') userFireMessage();
            else if (mode =='worker') workerFireMessage();
        }
    },
    function(err){     //failure
        console.log(err);
        console.log("Getting accounts failed!");
        console.log("Check your depolyment! ");
        process.exit();
    }
)


//console.log(contract.address);
/*function showRequestInfo(){
    myContract.methods.getRequestPoolSize().call().then(function(ret){
        console.log("-----------------------------------------------------------------");
        console.log("Request count = ",ret);
    })
    .then(function(){
    //get Provider pool     
        myContract.methods.getRequestPool().call().then(function(ret){
            console.log("-----------------------------------------------------------------");
            console.log("Request Pool: ");
            console.log(ret);
               
        })
    }).then(function(){
        myContract.methods.getRequestCount().call().then(function(reqCount){
             //print provider detals (object)
            if(argv['obj'] || argv['debug']){
                myContract.methods.getRequest(reqCount-1).call().then(function(ret){
                    console.log("-----------------------------------------------------------------");
                    console.log(ret);
                });
            }
        })      
    }).then(function(){
        if(argv['nl']) process.exit();
    })
}*/

function userFireMessage(){
    //call request task
    if(!argv['cancel'] && argv['s'] == undefined && argv['u'] == undefined){        //submit a request
        myContract.methods.requestTask(dataID, target, time)
        .send({from: myAccount, gas: 80000000, value: money})
        .then(function(ret){
            //console.log("-----------------------------------------------------------------")
            console.log("Using parameters: time = ",time,", target = ",target,", price = ",money);
            console.log("Request Submitted! Block: ",ret.blockNumber);
            console.log("-----------------------------------------------------------------")
            //console.log("return = ", ret.returnValue);
            if(argv['recpt']!= 0 && argv['recpt']!=undefined) 
                console.log("Receipt:    <=====######", ret);
            else if (argv['recpt'] !=0){
                console.log("Event: ", ret.events.RequestAdded.event)
                console.log(ret.events.RequestAdded.returnValues)
            }
        }).then(function(){
            showLatestRequest();          
        }).catch(function(err){
            console.log("Submit request failed! Check receipt by --recpt");
            process.exit();
        })
    }
    else if(argv['stop'] || argv['s'] != undefined) {   //stop 
        //TODO: cancel request need refund , use caution
        myContract.methods.cancelTask(argv['s'])
        .send({from:myAccount, gas:200000})
        .then(function(ret){
            console.log("Cancel Request: Block = ", ret.blockNumber);
            console.log("-----------------------------------------------------------------");
            if(argv['recpt']) 
                console.log("Receipt :    <<====####  ", ret);
            else {
                console.log("Event: ", ret.events.RequestCanceled.event)
                console.log(ret.events.RequestCanceled.returnValues)
            }
        }).then(function(){
            showLatestRequest();
        }).catch(function(err){ //this poped when edit other's config/ fired using wrong account
            console.log("Cancel Request failed! Check your reqID by --my");
            //console.log(err);
            process.exit();
        })
    }  
    // call updateProviding
    else { 
        //TODO: update request need refund 
        myContract.methods.updateRequest(time, target, argv['u'])
        .send({from: myAccount, gas: 200000, value = money})
        .then(function(ret){
            console.log("Update request: Block = ", ret.blockNumber);
            console.log("Using parameters: time = ",time,", target = ",target,", price = ",money);
            console.log("-----------------------------------------------------------------");
            if(argv['recpt']) 
                console.log("Receipt :    <<====####  ", ret);
            else {
                console.log("Event: ", ret.events.RequestUpdated.event)
                console.log(ret.events.RequestUpdated.returnValues)
            }
        }).then(function(){
            showLatestRequest();
        }).catch(function(err){ //this poped when edit other's config/ fired using wrong account
            console.log("Update Request failed! Check your reqID by --my");
            //console.log(err);
            process.exit();
        })
    }  
    //call taskAssign  -- this is automatically done by contract


    //now catch the event TaskAssigned
    //myContract.events.TaskAssigned({
    myContract.once('TaskAssigned',{
        fromBlock: 0,
	    toBlock: 'latest'
    }, function(err, eve){
        if(err!= null) console.log("ERROR!",err);
        if(argv['debug']){
            console.log("=================================================================")
            console.log("Task Assigned to Provider", eve);
            console.log("=================================================================")
        }else{
            console.log("=================================================================")
            console.log("Task Assigned to Provider", eve.returnValues)
            console.log("=================================================================")
        }
    })
}
function workerFireMessage(){
    if(!argv['stop'] && argv['s'] == undefined && argv['u'] == undefined){     //start new
        myContract.methods.startProviding(maxTime, maxTarget, minPrice)
        .send({from: myAccount, gas: 400000})
        .then(function(ret){
            console.log("Start providing: Block = ", ret.blockNumber);
            console.log("Using parameters: time = ",maxTime,", target = ",maxTarget,", price = ",minPrice);
            console.log("-----------------------------------------------------------------")
            if(argv['recpt']!= 0 && argv['recpt']!=undefined)
                console.log("Receipt:    <=====###### ", ret);
            else if (argv['recpt'] !=0){
                console.log("Event: ", ret.events.ProviderAdded.event)
                console.log(ret.events.ProviderAdded.returnValues)
            }          
        }).then(function(){
            showLatestProvider();
        }).catch(function(err){
            console.log("Start provider failed! Check receipt by --recpt");
            console.log(err);
            process.exit();
        })
    } 
    // call stopProviding
    else if(argv['stop'] || argv['s'] != undefined) {   //stop 
        myContract.methods.stopProviding(argv['s'])
        .send({from:myAccount, gas:200000})
        .then(function(ret){
            console.log("Stop providing: Block = ", ret.blockNumber);
            console.log("-----------------------------------------------------------------");
            if(argv['recpt']) 
                console.log("Receipt :    <<====####  ", ret);
            else {
                console.log("Event: ", ret.events.ProviderStopped.event)
                console.log(ret.events.ProviderStopped.returnValues)
            }
        }).then(function(){
            showLatestProvider();
        }).catch(function(err){
            console.log("Stop provider failed! Check your provID by --my");
            //console.log(err);
            process.exit();
        })
    }  
    // call updateProviding
    else { 
        myContract.methods.updateProvider(maxTime, maxTarget, minPrice, argv['u'])
        .send({from: myAccount, gas: 200000})
        .then(function(ret){
            console.log("Update providing: Block = ", ret.blockNumber);
            console.log("Using parameters: time = ",maxTime,", target = ",maxTarget,", price = ",minPrice);
            console.log("-----------------------------------------------------------------");
            if(argv['recpt']) 
                console.log("Receipt :    <<====####  ", ret);
            else {
                console.log("Event: ", ret.events.ProviderUpdated.event)
                console.log(ret.events.ProviderUpdated.returnValues)
            }
        }).then(function(){
            showLatestProvider();
        }).catch(function(err){
            console.log("Update provider failed! Check your provID by --my");
            //console.log(err);
            process.exit();
        })
    }

    //waiting to be triggered:
    //TODO: once or subscribe!
    myContract.once('TaskAssigned',{
        fromBlock: 0,
	    toBlock: 'latest'
    }, function(err, eve){
	    if(err!= null) console.log("ERROR!",err);
        if(argv['debug']) {
            console.log("=================================================================")
            console.log(eve);
            console.log("=================================================================")
        } else {
            console.log("=================================================================")
            console.log("Task Assigned to Provider", eve.returnValues);           
            console.log("=================================================================")
        }
    })
    //wait until to be assigned.
    /*contract.events.TaskAssigned({
    //contract.once('TaskAssigned', { 
        fromBlock: 0,
        toBlock: 'latest'
    }, function(err, ret){
        //console.log(err, ret.returnValue);
    })
    .on('data',function(event){
        var eventList = event.returnValues;
        console.log(eventList);
    })*/
}



//called by --my
function listRequestOnlyMy(myAccount){
    myContract.methods.getRequestID(myAccount).call().then(function(IDList){
        console.log("-----------------------------------------------------------------");
        console.log("All my posted Request: ")
        console.log(IDList);
        return IDList;           
    })
    .then(function(IDList){
        if(argv['debug']){
            myContract.methods.listRequests(IDList).call().then(function(objList){                   
                console.log("-----------------------------------------------------------------");
                console.log("Debug details: ");
                for(var i = 0; i < IDList.length; i++){
                    console.log(objList[i]);
                }                                  
            }).then(function(){
                    process.exit()
            })  
        }
        else process.exit();
    }, function(err){
        console.log(err);
        console.log("Error listing my own!")
    })
}
function listProviderOnlyMy(myAccount){
    myContract.methods.getProviderID(myAccount).call().then(function(IDList){
        console.log("-----------------------------------------------------------------");
        console.log("All my posted provider: ")
        console.log(IDList);
        return IDList;           
    })
    .then(function(IDList){
        if(argv['debug']){
            myContract.methods.listProviders(IDList).call().then(function(objList){                   
                console.log("-----------------------------------------------------------------");
                console.log("Debug details: ");
                for(var i = 0; i < IDList.length; i++){
                    console.log(objList[i]);
                }                                  
            }).then(function(){
                 process.exit()
            })  
        }
        else process.exit();
    }, function(err){
        console.log(err);
        console.log("Error listing my own!")
    })
}


//call by --view
//show Active Count
//show Active Pool
//show Total Count
//view Total List
function listPoolRequests (){
    myContract.methods.getRequestPoolSize().call().then(function(actCount){
        console.log("-----------------------------------------------------");
        console.log("Total active Request = ", actCount);
    }).then(function(){       
        myContract.methods.getRequestCount().call().then(function(totalCount){            
            console.log("Total Request since start = ", totalCount);
        }).then(function(){	        
            myContract.methods.getRequestPool().call().then(function(pool){             
                console.log("Active Request pool: ");
                console.log(pool);
                return pool;
            }).then(function(pool){	
                myContract.methods.listRequests(pool).call().then(function(List){                          
                    if(pool.length > 0) {
                        console.log("-----------------------------------------------------");
                        console.log("List all the Requests in Pool: ")
                    }
                    for (var i = 0;i < pool.length ;i++){
                        if(argv['debug']){          //in a detail pattern
                            console.log(List[i]);
                        } else{                     //or simple print:    3 key values 
                            if(List[i]['addr'] != 0){
                                console.log("reqID = ", List[i]['reqID']);
                                console.log("addr = ", List[i]['addr']);
                                console.log("provider = ", List[i]['provider']);
                            }
                        }
                    }		
                })
                .catch(function(err){      //catch any error at end of .then() chain!
                    console.log("List Pool Request Info Failed! ")
                    console.log(err);
                    process.exit();
                })               
            })
        })
    })
}
function listPoolProviders (){
    myContract.methods.getProviderPoolSize().call().then(function(actCount){
        console.log("-----------------------------------------------------");
        console.log("Total active provider = ", actCount);
    }).then(function(){       
        myContract.methods.getProviderCount().call().then(function(totalCount){
            console.log("Total provider since start = ", totalCount);
        }).then(function(){	        
            myContract.methods.getProviderPool().call().then(function(pool){             
                console.log("Active provider pool: ");
                console.log(pool);
                return pool;
            }).then(function(pool){	
                myContract.methods.listProviders(pool).call().then(function(List){                          
                    if(pool.length > 0) {
                        console.log("-----------------------------------------------------");
                        console.log("List all the Providers: ")
                    }
                    for (var i = 0;i < pool.length ;i++){
                        if(argv['debug']){          //in a detail pattern
                            console.log(List[i]);
                        } else{                     //or simple print:    3 key values 
                            if(List[i]['addr'] != 0){
                                console.log("provID = ", List[i]['provID']);
                                console.log("addr = ", List[i]['addr']);
                                console.log("available = ", List[i]['available']);
                            }
                        }
                    }		
                })
                .catch(function(){      //catch any error at end of .then() chain!
                    console.log("List All Provider Info Failed! ")
                    console.log(err);
                    process.exit();
                })               
            })
        })
    })
}

//called after submit a new request
function showLatestRequest(){
    myContract.methods.getRequestCount().call().then(function(totalCount){
        console.log("-----------------------------------------------------------------");
        console.log("Total Request count = ",totalCount);
        return totalCount;
    })
    .then(function(totalCount){
        //get Request pool     
        myContract.methods.getRequestPool().call().then(function(pool){
            console.log("Active Request count = ",pool.length);
            console.log("Request Pool: ");
            console.log(pool); 
            return totalCount;  
        }).then(function(totalCount){
            //print Request detals (object)
            if(argv['debug']){
                myContract.methods.getRequest(totalCount-1).call().then(function(ret){
                    console.log("-----------------------------------------------------------------");
                    console.log("Last Request: ", ret);
                    //return ret;
                }).then(function(ret){
                    if(argv['nl']) process.exit();
                });
            }
            else if(argv['nl']) process.exit();
        })
    })
}
function showLatestProvider(){
    myContract.methods.getProviderCount().call().then(function(totalCount){
        console.log("-----------------------------------------------------------------");
        console.log("Total provider count = ",totalCount);
        return totalCount;
    })
    .then(function(totalCount){
        //get Provider pool     
        myContract.methods.getProviderPool().call().then(function(pool){
            console.log("Active Provider count = ",pool.length);
            console.log("Provider Pool: ");
            console.log(pool); 
            return totalCount;  
        }).then(function(totalCount){
            //print provider detals (object)
            if(argv['debug']){
                myContract.methods.getProvider(totalCount-1).call().then(function(ret){
                    console.log("-----------------------------------------------------------------");
                    console.log("Last provider: ", ret);
                    //return ret;
                }).then(function(ret){
                    if(argv['nl']) process.exit();
                });
            }
            else if(argv['nl']) process.exit();
        })
    })
}
//the most heavy duty
function listAllRequests(){
    myContract.methods.getRequestCount().call().then(function(totalCount){
        console.log("-----------------------------------------------------");
        console.log("Total Request since start = ", totalCount);
        return totalCount;
    }).then(function(totalCount){	
        myContract.methods.listAllRequests().call().then(function(List){                          
            if(totalCount > 0) console.log("List all the Requests in History:   <<======####")
            for (var i = 0;i < totalCount ;i++){
                if(argv['debug']){          //in a detail pattern
                    console.log(List[i]);
                } else{                     //or simple print:    3 key values 
                    if(List[i]['addr'] != 0){
                        console.log("reqID = ", List[i]['reqID']);
                        console.log("addr = ", List[i]['addr']);
                        console.log("provider = ", List[i]['provider']);
                        console.log("status = ", List[i]['status']);
                    }
                }
            }		
        })
        .catch(function(){      //catch any error at end of .then() chain!
            console.log("List Request History Info Failed! ")
            process.exit();
        })               
    })
}
//
function listAllProviders(){
    myContract.methods.getProviderCount().call().then(function(totalCount){
        console.log("-----------------------------------------------------");
        console.log("Total provider since start = ", totalCount);
        return totalCount;
    }).then(function(totalCount){	
        myContract.methods.listAllProviders().call().then(function(proList){                          
            if(totalCount > 0) console.log("List all the Providers: ")
            for (var i = 0;i < totalCount ;i++){
                if(argv['debug']){          //in a detail pattern
                    console.log(proList[i]);
                } else{                     //or simple print:    3 key values 
                    if(proList[i]['addr'] != 0){
                        console.log("provD = ", proList[i]['provID']);
                        console.log("addr = ", proList[i]['addr']);
                        console.log("available = ", proList[i]['available']);
                    }
                }
            }		
        })
        .catch(function(err){      //catch any error at end of .then() chain!
            console.log("List All Provider Info Failed! ")
            console.log(err);
            process.exit();
        })               
    })
}