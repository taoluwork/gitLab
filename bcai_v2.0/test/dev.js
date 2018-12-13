var Web3 = require('web3');
var web3 = new Web3('ws://localhost:8545');

var MyContract = require('../build/contracts/TaskContract.json');
var myContract = new web3.eth.Contract(MyContract.abi, MyContract.networks[512].address);

var func = myContract.methods;
console.log("deployed!");
myContract.methods.listRequest().call().then(function(res){
	console.log(res);
})

