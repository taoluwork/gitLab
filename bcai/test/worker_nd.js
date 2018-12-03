//create web3 instance
var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:7545'));

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

console.log(contract.address);