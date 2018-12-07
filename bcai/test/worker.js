////////////////////////////////////////////////////////////////
//worker's js script
//version: 0.9
//author: taurus tlu4@lsu.edu
//use: $ node worker.js --help / -h
/////////////////////////////////////////////////////////////////

//edit parameter here:
var maxTime = 100000;
var maxTarget = 100;
var minPrice = 50;
var version = "worker.js v0.9.0 by Taurus"
////////////////////////////////////////////////////////////////////


//get arguments from console
var argv = require('minimist')(process.argv.slice(2));
//argument example:
//node worker.js -u 2 -b 3
//{ _: [], u: 2, b: 3 }
//console.log(argv)
if(argv['help'] || argv['h']) {
    console.log("Arguments: ");
    console.log(" -a #    : select accounts[#] / if # > 9 list all");
    console.log(" -s #    : stop   provider # ");
    console.log(" -u #    : update provider # ");
    console.log(" -t #    : time ");
    console.log(" -T #    : target ");
    console.log(" -p #    : price");
    console.log(" --list  : list all current providers / do nothing");
    console.log(" --my    : list all my providers");
    console.log(" --stop  : stop all providers");
    console.log(" --debug : show all details");
    //console.log(" --recpt : transaction receipt");
    //console.log(" --obj   : list provider objects ");
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
////////////////////////////////////////////////////////////////////
//create web3 instance
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));

//get contract instance
//NOTE: this is not quite supported by Node.js
//import TaskContract from '../build/contracts/TaskContract.json';
//use this:
var TaskContract = require('../build/contracts/TaskContract.json');
var abi = TaskContract.abi;
var addr = TaskContract.networks[512].address;
var myAccount;

//note: networkID can be given to ganache by
//ganache-cli -i or --networkId 512
const myContract = new web3.eth.Contract(abi, addr);
web3.eth.getAccounts().then(function(accounts){     //get and use accoutns  
    if (argv['a']>9){                              //list all accounts
        console.log(accounts);
        process.exit();
    }
    if(argv['a'] == undefined) {               //init account using 9 or -a #
        myAccount = accounts[9];
        console.log("-----------------------------------------------------------------")
        console.log('Using default account:9', accounts[9]);
        console.log('You can infer specific account by passing -a #');
    }
    else {
        myAccount = accounts[argv['a']];
        console.log("-----------------------------------------------------------------")        
        console.log('Using account:[',argv['a'], '] ' ,accounts[argv['a']]);
    }
    return accounts;
}).then(function(accounts){


    //call check or not
    if(argv['list'] || argv['my'])  {  //only list providers
        console.log(accounts);
        showProviderInfo();
    }
    //call startProviding
    else if(!argv['stop'] && argv['s'] == undefined && argv['u'] == undefined){     //start new
        myContract.methods.startProviding(maxTime, maxTarget, minPrice)
        .send({from: myAccount, gas: 400000})
        .then(function(ret){
            console.log("Start providing: Block = ", ret.blockNumber);
            console.log("-----------------------------------------------------------------")
            if(argv['recpt']) 
                console.log("Receipt:    <=====###### ", ret);
            else{
                console.log("Event: ", ret.events.ProviderAdded.event)
                console.log(ret.events.ProviderAdded.returnValues)
            }          
        }).then(function(){
            showProviderInfo();
        }).catch(function(){
            console.log("Start provider failed! Check receipt by --recpt");
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
            showProviderInfo();
        }).catch(function(){
            console.log("Stop provider failed! Check your provID by --list");
            process.exit();
        })
    }  
    // call updateProviding
    else { 
        myContract.methods.updateProvider(maxTime, maxTarget, minPrice, argv['u'])
        .send({from: myAccount, gas: 200000})
        .then(function(ret){
            console.log("Update providing: Block = ", ret.blockNumber);
            console.log("-----------------------------------------------------------------");
            if(argv['recpt']) 
                console.log("Receipt :    <<====####  ", ret);
            else {
                console.log("Event: ", ret.events.ProviderUpdated.event)
                console.log(ret.events.ProviderUpdated.returnValues)
            }
        }).then(function(){
            showProviderInfo();
        }).catch(function(){
            console.log("Update provider failed! Check your provID by --list");
            process.exit();
        })
    }
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

    
    //waiting to be triggered:
    //TODO: once or subscribe!
    myContract.once('TaskAssigned',{
        fromBlock: 0,
	    toBlock: 'latest'
    }, function(err, eve){
	    if(err!= null) console.log("ERROR!",err);
	    if(argv['debug']) console.log(eve);
	    else console.log("Task Assigned to Provider", eve.returnValues);
    })
    
})

//console.log(contract.address);
function showProviderInfo(){
//Promise(function(resolve){
    if(argv['my'])  {  //only list providers under MY addr
        myContract.methods.getProviderID(myAccount).call().then(function(IDList){
            console.log("All my posted provider: ")
            console.log(IDList);
            return IDList;
            
        }).then(function(IDList){
            if(argv['debug']){
                myContract.methods.listProviders(IDList).call().then(function(objList){                   
                    console.log("-----------------------------------------------------------------");
                    console.log("Debug details: ");
                    for(var i = 0; i < IDList.length; i++){
                        console.log(objList[i]);
                    }                                      
                })
                .then(function(){
                    process.exit();
                })
            } else process.exit();
        })
    }
    else if(argv['list']){
        myContract.methods.getProviderPoolSize().call().then(function(PoolCount){
            console.log("-----------------------------------------------------");
            console.log("Now active Providers: ",PoolCount);
        }).then(function(){
            myContract.methods.getProviderPool().call().then(function(pool){             
                console.log("Active provider pool: ");
                console.log(pool);
            }).then(function(){
                myContract.methods.getProviderCount().call().then(function(totalCount){
                    console.log("-----------------------------------------------------");
                    console.log("Total provider since start: ", totalCount);
                    return totalCount;
                }).then(function(totalCount){	
                    myContract.methods.listProviders().call().then(function(proList){                          
                        if(totalCount > 0) console.log("List all the Providers: ")
                        //NOTE: difference here: provider only list in the pool
                        for (var i = 0;i < totalCount ;i++){
                            //or print in full
                            if(argv['debug']){
                                console.log(proList[i]);
                            } else{ //simple print:     
                                if(proList[i]['addr'] != 0){
                                    console.log("provD = ", proList[i]['provID']);
                                    console.log("addr = ", proList[i]['addr']);
                                    console.log("available = ", proList[i]['available']);
                                }
                            }
                        }			
                    })
                    //process.exit();
                })
            })
        })
    }
    else{       //not just list, show current status
        myContract.methods.getProviderCount().call().then(function(totalCount){
            console.log("-----------------------------------------------------------------");
            console.log("Total provider count = ",totalCount);
            return totalCount;
        }).then(function(totalCount){
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
                    }).then(function(){
                        if(argv['nl']) process.exit();
                    });
                }
                else if(argv['nl']) process.exit();
                })
            })
    }
}