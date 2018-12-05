//control center v0.1
//author:

////////////////////////////////////////////
var Web3, web3, MyContract, myContract;
var testAccounts;

function init() {
	Web3 = require('web3');
	web3 = new Web3('ws://localhost:8545');

	MyContract = require('../build/contracts/TaskContract.json');
	myContract = new web3.eth.Contract(MyContract.abi, MyContract.networks[512].address);
}

///////////////////////////////////////////////main
init();
web3.eth.getAccounts().then(function(testAccounts){

//	console.log(testAccounts);
	showCurrentStatus(testAccounts);

	web3.eth.subscribe('newBlockHeaders', function(err, result){
		if(err) console.log("ERRRR", err, result);
		showCurrentStatus();
	})
})
////////////////////////////////////////////////


function showCurrentStatus(testAccounts){
		//print accounts List
		console.log("------------------------------------->Current Accounts:");
		console.log(testAccounts);

		//get # of providers and print
		showProviders();

		//get # of request and print
		showRequest();
		

		

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

}



function showRequest(){
	myContract.methods.getRequestCount().call().then(function(count){
		console.log("Now total Requests: ", count, "<=======================@@@@@@@@@@@@@@@@@@@@@@@@@@@");
		
		myContract.methods.getRequestPool().call().then(function(res){
			console.log("Active request pool: ");
			console.log(res);
		}) 
		
		myContract.methods.listRequests().call().then(function(reqList){
			//console.log(reqList);
			console.log("Listing the Requests    <===============================@@@@@@@@@@@@@@@@@")
			for(var i = 0;i < count;i++){
				console.log(reqList[i]);
			}
		})	
	})
}

function showProviders(){
	myContract.methods.getProviderCount().call().then(function(count){
		console.log("Now total Providers: ",count, "<=======================@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
		
		myContract.methods.getProviderPool().call().then(function(res){
			console.log("Active provider pool: ");
			console.log(res);
		}) 

		myContract.methods.listProviders().call({from: testAccounts[0], gas:8000000}).then(function(proList){
			//console.log(proList);
			console.log("Listing the Providers    <===============================@@@@@@@@@@@@@@@@@")
			//format the log
			for (var i = 0;i < count;i++){
				//simple print:
				/*if(proList[i]['addr'] != 0){
					console.log("addr = ", proList[i]['addr']);
					console.log("available = ", proList[i]['available']);
				}*/
				//or print in full
				console.log(proList[i]);
			}			
		})
		
	})
}
