//////////////////////////////////////////////////////////////////////////
// Unit test in truffle environment                                     //
// version 0.9.5                                                        //  
// Align with sol 0.9.5, independent with client version                //
// Author: Taurus tlu4@lsu.edu                                          //  
//////////////////////////////////////////////////////////////////////////


//need a truffle environment to run this
//use: truffle test uintTest.js
var BCAI = artifacts.require("TaskContract");
//npm install -g truffle-assertions
const truffleAssert = require('truffle-assertions');
//npm install -g bignumber.js
//var BigNumber = require('bignumber.js') //not used use web3.utils.BN [important]
//handle the BN is essential
var BN = web3.utils.toBN;
var totalGas = 0; 
var showGas = true;



contract("BCAI", function(accounts) {
    ///////////////////////////////////////////////////////////////////////////////
    it("Contract Deploymnet", function(){
        console.log(accounts);
        if(accounts != undefined) return true;
        else return false;
    })
    ///////////////////////////////////////////////////////////////////////////////
    it("Test Providing", function(){
        return BCAI.deployed().then(function(myContract) {
            return myContract.startProviding(1000,99,12000,{from: accounts[0], gas:200000})  //time target price  
            .then(function(ret){
                checkGas(ret);      //record the gas usage
                //check the event using receipt
                //truffleAssert.prettyPrintEmittedEvents(ret);
                truffleAssert.eventEmitted(ret,'SystemInfo',  (ev) => {
                     return ev.ID == 0 && ev.info == web3.utils.asciiToHex('Provider Added');
                 },'Provider event mismatch');
                //console.log(ret.receipt.logs[0].event);
                //console.log(web3.utils.toAscii(ret.receipt.logs[0].args[2]));
                //console.log("ID = ", ret.receipt.logs[0].args[0]);
                //check pool update
                return checkingPool(myContract,
                    [BN(0)],
                    [],
                    [],
                    [])
                //check List update
                //...
            });
        })
    })

    /////////////////////////////////////////////////////////////////////////////////
    // send a request which will NOT be matched (low price), thus appear in pool
    // test stop and update on this and send a new for next stage test.
    ////////////////////////////////////////////////////////////////////////////
    it("Test Request", function(){
        return BCAI.deployed().then(function(myContract) {
            //first send a no matching request, value == 0
            return myContract.startRequest(200,80,20,1215124,    //time target price, ID
                    {from: accounts[9], value: 20, gas:400000})                    //account  
            .then(function(ret){
                checkGas(ret);
                //check the event using receipt
                //truffleAssert.prettyPrintEmittedEvents(ret);
                truffleAssert.eventEmitted(ret,'SystemInfo',  (ev) => {
                    return ev.ID == 0 && ev.info == web3.utils.asciiToHex('Request Added');
                },'Request event mismatch');
                //console.log(ret.receipt.logs[0].event);
                //console.log(web3.utils.toAscii(ret.receipt.logs[0].args[2]));
                //console.log("ID = ", ret.receipt.logs[0].args[0]);
                //check pool update
                return checkingPool(myContract,
                    [BN(0)],
                    [BN(0)],
                    [],
                    [])
                
                //check List update
                //...

                //there should be no match
            })

        })
        
        // }).then(function() {
        //     //Begins after startProviding tx has been mined
        //     return bcaiContract.getProvider.call(0,{from: accounts[1]});
        // }).then(function(result) {
        //     assert.equal(result, accounts[2], "provider start fail!");
        // })  
    })
    ////////////////////////////////////////////////////////////////////////////////
    //send a new request which should be matched automaticly
    //
    ////////////////////////////////////////////////////////////////////////////////
    it("Test Task Assignment", function(){
        return BCAI.deployed().then(function(myContract) {
            //send a matching request
            return myContract.startRequest(800,80,20000, 12512412,      //time target price ID
                {from: accounts[9], value: 15000, gas: 400000})  //ID target time  
            .then(function(ret){
                checkGas(ret);
                truffleAssert.eventEmitted(ret,'SystemInfo',  (ev) => {
                    //console.log(ev[0])
                    return ev.ID == 1 && ev.info == web3.utils.asciiToHex('Request Added');
                },'Request 1 submit fail');
                
                truffleAssert.eventEmitted(ret, 'PairingInfo', (ev)=>{
                    //console.log(ev[0])
                    return ev.reqID == 1 && ev.provID == 0;
                },"Pairing req1 => prov0 fail!");

                //checking pool
                return checkingPool(myContract,
                    [],
                    [BN(0)],
                    [BN(1)],
                    [])
                .catch(console.log)

                //checking List
                //...
            })
        })
    })

    ////////////////////////////////////////////////////////////////////////////////
    //send a new request which should be matched automaticly
    //
    ////////////////////////////////////////////////////////////////////////////////
    it("Test Complete Computation", function(){
        return BCAI.deployed().then(function(myContract) {
            //submit a complete computation result
            return myContract.completeRequest(1,12516136,{from: accounts[0]})  //reqID resultID  
            .then(function(ret){
                checkGas(ret);
                truffleAssert.eventEmitted(ret,'SystemInfo',  (ev)=>{
                    //console.log(ev[0])
                    return ev.ID == 1 && ev.info == web3.utils.asciiToHex('Request Computation Completed');
                },'Submit computation result fail');
                // no autoValidation for now

                // truffleAssert.eventEmitted(ret,'PairingInfo', (ev)=>{
                //     //console.log(ev[0])
                //     return ev.reqID == 1 && ev.provID == 0;
                // },"Pairing req1 => prov0 fail!");

                //checking pool
                //var x = new BigNumber("0");
                return checkingPool(myContract,
                    [],
                    [BN(0)],
                    [],
                    [BN(1)])
                .catch(console.log);
                
                //checking List
                //...
            })
        })
    })
    ////////////////////////////////////////////////////////////////////////////////
    //send a computation complete
    //1. not enough provider  -> add provider
    //2. not enough validator -> fail
    //3. enough true sig    -> success
    ////////////////////////////////////////////////////////////////////////////////
    it("Test Validation Assignment", function(){
        return BCAI.deployed().then(function(myContract) {
            //submit a complete computation result
            //1. not enough provider  -> add provider
            return myContract.validateRequest(1,{from: accounts[0]})  //reqID resultID  
            .then(function(ret){
                checkGas(ret);
                truffleAssert.eventEmitted(ret,'SystemInfo',  (ev)=>{
                    //console.log(ev)
                    return ev.ID == 1 && ev.info == web3.utils.asciiToHex('Not Enough Validators');
                },'Submit validation fail');
                // no autoValidation for now

                // truffleAssert.eventEmitted(ret,'PairingInfo', (ev)=>{
                //     //console.log(ev[0])
                //     return ev.reqID == 1 && ev.provID == 0;
                // },"Pairing req1 => prov0 fail!");

                //checking pool
                return checkingPool(myContract,
                    [],
                    [BN(0)],
                    [],
                    [BN(1)])
                .catch(console.log)
                //checking List
                //...
            })
            // add a new provider #1
            .then(function(){
                return myContract.startProviding(100,100,1000,{from: accounts[1]})  //time target price  
                .then(function(ret){
                    checkGas(ret);
                    truffleAssert.eventEmitted(ret,'SystemInfo', (ev)=>{
                        //console.log(ev[0])
                        return ev.ID == 1 && ev.info == web3.utils.asciiToHex('Provider Added');
                    },"Add new provider fail");
                    //checking pool
                    return checkingPool(myContract,
                        [BN(1)],
                        [BN(0)],
                        [],
                        [BN(1)])
                    .catch(console.log)
                })
            })
            // add a new provider #2
            .then(function(){
                return myContract.startProviding(100,100,1000,{from: accounts[2]})  //time target price  
                .then(function(ret){
                    checkGas(ret);
                    truffleAssert.eventEmitted(ret,'SystemInfo', (ev)=>{
                        //console.log(ev[0])
                        return ev.ID == 2 && ev.info == web3.utils.asciiToHex('Provider Added');
                    },"Add new provider fail");
                    //checking pool
                    return checkingPool(myContract,
                        [BN(1), BN(2)],
                        [BN(0)],
                        [],
                        [BN(1)])
                    .catch(console.log)
                })
            })
            // add a new request#2, assigned to prov#1
            .then(function(){
                return myContract.startRequest(80,30,12000,1215125,{from: accounts[9], value: 80000})  //ID target time  
                .then(function(ret){
                    checkGas(ret);
                    truffleAssert.eventEmitted(ret,'SystemInfo',  (ev) => {
                        return ev.ID == 2 && ev.info == web3.utils.asciiToHex('Request Added');
                    },'Request event mismatch');
                    truffleAssert.eventEmitted(ret, 'PairingInfo', (ev)=>{
                        return ev.reqID == 2 && ev.provID == 1 &&
                            ev.info == web3.utils.asciiToHex("Request Assigned to Provider");
                    },"Pairing req#2 => prov#1 fail!");

                    //check pool update
                    return checkingPool(myContract,
                        [BN(2)],
                        [BN(0)],
                        [BN(2)],
                        [BN(1)])
                    
                    //check List update
                    //...
                })
            })
            // prov#1 submit computation finished and assgin prov#2 to validate
            .then(function(){
                return myContract.completeRequest(2,1225135,{from: accounts[1]})  //reqID resultID  
                .then(function(ret){
                    checkGas(ret);
                    truffleAssert.eventEmitted(ret,'SystemInfo',  (ev)=>{
                        //console.log(ev)
                        return ev.ID == 2 && ev.info == web3.utils.asciiToHex('Request Computation Completed');
                    },'Submit Complete computation req#2 fail');
                    truffleAssert.eventEmitted(ret,'PairingInfo',  (ev)=>{
                        //console.log(ev)
                        return ev.reqID == 2 && ev.provID == 2 
                        && ev.info == web3.utils.asciiToHex('Validation Assigned to Provider');
                    },'validator assignment fail');
                    truffleAssert.eventEmitted(ret,'SystemInfo',  (ev)=>{
                        //console.log(ev)
                        return ev.ID == 2 && ev.info == web3.utils.asciiToHex('Enough validators');
                    },'get enough validator fail');
                    //checking pool
                    return checkingPool(myContract,
                        [],
                        [BN(0)],
                        [],
                        [BN(1),BN(2)])
                    .catch(console.log)
                    //checking List
                    //...
                })
            })
        })
    })  
    ////////////////////////////////////////////////////////////////////////////////
    //validator send back result and sign the List
    //reqID = 2, provID = 1, validatorID = 2
    ////////////////////////////////////////////////////////////////////////////////
    it("Test Submit Validation", function(){
        return BCAI.deployed().then(function(myContract) {
            //submit a complete computation result
            return myContract.submitValidation(2,1,true,{from: accounts[2]})  //reqID resultID  
            .then(function(ret){
                checkGas(ret);
                truffleAssert.eventEmitted(ret,'PairingInfo',  (ev)=>{
                    //console.log(ev[0])
                    return ev.reqID == 2 && ev.provID == 1
                        && ev.info == web3.utils.asciiToHex('Validator Signed');
                },'Validator submit signature fail');
                // no autoValidation for now

                // truffleAssert.eventEmitted(ret,'PairingInfo', (ev)=>{
                //     //console.log(ev[0])
                //     return ev.reqID == 1 && ev.provID == 0;
                // },"Pairing req1 => prov0 fail!");

                //checking pool
                //var x = new BigNumber("0");
                return checkingPool(myContract,
                    [],
                    [BN(0)],
                    [],
                    [BN(1),BN(2)])
                //checking List
                .then(function(){
                    return myContract.getRequest.call(2).then(function(ret){
                        //console.log(ret);
                        assert(ret.reqID == 2);
                        assert(ret.validators[0] == 2)
                        assert(ret.signatures[0] == true);
                    })
                })
            })
        })
    })
    it("Test Check Validation", function(){
        return BCAI.deployed().then(function(myContract) {
            //submit a complete computation result
            return myContract.checkValidation(2,{from: accounts[0]})  //reqID resultID  
            .then(function(ret){
                checkGas(ret);
                truffleAssert.eventEmitted(ret,'SystemInfo',  (ev)=>{
                    //console.log(ev[0])
                    return ev.ID == 2 && ev.info == web3.utils.asciiToHex('Validation Complete');
                },'Validator final check fail');
                // no autoValidation for now

                // truffleAssert.eventEmitted(ret,'PairingInfo', (ev)=>{
                //     //console.log(ev[0])
                //     return ev.reqID == 1 && ev.provID == 0;
                // },"Pairing req1 => prov0 fail!");

                //checking pool
                //req#2 should be popped out from pool
                return checkingPool(myContract,
                    [],
                    [BN(0)],
                    [],
                    [BN(1)])
                //checking List
                .then(function(){
                    return myContract.getRequest.call(2).then(function(ret){
                        //console.log(ret);
                        assert(ret.isValid == true);
                    })
                })
            })
        })
    })
    //end of it
    
    
    it("Performance and cost Analysis", function(){
        console.log("Total cost = ", totalGas);
    })
})

























////////////////////////////////////////////////////////////////////////////
// useful tool to check pool
// use:
// return checkingPool(myContract,
//          [],             //provider
//          [BN(0)],        //pending
//          [],             //providing
//          [BN(1)])        //validating
// .catch(console.log)
//////////////////////////////////////////////////////////////////////////
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
    ///console.log("Total Gas = ", totalGas);
}