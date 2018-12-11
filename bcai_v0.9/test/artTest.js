//need a truffle environment to run this

var BCAI = artifacts.require("TaskContract");

contract("BCAI", function(accounts) {
    console.log(accounts);
    it("should have one provider", function() {
        var myContract;
        var eventData;

        return BCAI.deployed().then(function(instance) {
            myContract = instance;
            return myContract.startProviding(100,100,100, {from: accounts[2]}).then(function(ret){
                console.log(ret);
            });

            bcaiContract.events.TaskAssigned({
                fromBlock: 0,
                toBlock: 'latest'
            }, function(error, result){
                if (error) {
                    console.log(error);
                }
                console.log("TaskAssigned!", result.returnValue);
            });
        
        // }).then(function() {
        //     //Begins after startProviding tx has been mined
        //     return bcaiContract.getProvider.call(0,{from: accounts[1]});
        // }).then(function(result) {
        //     assert.equal(result, accounts[2], "provider start fail!");
        // })
        })
    })

    
})
            /*   
            
            //Begins after getCount tx has been mined and we have the data
            var [reqCount, provCount, numProv] = result;
            
            // Now we have all the data we need to begin the tests.
            assert.equal(reqCount, 0, "Requests made should be 0");
            assert.equal(provCount, 0, "Requests made should be 0");
            assert.equal(numProv, 1, "Requests made should be 1");
            bcaiContract.stopProviding();
        }).then(function() {
            return bcaiContract.getCount().call();
        }).then(function(result) {
            var [reqCount, provCount, numProv] = result;
            assert.equal(numProv, 0, "Requests made should be 00000");
        }).then(function() {
            return bcaiContract.startProviding(1,1,1, {from: accounts[1]});
        }).then(function() {
            return bcaiContract.getProv.call(0);
        }).then(function(result) {
            var prov = result;
            console.log(prov);
            outcome = bcaiContract.requestTask(100,1,1, {from: accounts[2], value: web3.toWei(10, "ether")});
            return outcome;
        }).then(function(result) {
            console.log('here is the result ;alskjdf;alsdkfj ');
            console.log(result);
            return bcaiContract.getCount.call();
        }).then(function(result) {
            var [reqCount, provCount, numProv] = result;
            assert.equal(numProv, 1, "there shud b 1 prov");
            assert.equal(reqCount, 1, "Requests made should be 1");
        });
    });
});
*/
