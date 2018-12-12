/////////////////////////////////////////////////////////////////////////////////////
//version 1.9.1
//Author: Taurus
//Copyright: tlu4@lsu.edu
//
//NOTE: non-view functions cannot return values, only possible way is event
//Changes from v0.9x. Each node has unique address as identifier. All pools removed 
//All req and prov handled in the mapping.
//update 12/12: pools cannot be removed, since we need to track who are active, cannot search in mapping.
///////////////////////////////////////////////////////////////////////////////////////
pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;   //return self-defined type

contract TaskContract {
    //list
    mapping (address => Provider) public providerList;   //All here
    mapping (address => Request)  public requestList;    //All here
    mapping (address => uint256)  public balanceList;    //reqID => balance
 
    //ID - counter
    uint256 private providerCount;     //+1 each time
    uint256 private requestCount;

    

    constructor() public {      //sol 5.0 syntax
        providerCount = 0;
        requestCount = 0;
    }

    struct Request {
        uint256 reqID;              //requestID is the only identifier for each Request
        uint256 blockNumber;
        //address payable addr;       //payable is new feature from sol v5.0
        //uint256 assignedProvider;
        address payable provider;         //
        //address payable provider;   //addr of worker
        uint64  time;               //time
        uint16  target;             //target 0-100.00
        uint256 price;              //the max amount he can pay
        uint64  dataID;             //dataID used to fetch the off-chain data
        uint64  resultID;           //dataID to fetch the result
        uint64  numValidationsNeeded;   //user defined the validation
        bool[]  validations;        //multisignature from validations
        bool    isValid;            //the final flag
        byte    status;              //0: 'pending', 1:'providing', 2: validating, 3: complete
    }

    struct Provider {
        uint256 provID;
        uint256 blockNumber;
        //address payable addr;       //providers address   
                                    //TODO: the provider name registration.
        uint64  maxTime;            //max time
        uint16  maxTarget;          //max target he need
        uint256 minPrice;           //lowest price can accept
        bool    available;          // Used to determine if provider is already doing something
    }

    event SystemInfo        (address payable addr, bytes info);
    event PairingInfo       (address payable req, address payable prov, bytes info);

    address payable [] providerPool;
    address payable [] pendingPool;
    address payable [] providingPool;
    address payable [] validatingPool;
    /////////////////////////////////////////////////////////////////////////////////////

    
    // Function called to become a provider. New on List, Map and Pool. 
    // NOTE: cannot use to update. You must stop a previous one and start a new one.
    // TIPS: gas cost: don't create local copy and write back, modify the storage directly.
    //gas cost 165K without event / 167K with event / 92K overwrite
    function startProviding(uint64 maxTime, uint16 maxTarget, uint64 minPrice) public returns (bool) {
        // register a new provider object in the List and map              
        providerList[msg.sender].provID         = providerCount;      //cost 50k per item edit
        providerList[msg.sender].blockNumber    = block.number;
            //providerList[msg.sender].addr           = msg.sender;             
        providerList[msg.sender].maxTime        = maxTime;
        providerList[msg.sender].maxTime        = maxTime;       
        providerList[msg.sender].maxTarget      = maxTarget;
        providerList[msg.sender].minPrice       = minPrice;
        providerList[msg.sender].available      = true;  //turn on the flag at LAST
        // ready for the next       
        providerPool.push(msg.sender);
        emit SystemInfo (msg.sender, "Provider Added");
        providerCount++;
        assignProvider(msg.sender);
        return true;
    }
    /*// Stop a provider, if you know a provider ID. Get em using getProvID()
    // Must be sent from the provider address or it will be failed.
    function stopProviding(uint256 provID) public returns (bool) {
        // If the sender is currently an active provider
        bool flag = false;
        if (providerList[provID].available == true                 //can only stop available provider
                && providerList[provID].addr == msg.sender) {      //you cannot delete other's provider            
            delete providerList[provID];                           //delete from List
            flag = ArrayPop(providerMap[msg.sender], provID);      //delete form Map
            flag = ArrayPop(providerPool, provID) && flag;         //delete from Pool             
        }
        if(flag) emit ProviderStopped(provID, msg.sender);
        return flag;
    }
    //update a provider, you must know the provID and must sent from right addr
    function updateProvider(uint64 maxTime, uint16 maxTarget, uint64 minPrice, uint256 provID) public returns (bool) {      
        bool flag = false;
        if(providerList[provID].available == true           //can only modify available provider
        && providerList[provID].addr != msg.sender){        //you are modify other's config
            providerList[provID].blockNumber    = block.number;         
            providerList[provID].maxTime        = maxTime;       
            providerList[provID].maxTarget      = maxTarget;
            providerList[provID].minPrice       = minPrice;
            //update pool       -- pop then push , because we need to scan pool anyway
            flag = ArrayPop(providerPool,provID);           // pop first                                      
            providerPool.push(provID);                      // push in both case anyway
            //update map -- no need provID not changed.
            emit ProviderUpdated(provID, msg.sender);
            return flag;
        }
    }*/

    // Send a request from user to blockchain.
    // Assumes price is including the cost for verification
    function startRequest(uint64 time, uint16 target, uint64 price, uint64 dataID) payable public returns (bool) {
        //register on List
        requestList[msg.sender].reqID         = requestCount;
        requestList[msg.sender].blockNumber   = block.number;  
        requestList[msg.sender].provider      = address(0);      
        requestList[msg.sender].time          = time;    
        requestList[msg.sender].target        = target;
        requestList[msg.sender].price         = price;
        requestList[msg.sender].dataID        = dataID;
        requestList[msg.sender].numValidationsNeeded = 1;
        requestList[msg.sender].status = '0' ;     //pending 0x30, not 0
        pendingPool.push(msg.sender);
        emit SystemInfo (msg.sender, "Request Added");
        
        //update count
        requestCount++;     
        
        assignTask(msg.sender);
        return true;
    }

/*
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
*/

    // Search in the requestPool, find a job for current provider. Triggered by startProviding
    // Return true if a match or false if not.
    // Returns: 0: successfully assigned
    //          1: searched all providers but find no match
    //          2: no available provider right now
    //          3: failure during poping pool
    function assignProvider(address payable addr) private returns (byte){
        if(pendingPool.length == 0) return '2';
        else {
            //search throught the requestPool
            for (uint64 i = 0; i < pendingPool.length; i++){
                //save the re-usable reqID , may save gas
                address payable reqAddr = pendingPool[i];    
                if( requestList[reqAddr].time     < providerList[addr].maxTime &&
                    requestList[reqAddr].target   < providerList[addr].maxTarget &&
                    requestList[reqAddr].price    > providerList[addr].minPrice){
                        //meet the requirement, assign the task
                        //update provider
                        providerList[addr].available = false;
                        ArrayPop(providerPool, addr);

                        //update request
                        requestList[reqAddr].provider = addr;
                        requestList[reqAddr].status = '1';    //providing
                        ArrayPop(pendingPool, reqAddr);

                        //update balanceList            addr here is requester's
                        balanceList[reqAddr] += requestList[reqAddr].price; 
                                               
                        //status move from pending to providing
                        emit PairingInfo(reqAddr, addr, "Request Assigned");
                        return '0';                   
                }                
            }
            //after for loop and no match
            return '1';
        }
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
    }
*/

    // Assigning one task to one of the available providers. Only called from requestTask (private)
    // Search in the providerPool, if no match in the end, return false
    //could only assign one task at a time
    //auto sel the first searching result for now, no comparation between multiple availability.
    //TODO: need ot add preference next patch
    // Returns: 0: successfully assigned
    //          1: searched all providers but find no match
    //          2: no available provider right now
    //          3: failure during poping pool
    function assignTask(address payable reqID) private returns (byte) {
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
                        ArrayPop(providerPool, addr);

                        //update request
                        requestList[reqID].provider = addr;
                        requestList[reqID].status = '1';    //providing
                        ArrayPop(pendingPool, reqID);

                        //update balanceList              
                        balanceList[reqID] += requestList[reqID].price; 

                        //EVENT
                        emit PairingInfo(reqID, addr, "Request assigned"); // Let provider listen for this event to see he was selected
                        return '0';
                    }
                }
            }
            // No provider was found matching the criteria -- request failed
            //requestList[reqID].addr.transfer(requestList[reqID].price); // Returns the ether to the sender
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
    /*function AddrArrayPop(address payable [] storage addrArray, uint256 target) private returns(bool) {
        for(uint64 i = 0; i < addrArray.length; i++){
            if (addrArray[i] == target) {
                //swap last element with hole
                addrArray[i] = addrArray[addrArray.length-1];
                //delete last item
                delete addrArray[addrArray.length-1];
                 //decrease size
                addrArray.length--;
                return true;
            }
        }
        return false; //fail to search: no matching in pool
    }*/

    function ArrayPop(address payable [] storage array, address payable target) private returns (bool) {
        for(uint64 i = 0; i < array.length; i++){
            if (array[i] == target) {
                //swap last element with hole
                array[i] = array[array.length-1];
                //delete last item
                delete array[array.length-1];
                //decrease size
                array.length -= 1;
                return true;
            }
        }
        return false;   //fail to search: no matching in pool
    } /*
    function getMyProvID() public view returns (uint256[] memory){
        return providerMap[msg.sender];
    }
    function getMyReqID() public view returns (uint256[] memory){
        return requestMap[msg.sender];
    }
    function getProviderID(address addr) public view returns (uint256[] memory){
        return providerMap[addr];
    }
    function getRequestID(address addr) public view returns (uint256[] memory){
        return requestMap[addr];
    }*/

    /////////////////////////////////////////////////////////////////////////////////
    //some helpers defined here
/*    function testTask() public {
        emit TaskAssigned(msg.sender, 11, 22);
    }
    function getProvider(uint256 ID) public view returns(Provider memory){
        return providerList[ID];
    }
    function getRequest(uint256 ID) public view returns (Request memory){
	    return requestList[ID];
    }
    function getProviderCount() public view returns (uint256){
        return providerCount;
    }
    function getRequestCount() public view returns (uint256){
        return requestCount;
    }
*/
    function getProviderPool() public view returns (address payable [] memory){
        return providerPool;
    }
    function getPendingPool() public view returns (address payable [] memory){
        return pendingPool;
    }
    function getValidatingPool() public view returns (address payable [] memory){
        return validatingPool;
    }
    function getProvidingPool() public view returns (address payable [] memory){
        return providingPool;
    }

    function getProviderPoolSize() public view returns (uint256){
        return providerPool.length;
    }
    function getRequestPoolSize() public view returns (uint256){
        return pendingPool.length;
    }

/*
    //function getBalance(address addr) public view returns (uint256){
    //    return balanceList[addr];
    //}
    function listRequests(uint256[] memory IDList) public view returns(Request[50] memory){
	    Request[50] memory allRequest;
	    for (uint64 i = 0; i < IDList.length; i++){
		    allRequest[i] = getRequest(IDList[i]);
	    }
	    return allRequest;
    }
    function listProviders(uint256[] memory IDList) public view returns(Provider[50] memory){
        Provider[50] memory allProvider;
        //address addr;
        for (uint64 i = 0; i < IDList.length;i++){
            allProvider[i] = getProvider(IDList[i]);
        }
        return allProvider;
    }
    function listAllRequests() public view returns(Request[50] memory){
	    Request[50] memory allRequest;
	    for (uint64 i = 0; i < requestCount; i++){
		    allRequest[i] = getRequest(i);
	    }
	    return allRequest;
    }
    function listAllProviders() public view returns(Provider[50] memory){
	    Provider[50] memory allProvider;
	    for (uint64 i = 0; i < providerCount; i++){
		    allProvider[i] = getProvider(i);
	    }
	    return allProvider;
    }
    function listProviders() public view returns(Provider[50] memory){
        Provider[50] memory allProvider;
        //address addr;
        for (uint64 i = 0; i < providerCount;i++){
            if(providerPool.length > 0) {
                addr = providerPool[i];     
            }else {
                addr = address(0);
            }
            allProvider[i] = getProvider(i);
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
