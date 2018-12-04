

//import MyContract from '../build/contracts/quickTest.json'


let Web3 = require('web3')
let web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'))

let MyContract = require('../build/contracts/eventTest.json')

//console.log(MyContract.abi);
const myContract = new web3.eth.Contract(
  MyContract.abi,
  MyContract.networks[512].address
  //{from: "0x0F658F24CFdf2C3F89c58cad153ce3A1023C270A", gas: 8000000, gasPrice: 123}
)
//subscription
web3.eth.subscribe('logs', {
  address: '0x5f108e4dbc3f4b622f7294c32f7389c0b3eeeb3e'
}, function (error, blockHeader) {
    if (error) console.log(error)
    console.log(blockHeader)
})


//once triggered only 'once'
yContract.once('Test_1', {
  //filter: {myIndexedParam: [20,23], myOtherIndexedParam: '0x1234'},
  fromBlock: 0,
  toBlock: 'latest'
}, function (err, eventmsg) {
  // alternatively we can log it here
  console.log(err, eventmsg)
})

//subscribe some user defined events
myContract.events.Test_1({
//myContract.events.allEvents({
  fromBlock: 0,
  toBlock: 'latest'
  }, function (error, event) {
    if (error) console.log(error);
      console.log(event.returnValues);
    })

//getting the events in the past

myContract.getPastEvents('allEvents',{
    fromBlock:0,
    toBlock: 'latest'
  }).then(function(eve){
    console.log(eve);
})

  
//var abi = MyContract.abi;
//var LocContract = web3.eth.contract(abi);
//var locContract = LocContract.at(MyContract.networks[5777].address);
//console.log(myContract.events.Test());




