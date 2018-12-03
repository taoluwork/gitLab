var BCAI = artifacts.require("TaskContract");


contract('workerClientTest', function(accounts) {
    const bcai = BCAI.deployed();
    //console.log(accounts);
    it("Test 1: Deployment", function(){
        //console.log(bcai);
        return bcai.then(instance=>{
            assert(instance != null);
        });
    });


    //remember transaction and call are totally defferent.
    //call is read-only and tx can write
    //see details: https://truffleframework.com/docs/truffle/getting-started/interacting-with-your-contracts

    it("Test 2: StartProviding", function(){
        //console.log(accounts);
        return bcai.then(instance1=>{
            //console.log(instance1)
            return instance1.startProviding(11,23,100,{from: accounts[1]}).then(result1=>{
                //console.log('sender: ', accounts[1]);
                //console.log(result1.receipt);
                instance1.getProviderID.call(accounts[1]).then(result=>{
                    console.log(result);
                    instance1.getProvider.call(result).then(fresult=>{
                        console.log(fresult);
                    })
                });
                //console.log(instance1.balance);
                
                //assert.isFalse(result1);   
            });
        });
    });

    it("Test 3: Waiting for being assigned", function(){
        return bcai.then(instance1=>{
        /*  var event = instance1.TaskAssigned();
            event.watch((error, result)=>{
            if(!error)
                alert("wait for a while");
                console.log(result);
            });
            deprecated*/
            

            var event = instance1.TaskAssigned();
            
            event.on("data",function(result){
                console.log(result.event);
            });

            instance1.testTask({from: accounts[3]});

            /*
            instance1.TaskAssigned(function(data){
                console.log(data);
            })

            instance1.allEvents().on("data",function(result){
                console.log(result);
            });*/

        
            

        //    return instance1.assignTask().then(result=>{
        //        console.log("emitted");
        //    });

        });
         
    });
});