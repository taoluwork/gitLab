////////////////////////////////////////////////////////////////
//user's js script
//version: 0.9
//author: taurus tlu4@lsu.edu
//use: $ node user.js -a 4 --debug --help
/////////////////////////////////////////////////////////////////

//get arguments from console
var argv = require('minimist')(process.argv.slice(2));
//argument example:
//node worker.js -u 2 -b 3
//{ _: [], u: 2, b: 3 }
//console.log(argv['u'])
if(argv['help']) {
    //console.log("Arguments: -a # : accounts[#]");
    console.log(" -a list : list all accounts address");
    console.log(" --debug : enable more details");
    //console.log(" --stop :  stop the current provider")
	process.exit();
}

////////////////////////////////////////////
var Web3, web3, MyContract, myContract;
var myAccounts;

function init() {
	Web3 = require('web3');
	web3 = new Web3('ws://localhost:8545');

	MyContract = require('../build/contracts/TaskContract.json');
	myContract = new web3.eth.Contract(MyContract.abi, MyContract.networks[512].address);
}

///////////////////////////////////////////////main
init();
web3.eth.getAccounts().then(function(myAccounts){

//	console.log(testAccounts);
	showCurrentStatus(myAccounts);

	web3.eth.subscribe('newBlockHeaders', function(err, result){
		if(err) console.log("ERRRR", err, result);
		showCurrentStatus();
	})
})
////////////////////////////////////////////////


function showCurrentStatus(myAccounts){
	console.log("------------------------------------------------------------>update: ");
	if (argv['a'] == 'list' || argv['l']){
        console.log(myAccounts);
        process.exit();
    }
	if(myAccounts != undefined){
		//print accounts List
		console.log(myAccounts);
	}
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
	myContract.methods.getRequestPoolSize().call().then(function(count){
		console.log("Now available Requests:  ", count, "<<=======####");
		myContract.methods.getRequestCount().call().then(function(totalCount){
			console.log("Total Request since start: ", totalCount);
		}).then(function(){
			myContract.methods.getRequestPool().call().then(function(res){
				console.log("-----------------------------------------------------");
				console.log("Active request pool: ");
				console.log(res);
			})
			.then(function(){
				myContract.methods.listRequests().call().then(function(reqList){
					console.log("-----------------------------------------------------");
					if(count >0) console.log("List all the Requests : ")
					for(var i = 0;i < count;i++){
						if(argv['debug']){
							console.log(reqList[i]);
						} else {
							//simple print:
							if(reqList[i]['addr'] != 0){
								console.log("reqID = ", reqList[i]['reqID']);
								console.log("addr = ", reqList[i]['addr']);
								console.log("provider = ", reqList[i]['provider']);							
							}
						}
					}
				})				
			})	
		})		
	})
}

function showProviders(){
	myContract.methods.getProviderPoolSize().call().then(function(count){
		console.log("Now available Providers: ",count, "<<=======####");
		myContract.methods.getProviderCount().call().then(function(totalCount){
			console.log("Total provider since start: ", totalCount);
		}).then(function(){
			myContract.methods.getProviderPool().call().then(function(res){
				console.log("-----------------------------------------------------");
				console.log("Active provider pool: ");
				console.log(res);
			}).then(function(){ 	
				myContract.methods.listProviders().call().then(function(proList){
					console.log("-----------------------------------------------------");
					if(count >0) console.log("List all the Providers: ")
					for (var i = 0;i < count;i++){
						//or print in full
						if(argv['debug']){
							console.log(proList[i]);
						} else{
							//simple print:
							if(proList[i]['addr'] != 0){
								console.log("ID = ", proList[i]['providedCount']);
								console.log("addr = ", proList[i]['addr']);
								console.log("available = ", proList[i]['available']);
							}
						}
					}			
				})
			})	
		})
	})
}
