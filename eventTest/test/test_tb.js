//This si a quick event watching test
var test = artifacts.require("eventTest");
//console.log(test);		//this is contract



contract("eventTest", function(accounts){
/*	it("call the function", function(){
		return test.deployed().then(function(instanc){
			instanc.Test({},function(err,ev){
				console.log(err, ev);
			});

			//console.log(instanc);
			return instanc.eventFire({from: accounts[2]}).then(function(res){
				//console.log(res);
			})
		})
	})

*/
	//it("Note the difference between sendTransaction and .call()");
	//https://truffleframework.com/docs/truffle/getting-started/interacting-with-your-contracts

	it("catch the event", function(){
		//var event = test.Test();
		return test.deployed().then(function(instance){
			//var event = instance.Test
			//console.log(event);
			
			//event("allEvents", function(error, result){
			//	console.log(error, result);
			//});
			//instance.events.


			instance.getPastEvents("allEvents", function(error, result){
				console.log(error, result);
			});

			return instance.eventFire({from: accounts[2]}).then(function(result){
				console.log("fired!", result);
			});
		}).catch(function(err){
			console.log(err);
		})
	});
});

