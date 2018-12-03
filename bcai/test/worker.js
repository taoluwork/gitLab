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
    var myAccount = accounts[8];

    //create a local table
    var maxTime = 100000;
    var maxTarget = 100;
    var minPrice = 50;

    //call startProviding
    contract.methods.startProviding(
        maxTime, 
        maxTarget, 
        minPrice)
        .send({from: myAccount, gas: 800000})
    .then(function(ret){
        console.log("start providing: ", ret.blockNumber);
    })

    console.log("start listening...");

    //wait until to be assigned.
    contract.events.TaskAssigned({
        fromBlock: 0,
        toBlock: 'latest'
    }, function(err, ret){
        console.log(err, ret.returnValue);
    })
})

//console.log(contract.address);