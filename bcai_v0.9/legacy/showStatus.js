////////////////////////////////////////////////////////////////
//user's js script
//version: 1.9.1
//author: taurus tlu4@lsu.edu
//use: $ node user.js --help
/////////////////////////////////////////////////////////////////
const version = "showStatus.js v1.9.1   compatable with sol v1.9.1   -- by Taurus"
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
    //console.log(" --stop :  stop the current provider")
	process.exit();
}
////////////////////////////////////////////
var Web3, web3, MyContract, myContract;
var myAccounts;

function init() {
	Web3 = require('web3');
	web3 = new Web3('ws://localhost:8545');

	MyContract = require('../client/src/contracts/TaskContract.json');
	myContract = new web3.eth.Contract(MyContract.abi, MyContract.networks[1544726768855].address);
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
	console.log("------------------------------------------------------------> updated: ");
	if (myAccounts != undefined)
		console.log(myAccounts);			//print accounts List //when updating , will be undefined
	if (argv['acc'] || argv['a'] != undefined){
        process.exit();
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
		console.log("Now active Requests:  ", count, "<<=======####");
		myContract.methods.getRequestCount().call().then(function(totalCount){
			console.log("Total Request since start: ", totalCount);
		//}).then(function(){
			if(argv['all'] || argv['debug'] || argv['list']){
				myContract.methods.getRequestPool().call().then(function(reqPool){
					console.log("-----------------------------------------------------");
					console.log("Active request pool: ");
					console.log(reqPool);
					return reqPool;
				})			
				.then(function(reqPool){
					if(argv['list']){
						myContract.methods.listRequests(reqPool).call().then(function(reqList){
							console.log("-----------------------------------------------------");
							if(totalCount > 0) console.log("List all the Requests : ")
							//NOTE: difference request list all history
							for(var i = 0;i < totalCount;i++){
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
					}else if (argv['all']){
						myContract.methods.listAllRequests().call().then(function(allList){
							if(totalCount > 0) 
								console.log("-----------------------------------------------------");	
								console.log("List all the Requests : <++ in history -----------")
							for(var i = 0;i < totalCount;i++){
								if(argv['debug']){
									console.log("##############: ", i, allList[i]);
								} else {
									//simple print:
									if(allList[i]['addr'] != 0){
										console.log("reqID = ", allList[i]['reqID']);
										console.log("addr = ", allList[i]['addr']);
										console.log("provider = ", allList[i]['provider']);							
									}
								}
							}
						})
					}
				})
			}
		})		
	})
}

function showProviders(){
	myContract.methods.getProviderPoolSize().call().then(function(count){
		console.log("Now active Providers: ",count, "<<=======####");
		myContract.methods.getProviderCount().call().then(function(totalCount){
			console.log("Total provider since start: ", totalCount);
		//}).then(function(){
			if(argv['all'] || argv['debug'] || argv['list']){
				myContract.methods.getProviderPool().call().then(function(provPool){
					console.log("-----------------------------------------------------");
					console.log("Active provider pool: ");
					console.log(provPool);
					return provPool;
				}).then(function(provPool){ 
					if(argv['list']){	
						myContract.methods.listProviders(provPool).call().then(function(proList){
							console.log("-----------------------------------------------------");
							if(count > 0) console.log("List all the Providers: ")
							//NOTE: difference here: provider only list in the pool
							for (var i = 0;i < count ;i++){
								//or print in full
								if(argv['debug']){
									console.log(proList[i]);
								} else{
									//simple print:
									if(proList[i]['addr'] != 0){
										console.log("provD = ", proList[i]['provID']);
										console.log("addr = ", proList[i]['addr']);
										console.log("available = ", proList[i]['available']);
									}
								}
							}			
						})
					}else if (argv['all']){
						myContract.methods.listAllProviders().call().then(function(allproList){
							if(totalCount > 0) 
								console.log("-----------------------------------------------------");
								console.log("List all the Providers : <++ in history -----------")
							for(var i = 0;i < totalCount;i++){
								if(argv['debug']){
									console.log("##############: ", i,  allproList[i]);
								} else {
									//simple print:
									if(allproList[i]['addr'] != 0){
										console.log("reqID = ", allproList[i]['reqID']);
										console.log("addr = ", allproList[i]['addr']);
										console.log("provider = ", allproList[i]['provider']);							
									}
								}
							}
						})
					}
				})
			}	
		})
	})
}
