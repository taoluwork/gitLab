//This si a quick event watching test
var test = artifacts.require("eventTest");
//console.log(test);		//this is contract



contract("eventTest", function(accounts){
	it("call the function", function(){
		return test.deployed().then(function(instanc){
			//console.log(instanc);
			return instanc.eventFire({from: accounts[2]}).then(function(res){
				console.log(res);
			})
		})
    })
});