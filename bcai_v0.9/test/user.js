////////////////////////////////////////////////////////////////
//user's js script
//version: 0.9.1
//author: taurus tlu4@lsu.edu
//use: $ node user.js -a 4 --debug --help
/////////////////////////////////////////////////////////////////

//edit parameter here:
var dataID = 11;
var target = 90;        //this must be less than workders target limt
var time = 90000;       //this must less than worker's time limit
var money = 800000;      //this must be greater than worker's price
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
    //console.log(" --stop :  stop the current provider")
    console.log(" --nl    : no listening for events (default will do)")
	process.exit();
}
if(argv['v'] || argv['version']){
    console.log(version);
    process.exit();
}
if(argv['t'] != undefined) maxTime = argv['t'];
if(argv['T'] != undefined) maxTime = argv['T'];
if(argv['p'] != undefined) maxTime = argv['p'];
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
    if (argv['a'] > 9){     //list all accounts
        console.log(accounts);
        process.exit();
    }
    else if(argv['a'] == undefined) {
        myAccount = accounts[0];
        console.log('Using default account: [0]', accounts[argv['a']]);
        console.log('You can infer specific account by passing -a #');
    }
    else {
        myAccount = accounts[argv['a']];
        if (myAccount == undefined) throw 'setting account error!';
        console.log("-----------------------------------------------------------------")
        console.log('Using account: [',argv['a'], '] ', myAccount);
    }
    return accounts;
}).then(
    function(accounts){         //success
        if (argv['all']){
            console.log(accounts);
            listAllRequests();
        }
        else if (argv['my'])
            listRequestOnlyMy(myAccount);
        else if (argv['view']){
            console.log(accounts); 
            listPoolRequests();
        }
        else 
            fireMessage();
    },
    function(err){     //failre
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

function fireMessage(){
    //call request task
    if(!argv['cancel']){        //submit a request
        myContract.methods.requestTask(dataID, target, time)
        .send({from: myAccount, gas: 80000000, value: money})
        .then(function(ret){
            console.log("-----------------------------------------------------------------")
            console.log("Request Submitted! Block: ",ret.blockNumber);
            //console.log("return = ", ret.returnValue);
            if(argv['recpt']!= 0 && argv['recpt']!=undefined) 
                console.log("Receipt:    <=====######", ret);
            else if (argv['recpt'] !=0){
                console.log("Event: ", ret.events.RequestAdded.event)
                console.log(ret.events.RequestAdded.returnValues)
            }
        }).then(function(){
            showLatestRequest();          
        }).catch(function(){
            console.log("Submit request failed! Check receipt by --recpt");
            process.exit();
        })
    } else {
        //cancel TOD:
        showLatestRequest();
    }    
    //call taskAssign  -- this is automatically done by contract


    //now catch the event TaskAssigned
    //myContract.events.TaskAssigned({
    myContract.once('TaskAssigned',{
        fromBlock: 0,
	    toBlock: 'latest'
    }, function(err, eve){
	    if(err!= null) console.log("ERROR!",err);
        console.log("Task Assigned to Provider", eve.returnValues)
    })
}

//called by --my
function listRequestOnlyMy(myAccount){
    myContract.methods.getRequestID(myAccount).call().then(function(IDList){
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
    }, function(){
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
    }).then(function(pool){       
        myContract.methods.getRequestCount().call().then(function(totalCount){            
            console.log("Total Request since start = ", totalCount);
            return pool;
        }).then(function(){	        
            myContract.methods.getRequestPool().call().then(function(pool){             
                console.log("Active Request pool: ");
                console.log(pool);
                return pool;
            }).then(function(pool){	
                myContract.methods.listRequests(pool).call().then(function(proList){                          
                    if(pool.length > 0) {
                        console.log("-----------------------------------------------------");
                        console.log("List all the Requests in Pool: ")
                    }
                    for (var i = 0;i < pool.length ;i++){
                        if(argv['debug']){          //in a detail pattern
                            console.log(proList[i]);
                        } else{                     //or simple print:    3 key values 
                            if(proList[i]['addr'] != 0){
                                console.log("reqID = ", proList[i]['reqID']);
                                console.log("addr = ", proList[i]['addr']);
                                console.log("provider = ", proList[i]['provider']);
                            }
                        }
                    }		
                })
                .catch(function(){      //catch any error at end of .then() chain!
                    console.log("List Pool Request Info Failed! ")
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

//the most heavy duty
function listAllRequests(){
    myContract.methods.getRequestCount().call().then(function(totalCount){
        console.log("-----------------------------------------------------");
        console.log("Total Request since start = ", totalCount);
        return totalCount;
    }).then(function(totalCount){	
        myContract.methods.listAllRequests().call().then(function(proList){                          
            if(totalCount > 0) console.log("List all the Requests in History:   <<======####")
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
        .catch(function(){      //catch any error at end of .then() chain!
            console.log("List Request History Info Failed! ")
            process.exit();
        })               
    })
}