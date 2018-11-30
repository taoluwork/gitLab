//This si a quick event watching test
var test = artifacts.require("quickTest.sol");

contract("quickTest", function(accounts){
	it("catch the event", function(){
		//var event = test.Test();
		return test.deployed().then(function(instance){
			var event = instance.Test();
			event.watch(function(error, result){
				console.log(error, result);
			});
		});
	});
});

