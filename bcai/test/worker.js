//get arguments from console
var argv = require('minimist')(process.argv.slice(2));
//argument example:
//node worker.js -u 2 -b 3
//{ _: [], u: 2, b: 3 }
//console.log(argv)
if(argv['help']) {
	console.log("Arguments: -a # : accounts[#]");
	process.exit();
}

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
//note: networkID can be given to ganache by

//ganache-cli -i or --networkId 512
const contract = new web3.eth.Contract(abi, addr);
web3.eth.getAccounts().then(function(accounts){     //get and use accoutns
    //init account
    if(argv['a'] == undefined) {
        var workerAccount = accounts[8];
        console.log('Using default account:9', accounts[9]);
        console.log('You can infer specific account by passing -u #');
    }
    else {
        workerAccount = accounts[argv['a']];
        console.log('Using account:',argv['u'], accounts[argv['u']]);
    }
    
        //create a local table
    var maxTime = 100000;
    var maxTarget = 100;
    var minPrice = 50;

    //call startProviding
    contract.methods.startProviding(
        maxTime, 
        maxTarget, 
        minPrice)
        .send({from: workerAccount, gas: 800000})
    .then(function(ret){
        if(argv['debug']) console.log(ret);
	    else console.log("start providing: Block = ", ret.blockNumber);
        
	contract.methods.getProviderCount().call().then(function(ret){
            console.log("Provider count = ",ret);
        })
    })
    
    contract.methods.getProvider(workerAccount).call().then(function(ret){
	    console.log(ret);
	   });

    console.log("start listening...");

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



    contract.once('TaskAssigned',{
        fromBlock: 0,
	    toBlock: 'latest'
    }, function(err, eve){
	    if(err!= null) console.log("ERROR!",err);
	    if(argv['debug']) console.log(eve);
	    else console.log("Task Assigned to Provider", eve.returnValues);
    })


})

//console.log(contract.address);
