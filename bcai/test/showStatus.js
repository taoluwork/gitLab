var Web3 = require('web3');
var web3 = new Web3('ws://localhost:8545');

var MyContract = require('../build/contracts/TaskContract.json');
var myContract = new web3.eth.Contract(MyContract.abi, MyContract.networks[512].address);


web3.eth.getAccounts().then(function(accounts){
	//print accounts List
	console.log("------------------------------------->Current Accounts:");
	console.log( accounts);


	//get # of providers and print
	myContract.methods.getProviderCount().call().then(function(count){
		console.log("Now total Providers: ",count, "<=======================@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
		
		myContract.methods.listProviders().call({from: accounts[0], gas:8000000}).then(function(proList){
			//format the log
			for (var i = 0;i < count;i++){
				/*if(proList[i]['addr'] != 0){
					console.log("addr = ", proList[i]['addr']);
					console.log("available = ", proList[i]['available']);
				}*/
				console.log(proList[i]);
			}			
		})
	})

	//get # of request and print
	myContract.methods.getRequestCount().call().then(function(count){
		console.log("Now total Requests: ", count, "<=======================@@@@@@@@@@@@@@@@@@@@@@@@@@@");
		
		myContract.methods.listRequests().call().then(function(reqList){
			for(var i = 0;i < count;i++){
				console.log(reqList[i]);
			}
		})	
	})

	

	

	/*myContract.getPastEvents('allEvents',{
		fromBlock: 0,
		toBlock: 'latest'
	}).then(function(eve){
		console.log("All past events: ", eve, "<=======================@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
	})*/
/*
	myContract.methods.getProvider(0).call().then(function(specificPro){
		console.log(specificPro);
	})


	myContract.methods.getRequest(0).call().then(function(specificReq){
		console.log(specificReq);
	})
*/

})
