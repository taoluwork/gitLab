//BCAI main solidity contract
//Author: Taurus, Landry
//Copyright: tlu4@lsu.edu

//version 0.9.5
//support validation;

//NOTE: functions sending TX cannot retrieve returnValues, only possible way is event
// Instead function calls can return value directly.

pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;   //return self-defined type

contract TaskContract {
    //config
    bool autoAssign = true;            //whether auto assign the task
    bool autoValidate = true;         //whether auto pair validation
    bool autoFinalization = false;
    //uint8 validates = 8;
    
    
    //list
    mapping (uint256 => Provider) public providerList;  //history
    mapping (uint256 => Request) public requestList;    //history
    
    //mapping address with ID       //editing these mapping cost a lot
    mapping (address => uint256[])  public providerMap;
    mapping (address => uint256[])  public requestMap;
 
    mapping (uint256 => uint256) public balanceList;    //reqID => balance
    
    //ID - counter
    uint256 private providerCount;     //+1 each time
    uint256 private requestCount;
    //Pool: providers can be removed from the pool but requests must be in one of the pool
    uint256[] providerPool;     //providers
    uint256[] pendingPool;      //requests
    uint256[] providingPool;    //requests
    uint256[] validatingPool;   //requests
    uint256[] donePool;         //requests  //NOTE: [Important] this array could increase unlimitedly -- only for testing

    
    

    constructor() public {      //sol 5.0 syntax
        delete providerPool;
        delete pendingPool;
        delete providingPool;
        delete validatingPool;
        providerCount = 0;
        requestCount = 0;
    }

    struct Request {
        uint256 reqID;                  //requestID is the only identifier for each Request
        uint256 blockNumber;
        address payable addr;           //payable is new feature from sol v5.0
        //uint256 assignedProvider;
        address payable provider;        
        //address payable provider;     //addr of worker
        uint64  time;                   //time
        uint16  target;                 //target 0-100.00
        uint256 price;                  //the max amount he can pay
        uint64  dataID;                 //dataID used to fetch the off-chain data
        uint64  resultID;               //dataID to fetch the result
        uint64  numValidations;         //user defined the validation
        //mapping (uint256 => bool) validationList;
        bool[] signatures;
        uint256 [] validators; //multisignature from validations
        bool    isValid;                //the final flag
        byte    status;                 //0: 'pending', 1:'providing', 2: validating, 3: complete, 7: deleted
    }

    struct Provider {
        uint256 provID;
        uint256 blockNumber;
        address payable addr;       //providers address    
                                    //TODO: the provider name registration.
        uint64  maxTime;            //max time
        uint16  maxTarget;          //max target he need
        uint256 minPrice;           //lowest price can accept
        bool    available;          //Used to determine if provider is already doing something
    }
    //event
    //TODO: events optimization: many events have the similar structure, may be combined
    event ProviderAdded     (uint256 provID, address payable addr);
    event ProviderStopped   (uint256 provID, address payable addr);
    event ProviderUpdated   (uint256 provID, address payable addr);
    event TaskAssigned      (uint256 reqID, address payable reqAddr,
                            uint256 provID, address payable provAddr);     // next step: call assignRequest
    
    event RequestAdded      (uint256 reqID, address payable addr);
    event RequestUpdated    (uint256 reqID, address payable addr);
    event RequestCanceled   (uint256 reqID, address payable addr);
    
    //event assignRequest      (uint256 reqID, address payable addr);
    event ValidationAssigned(uint256 reqID, uint256 provID, address payable addr);    // next step: validator calls submitValidation
    event NotEnoughValidation(uint256 reqID);
    //event TaskCompleted         (address requestor, uint128 reqID);    // done
    /////////////////////////////////////////////////////////////////////////////////////
    event SystemInfo        (uint256 ID, address payable addr , bytes info);  //NOTE: bytes32 saves up to 32 charactors ONLY
    event PairingInfo        (uint256 reqID, address payable reqAddr,
                            uint256 provID, address payable provAddr, bytes info);
    event UpdateInfo        (uint256 ID, bytes info);
    /////////////////////////////////////////////////////////////////////////////////////
    // Function called to become a provider. New on List, Map and Pool. 
    // NOTE: cannot use to update. You must stop a previous one and start a new one.
    // TIPS: gas cost: don't create local copy and write back, modify the storage directly.
    function startProviding(uint64 maxTime, uint16 maxTarget, uint64 minPrice) public returns (byte) {
        // register a new provider object in the List and map              
        providerList[providerCount].provID         = providerCount;
        providerList[providerCount].blockNumber    = block.number;
        providerList[providerCount].addr           = msg.sender;             
        providerList[providerCount].maxTime        = maxTime;       
        providerList[providerCount].maxTarget      = maxTarget;
        providerList[providerCount].minPrice       = minPrice;
        
        // add to map       //TODO: this cost 70000 gas
        providerMap[msg.sender].push(providerCount);
        // put it into the pool
        providerPool.push(providerCount);
        providerList[providerCount].available      = true;  //turn on the flag at LAST
        // ready for the next       
        //emit ProviderAdded(providerCount, msg.sender);
        emit SystemInfo(providerCount, msg.sender, 'Provider Added');
        providerCount++;
        //try assign and handle return value
        if(autoAssign) return assignProvider(providerCount-1);

        
    }
    // Stop a provider, Must be sent from the provider address or it will be failed.
    function stopProviding(uint256 provID) public returns (bool) {
        // If the sender is currently an active provider
        bool flag = false;
        if (providerList[provID].available == true                 //can only stop available provider
                && providerList[provID].addr == msg.sender) {      //you cannot delete other's provider            
            //delete providerList[provID];                         //do NOT delete from List, keep a record
            flag = ArrayPop(providerMap[msg.sender], provID);      //delete form Map
            flag = ArrayPop(providerPool, provID) && flag;         //delete from Pool
            providerList[provID].available == false;             
        }
        if(flag) //{emit ProviderStopped(provID, msg.sender);
            emit SystemInfo(providerCount, msg.sender, 'Provider Stopped');
        return flag;
    }
    //update a provider, you must know the provID and must sent from right addr
    function updateProvider(uint64 maxTime, uint16 maxTarget, uint64 minPrice, uint256 provID) public returns (bool) {      
        bool flag = false;
        if(providerList[provID].available == true           //can only modify available provider
        && providerList[provID].addr == msg.sender){        //you cannot modify other's config
            providerList[provID].blockNumber    = block.number;         
            providerList[provID].maxTime        = maxTime;       
            providerList[provID].maxTarget      = maxTarget;
            providerList[provID].minPrice       = minPrice;
            //update pool       -- pop then push , because we need to scan pool anyway
            flag = ArrayPop(providerPool,provID);           // pop first                                      
            providerPool.push(provID);                      // push in both case anyway
            //update map -- no need provID not changed.
            //emit ProviderUpdated(provID, msg.sender);
            emit SystemInfo(providerCount, msg.sender, 'Provider Updated');
            return flag;
        }
    }

    // Send a request from user to blockchain. (legacy name : RequestTask)
    // Assumes price is including the cost for verification
    function startRequest(uint64 dataID, uint16 target, uint64 time) payable public returns (byte) {
        //register on List
        requestList[requestCount].reqID         = requestCount;
        requestList[requestCount].blockNumber   = block.number;  
        requestList[requestCount].addr          = msg.sender;
        requestList[requestCount].provider      = address(0);      
        requestList[requestCount].time          = time;    
        requestList[requestCount].target        = target;
        requestList[requestCount].price         = msg.value;
        requestList[requestCount].dataID        = dataID;
        //requestList[requestCount].resultID  = 0;
        requestList[requestCount].numValidations = 1;
        //requestList[requestCount].validations = emptyArray;
        //requestList[requestCount].isValid   = false;
        
        //add new to map
        requestMap[msg.sender].push(requestCount);
        
        //add new to requestPool
        pendingPool.push(requestCount);
        requestList[requestCount].status = '0' ;     //web3.toAscii([hex])
        //emit RequestAdded(requestCount, msg.sender);       
        emit SystemInfo(requestCount, msg.sender,'Request Added');
        requestCount++;
        //try assign and handle return value
        if (autoAssign) return assignRequest(requestCount-1);
    }
    function stopRequest(uint256 reqID) public returns (bool){
        bool flag = false;
        if (requestList[reqID].status == '0'                       //can only cancel pending request
                && requestList[reqID].addr == msg.sender) {        //you cannot delete other's provider            
            //delete requestList[reqID];                           //do NOT delete from List, keep a record
            flag = ArrayPop(requestMap[msg.sender], reqID);        //delete form Map
            flag = ArrayPop(pendingPool, reqID) && flag;           //delete from Pool             
            requestList[reqID].status = '7';                       //'deleted'
        }
        if(flag) 
        //emit RequestCanceled(reqID, msg.sender);
            emit SystemInfo(reqID, msg.sender, 'Request Stopped');
        return flag;
    }
    function updateRequest(uint64 time, uint16 target, uint256 reqID) payable public returns (bool) {      
        bool flag = false;
        if(requestList[reqID].status == '0'                 //can only update pending request
        && requestList[reqID].addr == msg.sender){          //you cannot modify other's config
            requestList[reqID].blockNumber    = block.number;         
            requestList[reqID].time        = time;       
            requestList[reqID].target      = target;
            requestList[reqID].price       = msg.value;
            //update pool       -- pop then push , because we need to scan pool anyway
            flag = ArrayPop(pendingPool,reqID);           // pop first                                      
            pendingPool.push(reqID);                      // push in both case anyway
            //update map -- no need provID not changed.
            //emit RequestUpdated(reqID, msg.sender);
            emit SystemInfo(reqID, msg.sender, 'Request Updated');
            return flag;
        }
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////

    // Search in the pendingPool, find a job for current provider. Triggered by startProviding
    // Input: uint256 provider ID
    // Returns: 0: successfully assigned
    //          1: searched all providers but find no match
    //          2: no available provider right now
    //          3: failure during poping pool
    function assignProvider(uint256 provID) private returns (byte){
        //check whether there exists pending requests
        if(pendingPool.length == 0) return '2';
        else {
            //search throught the pendingPool
            for (uint64 i = 0; i < pendingPool.length; i++){
                //save the re-usable reqID , may save gas
                uint256 reqID = pendingPool[i]; //
                if( requestList[reqID].time     < providerList[provID].maxTime &&
                    requestList[reqID].target   < providerList[provID].maxTarget &&
                    requestList[reqID].price    > providerList[provID].minPrice)
                    return assign(reqID, provID);         //emit here btw       
            }
            //after for loop and no match
            return '1';
        }
    }
    
    // Assigning one task to one of the available providers. Only called from startRequest (private)
    // Search in the providerPool, could only assign one task at a time
    // TODO: need to add preference next patch
    // Returns: 0: successfully assigned
    //          1: searched all providers but find no match
    //          2: no available provider right now
    //          3: failure during poping pool
    function assignRequest(uint256 reqID) private returns (byte) {
        //provider availability is checked in pool not in list
        if (providerPool.length == 0)   return '2';
        else {            //if any provider in pool
            for (uint64 i = 0; i < providerPool.length; i++) {
                // save the provider's addr, reusable and save gas cost
                uint256 provID  = providerPool[i];
                if( requestList[reqID].time     < providerList[provID].maxTime &&
                    requestList[reqID].target   < providerList[provID].maxTarget &&
                    requestList[reqID].price    > providerList[provID].minPrice)
                    return assign(reqID, provID);   //emit here btw
            }
            // No provider was found matching the criteria -- request failed
            //requestList[reqID].addr.transfer(requestList[reqID].price); // Returns the ether to the sender
            return '1';
        }       
    }
    
    //supporting function :triggered by assignRequest or assignProvider, do the state change and pool move
    function assign(uint256 reqID, uint256 provID) private returns (byte) {
        //update provider
        providerList[provID].available = false;
        //update request
        requestList[reqID].provider = providerList[provID].addr;
        requestList[reqID].status = '1';    //providing
        //update the pool, move ID#
        bool isPopped = false;
        isPopped = ArrayPop(pendingPool, reqID);
        isPopped = ArrayPop(providerPool, provID) && isPopped;
        if(!isPopped) return '3';
        providingPool.push(reqID);
        
        //update balanceList            addr here is requester's
        balanceList[reqID] += requestList[reqID].price; 
        //emit TaskAssigned(reqID,requestList[reqID].addr,  
        //                provID, providerList[provID].addr);
        emit PairingInfo (reqID,requestList[reqID].addr,  
                provID, providerList[provID].addr, 'Request assigned to Provider');
        return '0';   
    }


    ////////////////////////////////////////////////////////////////////////////////////////
    // off-chain actions happen here!
    // After assignment, provider will fetch off-chain data and 
    // update this action by sending a confirm online, (not necessarily).
    // TODO: function providerGotData() public returns (byte){}
    //
    // Then provider will start computation right now.
    // ....
    // Return the result and call completeRequest
    ////////////////////////////////////////////////////////////////////////////////////////
    //Exceptions: 
    // 1.Computation aborted/fail == retry within time limit
    // 2.timeout == refund request / status: providing -> pending
    // ##$$ Golden Rule: Costomer is God, whoever PAYED must got result or refund.
    // Deal with money using extreme caution!


    // Provider will call this when they are done and the data is available.
    // This will invoke the validation stage
    function completeRequest(uint256 reqID, uint64 resultID) public returns (bool) {
        // Confirm msg.sender is actually the provider of the task he claims
        if (msg.sender == requestList[reqID].provider) {
            //change request obj
            requestList[reqID].status = '2';    //validating
            requestList[reqID].resultID = resultID;
            //move in pool
            bool flag = false;
            flag = ArrayPop(providingPool, reqID);
            if(!flag) return false;
            validatingPool.push(reqID);
            //release provider (not necessarily depend on provider)
            //providerList[providerID[msg.sender]].available = true;
            //emit assignRequest(reqID, msg.sender);
            emit UpdateInfo(reqID, 'Request Computation Completed');
            //start validation process
            if(autoValidate){
                return validateRequest(reqID);
            }else return true;
        }
        else {
            return false;
        }
    }

    // Called by assignRequest before finalizing stuff. Contract checks with validators
    // Returns false if there wasnt enough free providers to send out the required number of validation requests
    // need validation from 1/10 of nodes -- could change
    function validateRequest(uint256 reqID) public returns (bool) {
        uint64 numValidatorsNeeded = requestList[reqID].numValidations; 
        //uint numValidators = providerCount / 10; 
        uint64 validatorsFound = 0;
        //requestList[reqID].numValidationsNeeded = numValidators;
        //select # of available provider from the pool and force em to do the validation
        for (uint64 i = 0; i < providerPool.length; i++) {
            //get provider ID
            uint256 provID = providerPool[i];
            if(providerList[provID].addr != requestList[reqID].provider){   //validator and computer cannot be same
                //EVENT: informs validator that they were selected and need to validate
                emit PairingInfo(reqID, requestList[reqID].addr, 
                        provID, providerList[provID].addr, 'Validation Assigned to Provider');
                validatorsFound++;
                //remove the providers availablity and pop from pool
                providerList[provID].available = false;
                bool flag = ArrayPop(providerPool, provID);
                if (!flag) return false;
            } else continue;
            //check whether got enough validator
            if(validatorsFound < numValidatorsNeeded){
                continue;
            }
            else{       //enough validator
                emit UpdateInfo(reqID, 'Enough validators');
                return true;
                break;
            }
            //loop until certain # of validators selected
        }   
        //exit loop without enough validators
        //emit NotEnoughValidation(reqID);    
        emit UpdateInfo(reqID, 'Not enough validators');
    }
    //////////////////////////////////////////////////////////////
    // some cases here:
    //  1. req is actually false
    //      a. claim true   : cheating
    //      b. claim false  : honest
    //  2. req is actually true
    //      a. claim true   : honest
    //      b. claim false  : not likely
    //////////////////////////////////////////////////////////////


    // needs to be more secure by ensuring the submission is coming from someone legit 
    // similar to completeTask but this will sign the validation list of the target Task
    //TODO: the money part is ommited for now
    function submitValidation(uint256 reqID, uint256 provID, bool result) public returns (bool) {
        // Pay the validator 
        // uint partialPayment = requestList[reqID].price / 100; // amount each validator is paid
        // msg.sender.transfer(partialPayment);
        // balanceList[requestList[reqID].addr] -= partialPayment;
        if(msg.sender != requestList[reqID].provider) {     //validator cannot be provider
            requestList[reqID].validators.push(providerMap[msg.sender][0]);     //push array
            requestList[reqID].signatures.push(result);     //edit mapping
        }
        //emit ValidationInfo(reqID, provID, 'Validator Signed');
        //check if valid
        
        emit PairingInfo(reqID, requestList[reqID].addr, 
                    provID, providerList[provID].addr, 'Validator Signed');
       
        // If enough validations have been submitted
        if (requestList[reqID].validators.length == requestList[reqID].numValidations) {
            //return checkValidation(reqID, requestList[reqID].price - requestList[reqID].numValidationsNeeded * partialPayment);
            if(autoFinalization) return checkValidation(reqID);
        }
    }
    
    function checkValidation(uint256 reqID) public returns (bool) {
        // Add up successful validations
        bool flag = false;
        uint64 successCount = 0;
        for (uint64 i=0; i<requestList[reqID].validators.length; i++) {
            if (requestList[reqID].signatures[i] == true) successCount++;
        }
        // if 2/3 of validation attempts were successful
        // TODO: determine the fraction
        if (successCount  >= requestList[reqID].numValidations) { 
            // if 2/3 of validations were valid then provider gets remainder of money
            //requestList[reqID].provider.transfer(payment); 
            //balanceList[requestList[reqID].addr] -= payment;
            //TODO: [important] leave out the payment part for now.
            requestList[reqID].isValid = true; // Task was successfully completed! 
            flag = true;
        }
        // otherwise, work was invalid, the providers payment goes back to requester
        else {
            //requestList[reqID].addr.transfer(payment);
            //balanceList[requestList[reqID].addr] -= payment;
        }
        // EVENT: task is done whether successful or not
        //emit TaskCompleted(requestList[reqID].addr, reqID);
        emit UpdateInfo(reqID, 'Validation Complete');
        //popout from pool
        flag = flag && ArrayPop(validatingPool, reqID);

        return flag;
    }

//////////////////////////////////////////////////////////////////////
/*  function startRequest(uint64 dataID, uint16 target, uint64 time) payable public returns (bool) {
    //a legacy version of startRequest, using a local memory copy and write back
    //NOTE: [important] this method may take most gas cost. Take this as an example
    //Conclusion: only modify the necessary mapping item.
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
        return assignRequest();
    }
*/
/////////////////////////////////////////////////////////////////////
    // Used to dynamically remove elements from array of open provider spaces. 
    // Using a swap and delete method, search for the desired addr throughout the whole array
    // delete the desired and swap the whole with last element
    function ArrayPop(uint256[] storage array, uint256 target) private returns (bool) {
        for(uint64 i = 0; i < array.length; i++){
            if (array[i] == target) {
                //swap last element with hole
                array[i] = array[array.length-1];
                //delete last item
                delete array[array.length-1];
                //decrease size
                array.length--;
                return true;
            }
        }
        return false;   //fail to search: no matching in pool
    } 
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
    }

    /////////////////////////////////////////////////////////////////////////////////
    //some helpers defined here
    /*function testTask() public {
        emit TaskAssigned(msg.sender, 11, 22);
    }*/
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
    function getProviderPool() public view returns (uint256[] memory){
        return providerPool;
    }
    function getRequestPool() public view returns (uint256[] memory){
        return pendingPool;
    }
    function getProvidingPool() public view returns (uint256[] memory){
        return providingPool;
    }
    function getValidatingPool() public view returns (uint256[] memory){
        return validatingPool;
    }
    function getProviderPoolSize() public view returns (uint256){
        return providerPool.length;
    }
    function getRequestPoolSize() public view returns (uint256){
        return pendingPool.length;
    }
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
            /*if(providerPool.length > 0) {
                addr = providerPool[i];     
            }else {
                addr = address(0);
            }*/
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
