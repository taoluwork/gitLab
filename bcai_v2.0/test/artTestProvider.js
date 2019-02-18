//////////////////////////////////////////////////////////////////////////
// Unit test in truffle environment                                     //
// version 2.0.0                                                        //  
// Align with sol 2.0.1                                                 //
// Author: Samuel Pritchett                                             //  
//////////////////////////////////////////////////////////////////////////


//need a truffle environment to run this
//use: truffle test uintTest.js
var BCAI = artifacts.require("TaskContract");
//npm install -g truffle-assertions
const truffleAssert = require('truffle-assertions');
//npm install -g bignumber.js
var BigNumber = require('bignumber.js') //not used use web3.utils.BN [important]
//handle the BN is essential
var BN = web3.utils.toBN;
var totalGas = 0;
var showGas = true;

contract("BCAI", function(accounts) {
    it("Contract Deploymnet", function(){
        console.log(accounts);
        if(accounts != undefined) return true;
        else return false;
    })
    ///////////////////////////////////////////////////////////////////////////////
    it("Account 0 Starts Providing", function(){
        return BCAI.deployed().then(function(myContract) {
            return myContract.startProviding(3000,100,8000,{from: accounts[0]})  //time target price  
            .then(function(ret){
                checkGas(ret);
                

                truffleAssert.eventEmitted(ret,'SystemInfo',  (ev) => {
                     return ev.addr == accounts[0] && ev.info == web3.utils.asciiToHex('Provider Added');
                 },'Provider event mismatch');
               

                return checkingPool(myContract,
                    [accounts[0]],
                    [],
                    [],
                    [] );
                
            });
        })
    })

    it("Assign request to Account 0", function(){
        return BCAI.deployed().then(function(myContract) {
            return myContract.startRequest(200, 90, 9000, 12345, {from: accounts[1]}) //time target price dataID
            .then(function(ret){
                checkGas(ret);

                truffleAssert.eventEmitted(ret, 'SystemInfo',   (ev) => {
                    return ev.adder = accounts[1] && ev.info == web3.utils.asciiToHex('Request Added');
                }, 'Request event mismatch');
                
                truffleAssert.eventEmitted(ret, 'PairingInfo', (ev) => {
                    return ev.req == accounts[1] && ev.prov == accounts[0]
                        && ev.info == web3.utils.asciiToHex('Request Assigned');
                },"Pairing req1 => prov0 success");

                //checking pool
                return checkingPool(myContract,
                    [accounts[0]],
                    [accounts[1]],
                    [],
                    [])
                .catch(console.log)

            })
        });
    })

    it("Account 0 attempts information update, then to stop providing", function(){
        return BCAI.deployed().then(function(myContract){
            return myContract.updateProvider(3000, 100, 10000, {from: accounts[0]}) //time target price dataID
            .then(function(ret){
                checkGas(ret);

                truffleAssert.eventEmitted(ret, 'SystemInfo',   (ev) => {
                    return ev.adder = accounts[0] && ev.info == web3.utils.asciiToHex('Provider Unavailable To Update');
                }, 'Provider Update Failed');

                //checking pool
                return checkingPool(myContract,
                    [accounts[0]],
                    [accounts[1]],
                    [],
                    [])
                    

            })
            .then(function(ret){
                return myContract.stopProviding({from: accounts[0]})
                .then(function(ret){
                    checkGas(ret);

                    truffleAssert.eventEmitted(ret, 'SystemInfo', (ev) => {
                        return ev.adder = accounts[0] && ev.info == web3.utils.asciiToHex('Provider Unavailable To Stop Providing');
                    }, 'Provider Unable To Stop Providing');

                    //checking pool
                    return checkingPool(myContract,
                        [accounts[0]],
                        [accounts[1]],
                        [],
                        [])
                })
            })
        })
    })

    it("Account 0 completes request", function(){
        return BCAI.deployed().then(function(myContract){
            return myContract.completeRequest(accounts[1], 12345,{from: accounts[0]}) //reqId, resultId
            .then(function(ret){
                checkGas(ret);

                truffleAssert.eventEmitted(ret, 'SystemInfo', (ev) => {
                    return ev.adder = accounts[1] && ev.info == web3.utils.asciiToHex('Request Computation Completed');
                }, 'Request Computation Completed');

                return checkingPool(myContract,
                    [accounts[0]],
                    [accounts[1]],
                    [],
                    []
                    ).catch(console.log);

            })
        })
    })

    it("Account 9 starts providing in order to validate completed requests", function(){
        return BCAI.deployed().then(function(myContract){
            return BCAI.startProviding(2000, 500, 5000,{from: accounts[9]})
            .then(function(ret){
                checkGas(ret);

                truffleAssert.eventEmitted(ret, 'SystemInfo', (ev) => {
                    return ev.adder = accounts[9] && ev.info == web3.utils.asciiToHex('Provider Added');
                }, 'Provider Added');

                return checkingPool(myContract,
                    [accounts[0]],
                    [accounts[9]],
                    [],
                    []
                    );

            })
            .then(function(ret){
                return myContract.submitValidation(accounts[1],true,{from: accounts[9]})
                .then(function(ret){
                    checkGas(ret);

                    truffleAssert.eventEmitted(ret, 'PairingInfo', (ev) => {
                        return ev.req == accounts[1] && ev.prov == accounts[9] && ev.info == web3.utils.asciiToHex('Validator Signed');
                    }, 'Validator Signed');

                    return checkingPool(myContract,
                        [accounts[0]],
                        [accounts[9]],
                        [accounts[1]],
                        [],
                        );

                })
                
            })
            .then(function(ret){
                return myContract.checkValidation(accounts[1],true,{from: accounts[9]})
                .then(function(ret){
                    checkGas(ret);

                    truffleAssert.eventEmitted(ret, 'SystemInfo', (ev)=>{
                        return ev.adder == accounts[1] && ev.info == web3.utils.asciiToHex('Validation Completion');
                    }, 'Validation Complete');

                    return checkingPool(myContract,
                        [accounts[0]],
                        [accounts[9]],
                        [accounts[1]],
                        [],
                        );

                })
                .then(function(){
                    return myContract.getRequest.call(accounts[7]).then(function(ret){
                        //console.log(ret);
                        assert(ret.isValid == true);
                    })
                },function(err){
                    console.log(err)
                })
                .then(function(){
                    return myContract.stopProviding({from: accounts[9]})
                    .then(function(ret){
                        checkGas(ret);

                        truffleAssert.eventEmitted(ret, 'SystemInfo', (ev)=>{
                            return ev.adder == accounts[9] && ev.info == web3.utils.asciiToHex('Provider Stopped');
                        }, 'Provider Stopped');

                        return checkingPool(myContract,
                            [accounts[0]],
                            [],
                            [accounts[1]],
                            [],
                            );
                    })
                })
            })
        })
    })

    it('Account 8 uploads a request, account 0 will update his parameters to match the new request', function(){     //finish this
        return BCAI.deployed().then(function(myContract){
            return myContract.startRequest(200, 90, 5000, 98765, {from: accounts[8]})
            .then(function(ret){
                checkGas(ret);

                truffleAssert.eventEmitted(ret, 'SystemInfo', (ev)=>{
                    return ev.adder == accounts[8] && ev.info == web3.utils.asciiToHex('Request Added');
                }, 'Request event mismatch')

            })
            .then(function(ret){
                return myContract.updateProvider(200, 90, 5000, {from: accounts[0]})
                .then(function(ret){
                    checkGas(ret);

                    truffleAssert.eventEmitted(ret, 'SystemInfo',   (ev) => {
                        return ev.adder = accounts[0] && ev.info == web3.utils.asciiToHex('Provider Updated');
                    }, 'Provider Update Failed');

                    //unfinished here, need to assign the request to account 0




                })


            })
        })
    })

    
})

function checkingPool(myContract, providers, pendPool, provPool, valiPool){
    return myContract.getProviderPool.call().then(function(pool){
        //console.log(pool);
        //expect(pool).deep.equal(pendPool);
        assert.deepEqual(providers, pool);
    })
    .then(function(){    
        return myContract.getPendingPool.call().then(function(pool){
        //console.log(pool);
        //expect(pool).deep.equal(pendPool);
        assert.deepEqual(pendPool, pool);
        })
    })
    .then(function(){
        return myContract.getProvidingPool.call().then(function(pool){
            //console.log(pool);
            assert.deepEqual(provPool, pool);
        })
    
    }).then(function(){
        return myContract.getValidatingPool.call().then(function(pool){
            //console.log(pool);
            assert.deepEqual(valiPool, pool);
        })
    })
}


function checkGas(ret){
    totalGas += ret.receipt.gasUsed;
    if(showGas) console.log("Gas used here = ", ret.receipt.gasUsed)
    //console.log("Total Gas = ", totalGas);
}