//version 0.9
//Author: Taurus, Landry
//Copyright: tlu4@lsu.edu

pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;   //return self-defined type

contract TaskContract {

    uint128 public requestCount;                    //total number of requests sent to contract
    uint128 public pendingCount;                    //totla # of requests pending (after submission before assigned)
    uint128 public providingCount;                  //total number of requests that contract found provider for
    uint64  public providerCount;                    //number of active providers in the mapping below
    mapping (address => Provider) public providerList;   //list of known providers. must apply. maps providerID to struct
    mapping (address => uint64) public providerID;      //look up providerID using address     NOTE: possible not needed
    //NOTE: addr is the only identifier for provider object.
    //However, providerID could possibly be same between different address.
    //e.g. Tom has Two account with addr_1, addr_2, but he could be assigned an unique providerID.

    mapping (uint128 => Request) public requestList;    //mapping requestCount to Request object, requestCount is the unique number used as identifier
    mapping (address => uint128[]) public requestID;      //look up requestID using user address , NOTE: single user could have multiply requestID
    //for the request, requestID(uint128) is the only identifier.
    //address is not because multiple request could come from same address

    address payable [] public  providerPool;                   //record the available providers;
    uint128[] public requestPool;                    //record the pending request;
    //uint64[] public spaces;                             //Open spaces where providers left. should be filled when new provider comes
    mapping (address => uint256) public balanceList;    //for keeping track of how much money requesters have sent
    

    constructor() public {      //sol 5.0 syntax
        requestCount = 0;        
        providerCount = 0;
        providingCount = 0;
        pendingCount = 0;
    }

    struct Request {
        address payable addr;       //payable is new feature from sol v5.0
        address payable provider;   //addr of worker
        uint128 reqID;              //requestID is the only identifier for each Request
        uint64  dataID;             //dataID used to fetch the off-chain data
        uint64  time;               //time
        uint16  target;           //target 0-100.00
        uint256 price;              //the max amount he can pay
        uint64  resultID;           //dataID to fetch the result
        uint64  numValidationsNeeded;   //user defined the validation
        bool[]  validations;        //multisignature from validations
        bool    isValid;            //the final flag
        byte   status;              //0: 'pending', 1:'providing', 2: validating, 3: complete
    }

    struct Provider {
        address payable addr;       //providers address
        uint64  providedCount;      //reputaion-like reference for each provider, future use
        uint64  requestedCount;     //
        uint64  maxTime;            //max time
        uint16  maxTarget;          //max target he need
        uint256 minPrice;           //lowest price can accept
        bool    available;          // Used to determine if provider is already doing something
    }

    event TaskAssigned(address provider, uint128 reqID);            // next step: call completeTask
    event ValidationRequested(address validator, uint128 reqID);    // next step: validator calls submitValidation
    event TaskCompleted(address requestor, uint128 reqID);          // done




    //tips on saving gas cost: don't create local copy and write back, modify the storage directly.
    /* function startProviding(uint64 maxTime, uint16 maxTarget, uint64 minPrice) public returns (bool) {
        // If new provider,
        if (providerList[msg.sender].addr == address(0)) { 
            //create temp object
            Provider memory prov = Provider(
                msg.sender,    //addr 
                0,             //prividedCount
                0,             //requestedCount
                maxTime,       //maxTime
                maxTarget,     //maxTarget
                minPrice,      //minPrice
                true);         //available
            //write to providerList
            providerList[msg.sender] = prov;
            //add to providerID list
            providerID[msg.sender] = providerCount;
            //add to Pool
            providerPool.push(msg.sender);
            //update count
            providerCount++;      
        }
        else { // Updating old provider -- address is on the chain
            //create temp object
            providerList[msg.sender].maxTime = maxTime;
            providerList[msg.sender].maxTarget = maxTarget;
            providerList[msg.sender].minPrice = minPrice;
	        providerList[msg.sender].available = true;
        }
    }*/

    // Function called to become a provider of tasks for anyone requesting. 
    // NOTE: does nothing if already a provider - also used to update
    function startProviding(uint64 maxTime, uint16 maxTarget, uint64 minPrice) public returns (byte) {
        //NOTE: avoid using local memory copy and write back to providerList
        // modify it directly here will save gas cost
        // If new provider,
        if (providerList[msg.sender].addr == address(0)) { 
            //update providerList
            providerList[msg.sender].addr           = msg.sender;   
            providerList[msg.sender].providedCount  = providerCount;             
            providerList[msg.sender].requestedCount = 0;             
            providerList[msg.sender].maxTime        = maxTime;       
            providerList[msg.sender].maxTarget      = maxTarget;
            providerList[msg.sender].minPrice       = minPrice;
            providerList[msg.sender].available      = true;         
           
            //add to providerID list
            providerID[msg.sender] = providerCount;
            //add to Pool
            providerPool.push(msg.sender);
            //update count
            providerCount++;      
        }
        else { // Updating old provider -- address is on the chain
            //TODO: potentially save some gas: 
            //if(providerList[msg.sender].maxTime != maxTime)
            providerList[msg.sender].maxTime = maxTime;
            providerList[msg.sender].maxTarget = maxTarget;
            providerList[msg.sender].minPrice = minPrice;
	        providerList[msg.sender].available = true;
        }
        return assignProvider(msg.sender);
    }

    // Treats msg.sender as provider and makes them unavailable for requests
    function stopProviding() public returns (bool) {
        // If the sender is currently an active provider
        if (providerList[msg.sender].available == true) {
            //delete set all member to 0;
            delete providerList[msg.sender];  
            //pop out from Pool  
            return providerPop(msg.sender); 
        } else //available == false 
            return false;
    }

    // Used to be sure you are seen as available. e.g. power outage caused you to lose available status on network.
    // Not to be called after stopProviding to resume -- startProviding used in this case.
    //function restart() public returns (bool) {
    //if (providerList[providerID[msg.sender]].addr == msg.sender) {
    //     providers[providerID[msg.sender]].available = true;
    //       return true;
    //    }
    //else {
    //    return false; // provider wasnt found in mapping
    //  }
    //}


    // Search in the requestPool, find a job for current provider. Triggered by startProviding
    // Return true if a match or false if not.
    // Returns: 0: successfully assigned
    //          1: searched all providers but find no match
    //          2: no available provider right now
    //          3: failure during poping pool
    function assignProvider(address payable addr) private returns (byte){
        if(requestPool.length == 0) return '2';
        else {
            //search throught the requestPool
            for (uint128 i = 0; i< requestPool.length; i++){
                //save the re-usable reqID , may save gas
                uint128 reqID = requestPool[i];
                if( requestList[reqID].time < providerList[addr].maxTime &&
                    requestList[reqID].target < providerList[addr].maxTarget &&
                    requestList[reqID].price > providerList[addr].minPrice){
                        //meet the requirement, assign the task
                        //update provider
                        providerList[addr].available = false;
                        bool isPopped = providerPop(addr);
                        if(!isPopped) return '3';

                        //update request
                        requestList[reqID].provider = addr;
                        requestList[reqID].status = '1';    //providing
                        isPopped = requestPop(reqID);
                        if(!isPopped) return '3';

                        //update balanceList            addr here is requester's
                        balanceList[requestList[reqID].addr] += requestList[reqID].price; 
                                               
                        //status move from pending to providing
                        pendingCount--;
                        providingCount++;
                        emit TaskAssigned(addr, reqID);
                        return '0';
                    
                }
                
            }
            //after for loop and no match
            return '1';
        }
    }





    // Requester will call contract so it can find a provider for task.
    // Requester calls this function with:
    // dataID, target (accuracy), timeLimit, msg.value > 0
    // Assumes price is including the cost for verification
    function requestTask(uint64 dataID, uint16 target, uint64 time) payable public returns (byte) {
        bool[] memory emptyArray;
        
        requestList[requestCount].addr      = msg.sender;
        requestList[requestCount].provider  = address(0);
        requestList[requestCount].reqID     = requestCount; //used as index
        requestList[requestCount].dataID    = dataID;
        requestList[requestCount].time      = time;    
        requestList[requestCount].target    = target;
        requestList[requestCount].price     = msg.value;
        requestList[requestCount].resultID  = 0;
        requestList[requestCount].numValidationsNeeded = 1;
        requestList[requestCount].validations = emptyArray;
        requestList[requestCount].isValid   = false;
        requestList[requestCount].status    = '0' ;     //pending

        //add new to requestPool
        requestPool.push(requestCount);
        //update requestID
        requestID[msg.sender].push(requestCount);
        //update count
        requestCount++;     //count already stands for the # of req now.
        pendingCount++;
        return assignTask(requestCount -1);
    }

    /*function requestTask(uint64 dataID, uint16 target, uint64 time) payable public returns (bool) {
        bool[] memory emptyArray;
        Request memory req = Request(           //create a temp memory var
            msg.sender,             //addr
            address(0),             //provider
            requestCount,           //reqID
            dataID,                 //dataID
            time,                   //time    
            target,                 //target   0-100
            msg.value,              //price 
            0,                      //resultID
            1,                      //numValidationsNeeded
            emptyArray,             //sig list
            false,                  //isValid
            0                       //status  0-3 0: pending
        );

        //copy the mem var into storage
        requestList[requestCount] = req;        //requestCount used as index here, from 0 to +++
        //add new to requestPool
        requestPool.push(requestCount);
        //update requestID
        requestID[msg.sender].push(requestCount);
        //update count
        requestCount++;     //count already stands for the # of req now.
        pendingCount++;
        return assignTask();
    }*/


    // Assigning one task to one of the available providers. Only called from requestTask (private)
    // Search in the providerPool, if no match in the end, return false
    //could only assign one task at a time
    //auto sel the first searching result for now, no comparation between multiple availability.
    //TODO: need ot add preference next patch
    // Returns: 0: successfully assigned
    //          1: searched all providers but find no match
    //          2: no available provider right now
    //          3: failure during poping pool
    function assignTask(uint128 reqID) private returns (byte) {
        //provider availability is checked in pool not in list
        if (providerPool.length == 0)   return '2';
        else {            //if any provider in pool
            for (uint64 i = 0; i < providerPool.length; i++) {
                // save the provider's addr, reusable and save gas cost
                address payable addr  = providerPool[i];
                if(addr != address(0) && providerList[addr].available == true){
                    // Check if request conditions meet the providers requirements
                    if (requestList[reqID].target <= providerList[addr].maxTarget && 
                        requestList[reqID].time <= providerList[addr].maxTime && 
                        requestList[reqID].price >= providerList[addr].minPrice) {
                        
                        //update provider:
                        providerList[addr].available = false;
                        bool isPopped = providerPop(addr);
                        if(!isPopped) return '3';

                        //update request
                        requestList[reqID].provider = addr;
                        requestList[reqID].status = '1';    //providing
                        isPopped = requestPop(reqID);
                        if(!isPopped) return '3';

                        //update balanceList              
                        balanceList[requestList[reqID].addr] += requestList[reqID].price; 
                                               
                        //status move from pending to providing
                        pendingCount--;
                        providingCount++;
                        //NOTE: assign existing task should not increase the # of requestCount

                        //EVENT
                        emit TaskAssigned(addr, reqID); // Let provider listen for this event to see he was selected
                        return '0';
                    }
                }
            }
            // No provider was found matching the criteria -- request failed
            requestList[reqID].addr.transfer(requestList[reqID].price); // Returns the ether to the sender
            return '1';
        }
    }



/*

    // Provider will call this when they are done and the data is available.
    // This will invoke the validation stage
    function completeTask(uint128 reqID, uint64 resultID) public returns (bool) {
        // Confirm msg.sender is actually the provider of the task he claims
        if (msg.sender == requestList[reqID].provider) {
            requestList[reqID].isCompleted = true;
            requestList[reqID].resultID = resultID;
            providerList[providerID[msg.sender]].available = true;
            return validateTask(reqID);
        }
        else {
            return false;
        }
    }
/*
    // Called by completeTask before finalizing stuff. Contract checks with validators
    // Returns false if there wasnt enough free providers to send out the required number of validation requests
    function validateTask(uint128 reqID) private returns (bool) {
        uint64 numValidators = 3; // need validation from 1/10 of nodes -- could change
        //uint numValidators = providerCount / 10; 
        uint validatorsFound = 0;
        requestList[reqID].numValidationsNeeded = numValidators;
        for (uint64 i=0; i<providerCount + spaces.length && validatorsFound<numValidators; i++) {
            if (providerList[i].addr == address(0)) {
                continue;
            }
            if (providerList[i].available) {
                // EVENT: informs validator that they were selected and need to validate
                emit ValidationRequested(providerList[i].addr, reqID);
                validatorsFound++;
            }
        }
        if (validatorsFound == numValidators) {
            return true;
        }
        return false;
    }





    // needs to be more secure by ensuring the submission is coming from someone legit 
    function submitValidation(uint128 reqID, bool result) public returns (bool) {
        // Pay the validator 
        uint partialPayment = requestList[reqID].price / 100; // amount each validator is paid
        msg.sender.transfer(partialPayment);
        balanceList[requestList[reqID].addr] -= partialPayment;
        // Put the result in the request struct
        requestList[reqID].validations.push(result);
        // If enough validations have been submitted
        if (requestList[reqID].validations.length == requestList[reqID].numValidationsNeeded) {
            return checkValidation(reqID, requestList[reqID].price - requestList[reqID].numValidationsNeeded * partialPayment);
        }
    }
    
    function checkValidation(uint128 reqID, uint payment) private returns (bool) {
        // Add up successful validations
        uint64 successCount = 0;
        for (uint64 i=0; i<requestList[reqID].validations.length; i++) {
            if (requestList[reqID].validations[i]) successCount++;
        }
        // if 2/3 of validation attempts were successful
        if (successCount  >= requestList[reqID].numValidationsNeeded * 2 / 3  ) { 
            // if 2/3 of validations were valid then provider gets remainder of money
            requestList[reqID].provider.transfer(payment); 
            balanceList[requestList[reqID].addr] -= payment;
            requestList[reqID].isValid = true; // Task was successfully completed! 
        }
        // otherwise, work was invalid, the providers payment goes back to requester
        else {
            requestList[reqID].addr.transfer(payment);
            balanceList[requestList[reqID].addr] -= payment;
        }
        // EVENT: task is done whether successful or not
        emit TaskCompleted(requestList[reqID].addr, reqID);
        return requestList[reqID].isValid;
    }
*/
/////////////////////////////////////////////////////////////////////
 // Used to dynamically remove elements from array of open provider spaces. 
    // Using a swap and delete method, search for the desired addr throughout the whole array
    // delete the desired and swap the whole with last element
    function providerPop(address addr) private returns(bool) {
        for(uint64 i = 0; i < providerPool.length; i++){
            if (providerPool[i] == addr) {
                //swap last element with hole
                providerPool[i] = providerPool[providerPool.length-1];
                //delete last item
                delete providerPool[providerPool.length-1];
                 //decrease size
                providerPool.length--;
                return true;
            }
        }
        return false; //fail to search: no matching in pool
    }

    function requestPop(uint128 reqID) private returns(bool) {
        for(uint64 i = 0; i < requestPool.length; i++){
            if (requestPool[i] == reqID) {
                //swap last element with hole
                requestPool[i] = requestPool[requestPool.length-1];
                //delete last item
                delete requestPool[requestPool.length-1];
                //decrease size
                requestPool.length--;
                return true;
            }
        }
        return false;   //fail to search: no matching in pool
    }


    /////////////////////////////////////////////////////////////////////////////////
    //some helpers defined here
    function testTask() public {
        emit TaskAssigned(msg.sender, 1);
    }
    function getProvider(address addr) public view returns(Provider memory){
        return providerList[addr];
    }
    function getRequest(uint64 reqID) public view returns (Request memory){
	    return requestList[reqID];
    }
    function getProviderCount() public view returns (uint128){
        return providerCount;
    }
    function getRequestCount() public view returns (uint128){
        return requestCount;
    }
    function getProviderPool() public view returns (address payable [] memory){
        return providerPool;
    }
    function getRequestPool() public view returns (uint128[] memory){
        return requestPool;
    }
    function getProviderPoolSize() public view returns (uint256){
        return providerPool.length;
    }
    function getRequestPoolSize() public view returns (uint256){
        return requestPool.length;
    }
    function getBalance(address addr) public view returns (uint256){
        return balanceList[addr];
    }
    function listRequests() public view returns(Request[50] memory){
	    Request[50] memory allRequest;
	    for (uint64 i = 0; i < requestPool.length; i++){
		    allRequest[i] = getRequest(i);
	    }
	    return allRequest;
    }
    function listProviders() public view returns(Provider[50] memory){
        Provider[50] memory allProvider;
        address addr;
        for (uint64 i = 0; i < providerPool.length;i++){
            if(providerPool.length > 0) {
                addr = providerPool[i];     
            }else {
                addr = address(0);
            }
            allProvider[i] = getProvider(addr);
        }
        return allProvider;
    }
    /*function listTestProviders() public view returns(Provider[3] memory){
        Provider[3] memory allProvider;
        for (uint64 i = 0; i < 3;i++){
            allProvider[i] = getTestProvider(i);
        }
        return allProvider;
    }*/

}
