//import MyContract from '../build/contracts/quickTest.json'


let Web3 = require('web3')
let web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'))

let MyContract = require('../build/contracts/eventTest.json')

//console.log(MyContract.abi);
const myContract = new web3.eth.Contract(
  MyContract.abi,
  MyContract.networks[512].address,
)

///////call cannot trigger th event catcher
//myContract.methods.eventFire().call({from: accounts[0]}, function(err, res){
//    console.log(res);
//});

web3.eth.getAccounts().then(function(accounts){

  //console.log(accounts);

  myContract.methods.eventFire().send({from: accounts[1]})
  .then(function(res){
    console.log(res.events);
  });
  
  myContract.methods.eventFire().call()
  .then( function(ret){
        console.log(ret);
  });
})


