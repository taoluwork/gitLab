
let Web3 = require('web3')
let web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'))

let MyContract = require('../build/contracts/quickTest.json')

//console.log(MyContract.abi);
const myContract = new web3.eth.Contract(
  MyContract.abi,
  MyContract.networks[5777].address,
)
//console.log(MyContract.networks[5777]);
describe("hahah", function(){

myContract.getPastEvents("allEvents",function(err, msg){
    console.log(msg);
}).then(function(eve){console.log(eve)});

myContract.events.Test({},function(err, msg){
    console.log(msg);
}).on("data",function(eve){console.log(eve)});

});