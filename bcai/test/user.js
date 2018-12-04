//get arguments from console
var argv = require('minimist')(process.argv.slice(2));
//argument example:
//node worker.js -u 2 -b 3
//{ _: [], u: 2, b: 3 }
//console.log(argv['u'])


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
//note: networkID can be given to ganache by

//ganache-cli -i or --networkId 512
const contract = new web3.eth.Contract(abi, addr);
web3.eth.getAccounts().then(function(accounts){     //get and use accoutns
    if(argv['u'] == undefined) {
        var workerAccount = accounts[1];
        console.log('Using default account:1', accounts[1]);
        console.log('You can infer specific account by passing -u #');
    }
    else {
        workerAccount = accounts[argv['u']];
        console.log('Using account:',argv['u'], accounts[argv['u']]);
    }
    
    
    
    var userAccount = accounts[0];

    //create a local request
    var dataID = 11;
    var target = 90;        //this must be less than workders target limt
    var time = 90000;       //this must less than worker's time limit
    var money = 800000;      //this must be greater than worker's price

    //call request task
    contract.methods.requestTask(
        dataID,
        target,
        time
    ).send({from: userAccount, gas: 80000000, value: money})
    .then(function(ret){
        console.log("Request Submitted! Block: ",ret.blockNumber);
	    //console.log("return = ", ret.returnValue);
        
        contract.methods.getRequestCount().call().then(function(ret){
            console.log("Request Count = ", ret);
            })
            
    }).catch(function(err){
        if(err != null) console.log("ERROR", err);
    })
    

    //call taskAssign  -- this is automatically done by contract


    //now catch the event TaskAssigned
    //contract.events.TaskAssigned({
    contract.once('TaskAssigned',{
        fromBlock: 0,
	    toBlock: 'latest'
    }, function(err, eve){
	    if(err!= null) console.log("ERROR!",err);
        console.log("Task Assigned to Provider", eve.returnValues)
            //eve.returnValues['provider'],
            //eve.returnValues['reqID']);
    })
    //.on('data',function(event){
    //    console.log(event);
    //})



})
