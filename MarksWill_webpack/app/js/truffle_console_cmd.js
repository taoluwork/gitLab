const truffleContract = require("truffle-contract");
//const willJson = require("../../build/contracts/MarksWill.json");
const willJson = require("./build/contracts/MarksWill.json");
const Will = truffleContract(willJson);
Will.setProvider(web3.currentProvider);
Will.deployed().then(_deployed => {will = _deployed;});
will.sendTransaction({from:web3.eth.accounts[0],gas:90000, value: web3.toWei('1','ether')});
will.addFund.sendTransaction({from:web3.eth.accounts[0],gas:90000, value: web3.toWei('1','ether')});

web3.eth.getBalance(web3.eth.accounts[0]);

web3.eth.getBalance(will.address);