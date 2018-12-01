

//import MyContract from '../build/contracts/quickTest.json'


let Web3 = require('web3')
let web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'))

let MyContract = require('../build/contracts/quickTest.json')

//console.log(MyContract.abi);
const myContract = new web3.eth.Contract(
  MyContract.abi,
  MyContract.networks[5777].address
  //{from: "0x0F658F24CFdf2C3F89c58cad153ce3A1023C270A", gas: 8000000, gasPrice: 123}
)
/*
web3.eth.subscribe('newBlockHeaders', function (error, blockHeader) {
    if (error) console.log(error)
    console.log(blockHeader)
  })
    .on('data', function (blockHeader) {
      // alternatively we can log it here
      console.log(blockHeader)
    })

    myContract.events.allEvents({
        fromBlock: 0
      }, function (error, event) {
        if (error) console.log(error)
        console.log(event)
      })
*/

//var abi = MyContract.abi;
//var LocContract = web3.eth.contract(abi);
//var locContract = LocContract.at(MyContract.networks[5777].address);
//console.log(myContract.events.Test());

myContract.events.Test({},function(error, eve){
    console.log(eve);
}).on('data',function(event){
    console.log(event);
})