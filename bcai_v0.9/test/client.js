////////////////////////////////////////////////////////////////
//client's js app, combined --user mode and --worker mode
//version: 0.9.2
//author: taurus tlu4@lsu.edu
//use: $ node client.js --help --version
/////////////////////////////////////////////////////////////////
const version = "bcai_client v0.9.2     ----  by Taurus"
const NetworkID = 512;
//NOTE: combine user and worker client together switch using --user, --worker
//Avoid using version earlier than 0.9.2
/////////////////////////////////////////////////////////////////
//edit default parameter here:
var dataID = 31415926;
var target = 90;            //must < workders maxTarget
var time = 90000;           //must < worker's maxTime
var money = 800000;         //must > worker's minPrice
var maxTime = 100000;
var maxTarget = 99;
var minPrice = 500000;
var mode;                   // = 'user';      //default mode: no
var myAccount;              // default set below
////////////////////////////////////////////////////////////////////
//get arguments from console , handle mode and parameter
var argv = require('minimist')(process.argv.slice(2));
//argument example:
//node worker.js -u 2 -b 3    ==>   { _: [], u: 2, b: 3 }
if(argv['help']) {
    console.log("Arguments:")
    console.log(" -a #    : use Account[#]  /  -a [#>9] list all address");
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
//display version check
if(argv['v'] || argv['version']){
    console.log(version);
    process.exit();
}
//setting up mode
if(argv['user']) mode = 'user';
else if(argv['worker']) mode = 'worker';
else {
    console.log("-----------------------------------------------------------------")
    console.log("You must specify --worker or --user mode.")
    console.log("-----------------------------------------------------------------")
    process.exit();
}
//setting parameters
if(mode == 'user'){
    if(argv['t'] != undefined) time = argv['t'];
    if(argv['T'] != undefined) target = argv['T'];
    if(argv['p'] != undefined) money = argv['p']; 
}
else if(mode == 'worker'){
    if(argv['t'] != undefined) maxTime = argv['t'];
    if(argv['T'] != undefined) maxTarget = argv['T'];
    if(argv['p'] != undefined) minPrice= argv['p']; 
}
///////////////////////////////////////////////////////////////////////////
//create web3 instance
var Web3 = require('web3');
//use websocket provider here, NOTE: http is deprecated.
var web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));

//get contract instance
var TaskContract = require('../build/contracts/TaskContract.json');
var abi = TaskContract.abi;
var addr = TaskContract.networks[NetworkID].address;        //align to const ID defination on top
const myContract = new web3.eth.Contract(abi, addr);
//////////////////////////////////////////////////////////////////////////
//start your ganache testnet or connect to real blockcahin.
//NOTE: networkID must be given and set to const NetworkID.
// use: $ ganache-cli -i or --networkId 512
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
    //Important: display current mode
    console.log("Client Mode: ", mode);
    return accounts;
})
.then(function(accounts){           //success: accounts got
    if (argv['all']){               //display all info
        console.log(accounts);
        if      (mode == 'user')    AllRequests();
        else if(mode == 'worker')   AllProviders();
    }
    else if (argv['my']){           //display my info
        if(mode == 'user')  RequestOnlyMy(myAccount);
        else if(mode == 'worker') ProviderOnlyMy(myAccount);
    }
    else if (argv['view']){
        console.log(accounts);      //only view, no change
        if (mode == 'user') PoolRequests();
        if (mode == 'worker') PoolProviders();
    }
    else {                          //real state change
        if (mode == 'user') userFireMessage();
        else if (mode =='worker') workerFireMessage();
    }
})
.then(function(){                   //subcribe and monitor the events  
    myContract.events.SystemInfo({
        fromBlock: 'latest',
        //toBlock: 'latest'
    },function(err, eve){
        if(err!= undefined) console.log(err);           
    })
    .on('data', function(eve){
        if(argv['debug']) {
            console.log("=================================================================")
            console.log(eve);
            console.log("=================================================================")
        } else {
            console.log("=================================================================")
            console.log("Info: ", web3.utils.hexToAscii(eve.returnValues[2]), " ==> ", eve.blockNumber)
            console.log(eve.returnValues);           
            console.log("=================================================================")
        }

        //update the display
        if(mode == 'user'){      
            if(eve.returnValues[2] == web3.utils.asciiToHex('Request Stopped'))
                RequestOnlyMy(myAccount);
            else 
                LatestRequest();
        } 
        else if (mode == 'worker'){
            if(eve.returnValues[2] == web3.utils.asciiToHex('Provider Stopped'))
                ProviderOnlyMy(myAccount);
            else 
                LatestProvider();
        }
    })
})
.catch(function(err){               //failure: no accounts
    console.log(err);
    console.log("Getting accounts failed!");
    console.log("Check your depolyment! ");
    process.exit();
})

/////////////////////////////////////////////////////////////////////////////////////////
//supporting functions below.
//the main 'state-changing' function. --user and --worker have their own func, in pairs.
function userFireMessage(){
    if(!argv['cancel'] && argv['s'] == undefined && argv['u'] == undefined){        //submit a request
        myContract.methods.startRequest(dataID, target, time)
        .send({from: myAccount, gas: 80000000, value: money})
        .then(function(ret){                                                        //handle the receipt
            //console.log("-----------------------------------------------------------------")
            console.log("Using parameters: time = ",time,", target = ",target,", price = ",money);
            console.log("Request Submitted! Block: ",ret.blockNumber);
            console.log("-----------------------------------------------------------------")
            if(argv['recpt'])  console.log("Receipt:    <=====######", ret);
            if(ret.events['SystemInfo'] == undefined) throw 'Submit request failed!'                  
        }).catch(function(err){
            console.log("Check receipt by --recpt");
            process.exit();
        })
    }
    else if(argv['stop'] || argv['s'] != undefined) {                               //cancel a request 
        //TODO: [Important] cancel request need refund (not yet designed), use caution
        myContract.methods.stopRequest(argv['s'])
        .send({from:myAccount, gas:200000})
        .then(function(ret){
            console.log("Cancel Request: Block = ", ret.blockNumber);
            console.log("-----------------------------------------------------------------");
            if(argv['recpt']) console.log("Receipt :    <<====####  ", ret);
            if(ret.events['SystemInfo'] == undefined) throw 'Cancel Request failed! ' 
        }).catch(function(err){         //this poped when trying edit other's config / fired using wrong account
            console.log(err);    
            console.log("Check your reqID by --my");
            process.exit();
        })
    }  
    else {                              // call updateProviding
        //TODO: [Important] update request need refund 
        myContract.methods.updateRequest(time, target, argv['u'])
        .send({from: myAccount, gas: 200000, value: money})
        .then(function(ret){
            console.log("Update request: Block = ", ret.blockNumber);
            console.log("Using parameters: time = ",time,", target = ",target,", price = ",money);
            console.log("-----------------------------------------------------------------");
            if(argv['recpt']) console.log("Receipt :    <<====####  ", ret);
            if(ret.events['SystemInfo'] == undefined) throw 'Update Request failed!'
        }).catch(function(err){         //this poped when edit other's config / fired using wrong account
            console.log(err);
            console.log("Check your reqID by --my");
            process.exit();
        })
    }  
}
function workerFireMessage(){
    if(!argv['stop'] && argv['s'] == undefined && argv['u'] == undefined){     //start new provider
        myContract.methods.startProviding(maxTime, maxTarget, minPrice)
        .send({from: myAccount, gas: 400000})
        .then(function(ret){
            console.log("Start providing: Block = ", ret.blockNumber);
            console.log("Using parameters: time = ",maxTime,", target = ",maxTarget,", price = ",minPrice);
            console.log("-----------------------------------------------------------------")
            if(argv['recpt']) console.log("Receipt:    <=====###### ", ret);
            if(ret.events['SystemInfo'] == undefined) throw 'Start provider failed!'
        }).catch(function(err){
            console.log(err);
            console.log("Check receipt by --recpt");          
            process.exit();
        })
    } 
    
    else if(argv['stop'] || argv['s'] != undefined) {                           // call stopProviding
        myContract.methods.stopProviding(argv['s'])
        .send({from:myAccount, gas:200000})
        .then(function(ret){
            console.log("Stop providing: Block = ", ret.blockNumber);
            console.log("-----------------------------------------------------------------");
            if(argv['recpt']) console.log("Receipt :    <<====####  ", ret);
            if(ret.events['SystemInfo'] == undefined) throw 'Stop provider failed!' 
        }).catch(function(err){
            console.log(err);
            console.log("You can only stop your provider. Check your provID by --my");
            process.exit();
        })
    }  
    else {                                  // call updateProviding
        myContract.methods.updateProvider(maxTime, maxTarget, minPrice, argv['u'])
        .send({from: myAccount, gas: 200000})
        .then(function(ret){
            console.log("Update providing: Block = ", ret.blockNumber);
            console.log("Using parameters: time = ",maxTime,", target = ",maxTarget,", price = ",minPrice);
            console.log("-----------------------------------------------------------------");
            if(argv['recpt']) console.log("Receipt :    <<====####  ", ret);
            if(ret.events['SystemInfo'] == undefined) throw 'Update provider failed!'
        }).catch(function(err){
            console.log(err);
            console.log("You can only update your provider. Check your provID by --my");
            process.exit();
        })
    }
}

//list only active pool linked the current account , called by --my
function RequestOnlyMy(myAccount){
    myContract.methods.getRequestPool().call().then(function(pool){
        console.log("Active Request count = ",pool.length);
        console.log("Active Request Pool: ");
        console.log(pool);
        return pool; 
    })
    .then(function(pool){
        myContract.methods.getRequestID(myAccount).call().then(function(IDList){
        console.log("-----------------------------------------------------------------");
        console.log("All my posted Requests: ")
        console.log(IDList);
        console.log("Still active:")
        //pick each one in active pool, see whether fired by me.
        var common = [];
        for(var i = 0; i<pool.length;i++){
            for(var j = 0; j<IDList.length;j++){
                if(pool[i] == IDList[j]) common.push(pool[i])
            }
        }
        console.log(common); 
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
            process.exit();
        })
    })
}
function ProviderOnlyMy(myAccount){
    myContract.methods.getProviderPool().call().then(function(pool){
        console.log("Active Provider count = ",pool.length);
        console.log("Active Provider Pool: ");
        console.log(pool);
        return pool;  
    }).then(function(pool){
        myContract.methods.getProviderID(myAccount).call().then(function(IDList){
            console.log("-----------------------------------------------------------------");
            console.log("All my posted provider: ")
            console.log(IDList);
            console.log("Still active:")
            //pick each one in active pool, see whether fired by me.
            var common = [];
            for(var i = 0; i<pool.length;i++){
                for(var j = 0; j<IDList.length;j++){
                    if(pool[i] == IDList[j]) common.push(pool[i]);
                }
            }
            console.log(common); 
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
            process.exit();
        })
    })
}

//call by --view [--debug]
//list out  Active Count, Total Count, Active Pool, List out Pool item
function PoolRequests (){
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
function PoolProviders (){
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
//list out Total count, Active pool, last item
function LatestRequest(){
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
function LatestProvider(){
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
//the most heavy duty, --all
function AllRequests(){
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
                } else{                     //or simple print: 3 key values 
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
function AllProviders(){
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
                } else{                     //or simple print: 3 key values 
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
///////////////////////////////////////////////////////////////////////////////