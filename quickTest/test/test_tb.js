//This si a quick event watching test
var test = artifacts.require("quickTest");
//console.log(test);		//this is contract



contract("quickTest", function(accounts){
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

	it("catch the event", function(){
		//var event = test.Test();
		return test.deployed().then(function(instance){
			//var event = instance.Test
			//console.log(event);
			
			//event("allEvents", function(error, result){
			//	console.log(error, result);
			//});
			//instance.events.


			return instance.getPastEvents("allEvents", function(error, result){
				console.log(error, result);
			});

			return instance.eventFire.call().then(function(result){
				console.log("fired!", result);
			});
		});
	});
});

