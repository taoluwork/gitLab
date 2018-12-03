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
    var myAccount = accounts[1];

    //create a local request
    var dataID = 11;
    var target = 90;        //this must be less than workders target limt
    var time = 90000;       //this must less than worker's time limit
    var money = 8000000;      //this must be greater than worker's price

    //call request task
    contract.methods.requestTask(
        dataID,
        target,
        time
    ).send({from: myAccount, value: money})
    .then(function(ret){
        console.log("Fired a task request! ",ret.blockNumber)
    }).catch(function(err){
        console.log("ERROR", err)
    })
    
    //call taskAssign  -- this is automatically done by contract





})