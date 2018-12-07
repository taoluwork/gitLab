////////////////////////////////////////////////////////////////
//worker's js script
//version: 0.9
//author: taurus tlu4@lsu.edu
//use: $ node worker.js --help
/////////////////////////////////////////////////////////////////

//edit parameter here:
var maxTime = 100000;
var maxTarget = 100;
var minPrice = 50;
////////////////////////////////////////////////////////////////////


//get arguments from console
var argv = require('minimist')(process.argv.slice(2));
//argument example:
//node worker.js -u 2 -b 3
//{ _: [], u: 2, b: 3 }
//console.log(argv)
if(argv['help']) {
    console.log("Arguments: -a # : accounts[#] / -a list : for all accounts");
    console.log(" --stop  : stop the current provider");
    console.log(" --debug : enable all details");
    //console.log(" --recpt : transaction receipt");
    //console.log(" --obj   : list provider objects ");
    console.log(" --nl    : no listening for events (default will do)")
	process.exit();
}

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
    //list all accounts
    if (argv['a'] == 'list'){
        console.log(accounts);
        process.exit();
    }
    //init account
    else if(argv['a'] == undefined) {
        myAccount = accounts[9];
        console.log('Using default account:9', accounts[9]);
        console.log('You can infer specific account by passing -a #');
    }
    else {
        myAccount = accounts[argv['a']];
        console.log('Using account:[',argv['a'], '] ' ,accounts[argv['a']]);
    }
    
    

    //call startProviding
    if(!argv['stop']){      //start
        myContract.methods.startProviding(maxTime, maxTarget, minPrice)
        .send({from: myAccount, gas: 400000})
        .then(function(ret){
            console.log("-----------------------------------------------------------------")
            console.log("start providing: Block = ", ret.blockNumber);
            if(argv['recpt'] || argv['debug']) console.log("Receipt:    <=====###### ", ret);
        //}).then(function(){
        //    showProviderInfo();
        })
    } else {//stop 
        myContract.methods.startProviding_2(maxTime, maxTarget, minPrice)
        .send({from:myAccount, gas:200000})
        .then(function(ret){
            if(argv['debug'] || argv['recpt']) console.log("Receipt :    <<====####  ", ret);
        //}).then(function(){
        //    showProviderInfo();
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
    myContract.methods.getProviderCount().call().then(function(ret){
        console.log("-----------------------------------------------------------------");
        console.log("Provider count = ",ret);
    })
    .then(function(){
    //get Provider pool     
        myContract.methods.getProviderPool().call().then(function(ret){
            console.log("-----------------------------------------------------------------");
            console.log("Provider Pool: ");
            console.log(ret);   
        })
    }).then(function(prov){
        //print provider detals (object)
        if(argv['obj'] || argv['debug']){
            myContract.methods.getProvider(myAccount).call().then(function(ret){
                console.log("-----------------------------------------------------------------");
                console.log(ret);
            });
        }
    }).then(function(){
        if(argv['nl']) process.exit();
    })
}