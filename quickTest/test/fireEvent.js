//import MyContract from '../build/contracts/quickTest.json'


let Web3 = require('web3')
let web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'))

let MyContract = require('../build/contracts/quickTest.json')

//console.log(MyContract.abi);
const myContract = new web3.eth.Contract(
  MyContract.abi,
  MyContract.networks[5777].address,
)

///////call cannot trigger th event catcher
myContract.methods.eventFire().call({from: "0x44d3a7ce688a6A7EF5Ea69039Fd301e34420aeDe"}, function(err, res){
    console.log(res);
});

myContract.methods.eventFire().send({from: "0x44d3a7ce688a6A7EF5Ea69039Fd301e34420aeDe"})
.then(function(res){
  console.log(res.returnValues);
});