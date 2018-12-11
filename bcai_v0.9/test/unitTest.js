////////////////////////////////////////////////////////////////
//unit test
//version: 0.9.4
//author: taurus tlu4@lsu.edu
/////////////////////////////////////////////////////////////////
const version = "unitTest v0.9.4   work with bcai_0.9.4  ----  by Taurus"
const NetworkID = 512;
//NOTE: combine user and worker client together switch using --user, --worker
//Avoid using version earlier than 0.9.2
/////////////////////////////////////////////////////////////////
//edit default parameter here:
var dataID = 31415926;
var target = 90;            //must < workders maxTarget
var time = 90000;           //must < worker's maxTime
var money = 800000;         //must > worker's minPrice
var maxTime = 100000;
var maxTarget = 99;
var minPrice = 500000;
var mode;                   // = 'user';      //default mode: no
var testAccounts;              // default set below\
////////////////////////////////////////////////////////////////
var argv = require('minimist')(process.argv.slice(2));
if(argv['v'] || argv['version']){
    console.log(version);
    process.exit();
}
///////////////////////////////////////////////////////////////////////////
//create web3 instance
var Web3 = require('web3');
//use websocket provider here, NOTE: http is deprecated.
var web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));
//get contract instance
var TaskContract = require('../build/contracts/TaskContract.json');
var abi = TaskContract.abi;
var addr = TaskContract.networks[NetworkID].address;        //align to const ID defination on top

const myContract = new web3.eth.Contract(abi, addr);
//console.log(myContract);
return web3.eth.getAccounts().then(function(accounts){
	testAccounts = accounts;
    console.log(accounts);
})
//////////////////////////////////////////////////////////////////////////
//main
//startProviding
.then(function(){
    return myContract.methods.startProviding(9000, 20, 800000) //time, target , money
	.send({
		from: testAccounts[1],
		gas: 1200000
	})
    .then(function(ret){
        console.log("------------------------------------------------------------")
        console.log("Send transaction from [0]: startProviding")
        console.log(ret);
        showPools();
    })
})
//updateProviding
//stopProviding

//startRequest
.then(function(){
    return myContract.methods.startRequest(12151231, 30 , 8000) //dataID target time
    .send({
        from:testAccounts[8],
        gas:120000,
        value: 1200000 //money
    })
    .then(function(ret){
        console.log("------------------------------------------------------------")
        console.log("Send transaction from [9]: startRequest")
        console.log(ret);
        console.log("This should be an auto assignment")
        showPools();
    })
}).catch(function(err){
	console.log(err);
})

//updateRequest
//stopRequest

//assignProvider
//assignRequest

//completeRequest


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
		return myContract.methods.getRequestPool().call().then(function(reqPool){
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
		if(argv['list'] && providingPool.length>0) return ListoutPool(providingPool, 'request');
	}).then(function(){
		return myContract.methods.getValidatingPool().call().then(function(valiPool){
			console.log("=======================================================")
			console.log("Validating pool:  Total = ", valiPool.length);
			console.log(valiPool);
			return valiPool;
			})
	}).then(function(valiPool){
		if(argv['list'] && valiPool.length>0) return ListoutPool(valiPoolPool, 'request');
	})
	
}
//[developed] [tested]
function ListAllProvidersInHistory(){
	return myContract.methods.getProviderCount().call().then(function(totalCount){
		//console.log("Total Request since start: ", totalCount);
		return totalCount;
	})
	.then(function(totalCount){
		return myContract.methods.listAllProviders().call().then(function(allproList){
			if(allproList.length > 0) {
				console.log("=====================================================");
				//console.log("-----------------------------------------------------");
				console.log("List all the Providers : <++     ", totalCount, " total in history")
				DisplayNonZeroInList(allproList,'provider');
				// for(var i = 0;i < allproList.length;i++){
				// 	if(allproList[i]['addr'] != 0){
				// 		if(argv['debug']){
				// 			console.log("-----------------------------------------------------");
				// 			console.log("##############: ", i,  allproList[i]);
				// 		} else {
				// 			//simple print:	
				// 			console.log("-----------------------------------------------------");
				// 			console.log("provID = ", allproList[i]['provID']);
				// 			console.log("addr = ", allproList[i]['addr']);
				// 			console.log("available = ", allproList[i]['available']);							
				// 		}
				// 	}
				// }
			}
			else throw 'Get history provider list failed!'		
		})
	})
}
