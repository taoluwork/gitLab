////////////////////////////////////////////////////////////////
//user's js script
//version: 0.9
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
    console.log("Arguments: -a # : accounts[#]");
    console.log(" -a list : list all accounts address");
    console.log(" --debug : enable more details");
    //console.log(" --stop :  stop the current provider")
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
//note: networkID can be given to ganache by

//ganache-cli -i or --networkId 512
const myContract = new web3.eth.Contract(abi, addr);
web3.eth.getAccounts().then(function(accounts){     //get and use accoutns
    //list all accounts
    if (argv['a'] == 'list'){
        console.log(accounts);
        process.exit();
    }
    else if(argv['a'] == undefined) {
        var myAccount = accounts[0];
        console.log('Using default account:0', accounts[0]);
        console.log('You can infer specific account by passing -a #');
    }
    else {
        myAccount = accounts[argv['a']];
        console.log('Using account:',argv['a'], accounts[argv['a']]);
    }

    //call request task
    myContract.methods.requestTask(
        dataID,
        target,
        time
    ).send({from: myAccount, gas: 80000000, value: money})
    .then(function(ret){
        console.log("Request Submitted! Block: ",ret.blockNumber);
	    //console.log("return = ", ret.returnValue);
    }).then(function(){
        myContract.methods.getRequestCount().call().then(function(ret){
            console.log("Request Count = ", ret);
        })          
    }).catch(function(err){
        if(err != null) console.log("ERROR", err);
    })


    

    //call taskAssign  -- this is automatically done by contract


    //now catch the event TaskAssigned
    //myContract.events.TaskAssigned({
    myContract.once('TaskAssigned',{
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
