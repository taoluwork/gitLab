////////////////////////////////////////////////////////////////
//This is a dev tool to monitoring the status of the current contract
//version: 2.0.2, compatable with sol v1.9.2+
//author: taurus tlu4@lsu.edu
//use: $ node user.js --help

// update 2.0.2: add support for ropsten (networkid = 3) via infura
// NOTE: this file did not send transactions, so do not need keystore file

/////////////////////////////////////////////////////////////////
var version = "bcai_client v2.0.1"
var networkID = 512;


//get arguments from console
var argv = require('minimist')(process.argv.slice(2));
//argument example:
//node worker.js -u 2 -b 3
//{ _: [], u: 2, b: 3 }
//console.log(argv['u'])
if(argv['help']) {
    //console.log("Arguments: -a # : accounts[#]");
    console.log(" --acc   : list all accounts address / -a list");
	console.log(" --debug : show all debug details, including object details");
	console.log(" --list  : list minimum object Request and Provider");
	console.log(" --all   : most powerful history tracing option / use with caution");
	console.log(" --ropsten: select ropsten testnet, networkID = 3")
    //console.log(" --stop :  stop the current provider")
	process.exit();
}
if(argv['v'] || argv['version']){
    console.log(version);
    process.exit();
}
////////////////////////////////////////////
var Web3, web3, MyContract, myContract;
var myAccounts;

function init() {
	Web3 = require('web3');
	if (networkID == 512)
		web3 = new Web3('ws://localhost:8545');
	else if (networkID == 3){
		//web3 = new Web3('ws://localhost:8546');
		/*var ws = new Web3.providers.WebsocketProvider('ws://localhost:8546', {
			headers: {Origin: "123"}
		})*/
		var ws = new Web3.providers.WebsocketProvider('wss://ropsten.infura.io/ws/v3/abf67fa0cd9644cbaf3630dd5395104f')
		//console.log(ws);
		web3 = new Web3(ws);
	}
	MyContract = require('../client/src/contracts/TaskContract.json');
	myContract = new web3.eth.Contract(MyContract.abi, MyContract.networks[networkID].address);
	//console.log(MyContract.abi)
	console.log("Current contract address: " + MyContract.networks[networkID].address)
	//console.log (myContract)
}

///////////////////////////////////////////////main
if (argv['ropsten'])
	networkID = 3;
init();
if (networkID == 512){
	web3.eth.getAccounts()
	.then(function(myAccounts){		//resolve
		showCurrentStatus(myAccounts);
		}
	, function(err){				//reject
		console.log("Error: getting accounts, check your testnet",err);
	})	
	.then(function(){
		//  event moniotring [important]
		myContract.events.SystemInfo({
			fromBLock: 0,
			toBlock: 'latest'
		}, function(err, event){
			if(err) console.log(err);
		}).on('data', function(event){
			PrintEvent(event);
		})

		myContract.events.PairingInfo({
			fromBLock: 0,
			toBlock: 'latest'
		}, function(err, event){
			if(err) console.log(err);
		}).on('data', function(event){
			PrintEvent(event);
		})

		//display current status every new block
		web3.eth.subscribe('newBlockHeaders', function(err, result){
			if(err) console.log("ERRRR", err, result);
			console.log("================================================   <- updated! #", result.number);
			showCurrentStatus();
	})
	})
}
else if (networkID == 3){
	console.log("Connecting to Ropsten via ws");
	showCurrentStatus();
}
////////////////////////////////////////////////
function showCurrentStatus(myAccounts){
	if (myAccounts != undefined)
		console.log(myAccounts);			//print accounts List //when updating , will be undefined
	if (argv['acc'] || argv['a'] != undefined){
        process.exit();
    }	
	//get # of providers and print
	//showProviders();
	//get # of request and print
	//showRequests();
	return showStatics().then(function(){
	 	showPools();
	})
}
function showStatics(){		//called yb showCurrentStatus
	return myContract.methods.getRequestCount().call().then(function(totalCount){
		console.log("Total Request since start: ", totalCount.toString());		//totalCount is in BN format
	}).then(function(){
		return myContract.methods.getProviderCount().call().then(function(totalCount){
			console.log("Total provider since start: ", totalCount.toString());
		})
	}).catch(function(){
		console.log("Error: Show status, check your deployment. ")
		process.exit();
	})
}
function showPools(){		//optional [--list] 
	//NOTE: the following 'return' is important, it actually return the promise object
	//this avoid the issue of unhandled promise.
	return myContract.methods.getProviderPool().call().then(function(provPool){
		console.log("=======================================================");
		console.log("Active provider pool: Total = ", provPool.length);
		console.log(provPool);
		return provPool;
	}).then(function(provPool){
		if(argv['list'] && provPool.length >0) return ListoutPool(provPool,'provider');
	}).then(function(){
		return myContract.methods.getPendingPool().call().then(function(reqPool){
			console.log("=======================================================")
			console.log("Pending pool:  Total = ", reqPool.length);
			console.log(reqPool);
			return reqPool;
		})
	}).then(function(reqPool){
		if(argv['list'] && reqPool.length>0) return ListoutPool(reqPool, 'request');
	}).then(function(){
		return myContract.methods.getProvidingPool().call().then(function(providingPool){
			console.log("=======================================================")
			console.log("Providing pool:  Total = ", providingPool.length);
			console.log(providingPool);
			return providingPool;
		})
	}).then(function(providingPool){
		if(argv['list'] && providingPool.length>0)  return ListoutPool(providingPool, 'request');
	}).then(function(){
		return myContract.methods.getValidatingPool().call().then(function(valiPool){
			console.log("=======================================================")
			console.log("Validating pool:  Total = ", valiPool.length);
			console.log(valiPool);
			return valiPool;
			})
	}).then(function(valiPool){
		if(argv['list'] && valiPool.length>0) return ListoutPool(valiPool, 'request');
	}).catch(function(err){
		console.log("Error: show pool error! ", err);
	})
	
}
/*
//[developed] [tested] [deprecated]
function ListAllProvidersInHistory(){
	return myContract.methods.getProviderCount().call().then(function(totalCount){
		//console.log("Total Request since start: ", totalCount);
		return totalCount;
	})
	.then(function(totalCount){
		return myContract.methods.listAllProviders().call().then(function(allproList){
			if(allproList.length > 0) {
				console.log("=====================================================");
				console.log("List all the Providers : <++     ", totalCount, " total in history")
				DisplayNonZeroInList(allproList,'provider');

			}
			else throw 'Get history provider list failed!'		
		})
	})
}
function ListAllRequestsInHistory(){
	return myContract.methods.getRequestCount().call().then(function(totalCount){
		//console.log("Total Request since start: ", totalCount);
		return totalCount;
	})
	.then(function(totalCount){
		return myContract.methods.listAllRequests().call().then(function(allReqList){
			if(allReqList.length > 0) {
				console.log("=====================================================");
				console.log("List all the Requests : <++     ", totalCount, " total in history")
				DisplayNonZeroInList(allReqList,'request');
				// for(var i = 0;i < allReqList.length;i++){
				// 	if(allReqList[i]['addr'] != 0){
				// 		if(argv['debug']){
				// 			console.log("-----------------------------------------------------");
				// 			console.log("##############: ", i, allReqList[i]);
				// 		} else {
				// 			//simple print:						
				// 			console.log("-----------------------------------------------------");
				// 			console.log("reqID = ", allReqList[i]['reqID']);
				// 			console.log("addr = ", allReqList[i]['addr']);
				// 			console.log("provider = ", allReqList[i]['provider']);
				// 			console.log("status = ",  allReqList[i]['status'])							
				// 		}
				// 	}
				// }
			}
			else throw 'Get history provider list failed!'
		})
	})
}
*/
/////////// Display helpers / format ////////////////////////////////////////////////////
function PrintEvent(event){
	if(argv['debug']){	
		console.log("=======================================================  <- Event!");
		console.log(event);
		console.log("=================================================================");
	} else { 
		console.log("=======================================================  <- Event!");
		console.log(event.event, "  ==>  ", event.blockNumber);
		if(event.event == 'SystemInfo')
			console.log("Event: ", web3.utils.hexToAscii(event.returnValues[1]));
		else if (event.event == 'PairingInfo')
			console.log("Event: ", web3.utils.hexToAscii(event.returnValues[2]));
		console.log(event.returnValues);
	}
}
function DisplayNonZeroInList(List, type){
	if(type == 'request')
		for(var i = 0;i < List.length;i++){
			//console.log("status",List[i]['status'])
			if(List[i]['status'] != 0x00){
				if(argv['debug']){
					console.log(List[i]);
					console.log("-----------------------------------------------------")
				} else {
					//simple print:
					console.log("reqID = ", List[i]['reqID']);
					console.log("provider = ", List[i]['provider']);
					console.log("status = ",  List[i]['status']);
					console.log("-----------------------------------------------------")							
				}
			}
		}
	else if (type == 'provider')
		for (var i = 0;i < List.length ;i++){
			if(List[i]['available'] != false){
				if(argv['debug']){
					console.log(List[i]);
					console.log("-----------------------------------------------------")
				} else{
					console.log("provD = ", List[i]['provID']);
					//console.log("addr = ", List[i]['addr']);
					console.log("available = ", List[i]['available']);
					console.log("-----------------------------------------------------")
				}
			}
		}
	else throw 'Not supported type for display'	
}
//helper function called by showPools(), using pool to get object List
function ListoutPool(Pool,type){		//--list [--debug]
	//console.log("List out Pool")
	if (type == 'provider'){
		return myContract.methods.listProviders(Pool).call()
		.then(function(proList){
			console.log("-----------------------------------------------------")
			DisplayNonZeroInList(proList,'provider');
		})
	}
	else if (type == 'request'){
		return myContract.methods.listRequests(Pool).call()
		.then(function(List){
			console.log("-----------------------------------------------------")
			DisplayNonZeroInList(List,'request');
		})
	}
	else throw "Not supported type!"
}