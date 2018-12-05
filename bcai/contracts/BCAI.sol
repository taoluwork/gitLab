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

    address[] public providerPool;                   //record the available providers;
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
        uint16  accuracy;           //target 0-100.00
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




    // Function called to become a provider of tasks for anyone requesting. 
    // NOTE: does nothing if already a provider - also used to update
    function startProviding(uint64 maxTime, uint16 maxTarget, uint64 minPrice) public {
        // If new provider
        if (providerList[msg.sender].addr == address(0)) { // address is not on the chain
            //create temp object
            Provider memory prov = Provider(
                msg.sender,    //addr 
                0,             //prividedCount
                0,             //requestedCount
                maxTime,       //maxTime
                maxTarget,     //maxTarget
                minPrice,      //minPrice
                true);         //available
            //add new to providerList
            providerList[msg.sender] = prov;
            //add to providerID list
            providerID[msg.sender] = providerCount;
            //add to Pool
            providerPool.push(msg.sender);
            //update count
            providerCount++;      
        }
        else { // Updating old provider -- address is on the chain
            providerList[msg.sender].maxTime = maxTime;
            providerList[msg.sender].maxTarget = maxTarget;
            providerList[msg.sender].minPrice = minPrice;
	        providerList[msg.sender].available = true;
        }
    }

    // Treats msg.sender as provider and makes them unavailable for requests
    function stopProviding() public {
        // If the sender is already a valid provider
        if (providerList[msg.sender].addr == msg.sender) {
            providerList[msg.sender].available = false;
            providerList[msg.sender].addr = address(0);
            providerCount--;
            /*// checking that theyre not the last provider to register 
            if (providerID[msg.sender] != providerCount-1) {
                // Label ID as vacant
                spaces.push(providerID[msg.sender]);
            }*/         
        }
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
    function findRequest(Provider memory prov) private returns (byte){
        if(requestPool.length != 0){
            for (uint128 i = 0; i< requestPool.length; i++){
                //fetch  request object, may save gas
                Request memory req = requestList[requestPool[i]];
                if( req.time < prov.maxTime &&
                    req.accuracy < prov.maxTarget &&
                    req.price > prov.minPrice){
                        //meet the requirement, assign the task
                        //update task
                        req.provider = prov.addr;
                        req.status = '1';
                        requestList[requestPool[i]] = req;  //write back to storage
                        emit TaskAssigned(req.provider, req.reqID);
                        //update pools
                        requestPop(req.reqID);
                        providerPop(prov.addr); 
                        //update the counts
                        pendingCount--;
                        providingCount++;
                        return '0';
                    
                }
                
            }
            //after for loop and no match
            return '1';
        } else return '2';
    }





    // Requester will call contract so it can find a provider for task.
    // Requester calls this function with:
    // dataID, target (accuracy), timeLimit, msg.value > 0
    // Assumes price is including the cost for verification
    function requestTask(uint64 dataID, uint16 target, uint64 time) payable public returns (bool) {
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
        return assignTask(req);
    }

    // Assigning one task to one of the available providers. Only called from requestTask (private)
    // Search in the providerPool, if no match in the end, return false
    //could only assign one task at a time
    //auto sel the first searching result for now, no comparation between multiple availability.
    //TODO: need ot add preference next patch
    function assignTask(Request memory req) private returns (bool) {
        //provider availability is checked in pool not in list
        Request memory req;
        if (requestPool.length > 0){            //if any un-assgnied exist in pool
            req = requestList[requestPool[0]];  //get the first item, there should always be one
            //assign it to the provider pool.
            for (uint64 i = 0; i < providerPool.length; i++) {
                // Check if they are active provider, search pool first then list
                address addr = providerPool[i];
                if(addr != address(0) && providerList[addr].available == true){
                    // Check if request conditions meet the providers requirements
                    if (req.accuracy <= providerList[addr].maxTarget && 
                            req.time <= providerList[addr].maxTime && 
                            req.price >= providerList[addr].minPrice) {
                        
                        // records how much money the requester sent                
                        balanceList[req.addr] += req.price; 
                        
                        //update request.provider -- assigned
                        req.provider = providerList[addr].addr;
                        req.status = '1';
                        requestList[req.reqID] = req; // save to mapping of requests 
                        providerList[addr].available = false;
                        //status move from pending to providing
                        pendingCount--;
                        providingCount++;
                        //NOTE: assign existing task should not increase the # of requestCount

                        //EVENT
                        emit TaskAssigned(req.provider, req.reqID); // Let provider listen for this event to see he was selected
                        return true;
                    }
                }
            }
            // No provider was found matching the criteria -- request failed
            req.addr.transfer(req.price); // Returns the ether to the sender
            return false;
        }
        else        //requestPool.length == 0
            return false;
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
    function providerPop(address addr) private returns(uint64) {
        uint64 returnValue = 0;
        for(uint64 i = 0; i < providerPool.length; i++){
            if (providerPool[i] == addr) {
                returnValue = i;    //return the index (location)
                //swap
                providerPool[i] = providerPool[providerPool.length-1];
                delete providerPool[providerPool.length-1];
                providerPool.length--;
                continue;
            }
        }
        return returnValue; //return 0 mean failed to pop
    }

    function requestPop(uint128 reqID) private returns(uint64) {
        uint64 returnValue = 0;
        for(uint64 i = 0; i < requestPool.length; i++){
            if (requestPool[i] == reqID) {
                returnValue = i;        //return index
                //swap
                requestPool[i] = requestPool[requestPool.length-1];
                delete requestPool[requestPool.length-1];
                requestPool.length--;
                continue;
            }
        }
        return returnValue; //return 0 mean failed to pop
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
    function getProviderPool() public view returns (address[] memory){
        return providerPool;
    }
    function getRequestPool() public view returns (uint128[] memory){
        return requestPool;
    }
    function getBalance(address addr) public view returns (uint256){
        return balanceList[addr];
    }
    function listRequests() public view returns(Request[3] memory){
	    Request[3] memory allRequest;
	    for (uint64 i = 0; i < 3; i++){
		    allRequest[i] = getRequest(i);
	    }
	    return allRequest;
    }
    function listProviders() public view returns(Provider[5] memory){
        Provider[5] memory allProvider;
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
