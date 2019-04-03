/////////////////////////////////////////////////////////////////////////////////////
//version 2.0.2
//Author: Taurus, Samuel Pritchett
//Copyright: tlu4@lsu.edu
//
//This is the formal release of v2.0, comments updated on Feb.2019
//
///////////////////////////////////////////////////////////////////////////////////////
//NOTE:
//This design uses account address as the identifier, meaning each address could only have one req/prov associated.
//When submit new or update existing req/prov, previous record are overwriten.
//Each address could only have one req or prov, not at same time.
//On the other hand, reqID and provID is just a counter, not an identifier. Update or resubmition results in new reqID/provID.

//TODO: add conflict detection of the address. Check whether existing req or prov from your address is 'not complete',(being proccessed).
////////////////////////////////////////////////////////////////////////////////////

pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;           //enable returning self-defined type, 
                                            //do not disable, provider is returned for debuging reason.

contract TaskContract {
    //list
    mapping (address => Provider) public providerList;   //provAddr => provider struct
    mapping (address => Request)  public requestList;    //reqAddr => request struct
    mapping (address => uint256)  public balanceList;    //reqAddr => balance   
 
    //ID - counter
    uint256 private providerCount;                       //+1 each time
    uint256 private requestCount;

    constructor() public {                               //sol 5.0 syntax
        providerCount = 0;
        requestCount = 0;
    }

    struct Request {
        uint256 reqID;                      //requestID is not identifier, just a counter
        uint256 blockNumber;                //record the time of submission
        address payable provider;           //record the provider assigned to this request
        uint64  time;                       //maximum time requirements                 TODO: determine the unit and format
        uint16  target;                     //target 0-100.00                           TODO: determine the unit and format
        uint256 price;                      //the max amount he willing to pay          TODO: determine the unit and format
        bytes   dataID;                     //dataID used to fetch the off-chain data, interact with ipfs
        bytes   resultID;                   //dataID to fetch the off-chain result, via ipfs
        uint64  numValidations;             //user defined the number of validation, TODO: fix this as 3 
        address payable []  validators;     //addresses from validations, collect validator no matter valid or not
        bool[]  signatures;                 //true or false array, associated with validator list above
        bool    isValid;                    //the final flag
        byte    status;                     //one byte indicating the status: 0: 'pending', 1:'providing', 2: 'validating', 3: 'complete'
    }

    struct Provider {
        uint256 provID;                     //just a counter
        uint256 blockNumber;                //record the time of submission
        uint64  maxTime;                    //max time he is willing to accept, maxTime of Prov's should be larger than Req's to successfully assign
        uint16  maxTarget;                  //max target he can provide
        uint256 minPrice;                   //lowest price he can accept
        bool    available;                  //if ready to be assigned
    }


    //two types of events, only difference is # of returned address
    //no need seperate events for each type, just put whatever info passed in bytes info
    event IPFSInfo          (address payable reqAddr, bytes info, bytes extra);
    event SystemInfo        (address payable reqAddr, bytes info);
    event PairingInfo       (address payable reqAddr, address payable provAddr, bytes info);


    //Pools stores the address of req or prov, thus indicate the stages.
    address payable [] providerPool;        //provAddr only when more providers > req, or empty
    address payable [] pendingPool;         //reqAddr only when more requests > prov, or empty
    address payable [] providingPool;       //reqAddr
    address payable [] validatingPool;      //reqAddr
    /////////////////////////////////////////////////////////////////////////////////////

    
    // Function called to become a provider. Add address on List, and Pool if not instantly assigned. 
    // NOTE: cannot use to update pending providers. 
    // TIPS on gas cost: don't create local copy and write back, modify the storage directly.
    // gas cost 165K without event / 167K with event / 92K overwrite
    function startProviding(uint64 maxTime, uint16 maxTarget, uint64 minPrice) public returns (bool) {
        if(providerList[msg.sender].blockNumber == 0){                  //if this is new
            // register a new provider object in the List and map              
            providerList[msg.sender].provID         = providerCount;    //cost 50k per item edit
            providerList[msg.sender].blockNumber    = block.number;           
            providerList[msg.sender].maxTime        = maxTime;
            providerList[msg.sender].maxTime        = maxTime;       
            providerList[msg.sender].maxTarget      = maxTarget;
            providerList[msg.sender].minPrice       = minPrice;
            providerList[msg.sender].available      = true;             //turn on the flag at LAST in case error
            // ready for the next       
            providerPool.push(msg.sender);
            emit SystemInfo (msg.sender, "Provider Added");
            providerCount++;
            if(validatingPool.length != 0){                           //need to update how validation works before we can prioritize it here
                findValidation(msg.sender);
            }
            assignProvider(msg.sender);                                 //try an instant assignment trial
            return true;
        } 
        else {                                                          //this address has been recorded before
            return updateProvider(maxTime, maxTarget, minPrice);               //this could be an update
            /*  //this is deprecated, use updateFunction instead.
            if(providerList[msg.sender].available == true){             //can only modify available provider
                providerList[msg.sender].blockNumber    = block.number;         
                providerList[msg.sender].maxTime        = maxTime;       
                providerList[msg.sender].maxTarget      = maxTarget;
                providerList[msg.sender].minPrice       = minPrice;
                emit SystemInfo(msg.sender,'Provider Updated');
                assignProvider(msg.sender);
                return true;
            }*/
        }
    }
    // Stop a provider. Must be sent from the provider address or it will be failed.
    function stopProviding() public returns (bool) {
        // If the sender is currently an active provider
        if (providerList[msg.sender].available == true){               //can only stop available provider              
            delete providerList[msg.sender];                           //delete from List
            emit SystemInfo(msg.sender, 'Provider Stopped');
            return ArrayPop(providerPool, msg.sender);                 //delete from Pool                
        }
        else{   
            emit SystemInfo(msg.sender, 'Provider Unable to Stop');
            return false;
        }
    }
    //update a provider, you must know the provID and must sent from right addr
    function updateProvider(uint64 maxTime, uint16 maxTarget, uint64 minPrice) public returns (bool) {      
        if(providerList[msg.sender].available == true){                //can only modify available provider
            providerList[msg.sender].blockNumber    = block.number;         
            providerList[msg.sender].maxTime        = maxTime;       
            providerList[msg.sender].maxTarget      = maxTarget;
            providerList[msg.sender].minPrice       = minPrice;
            emit SystemInfo(msg.sender,'Provider Updated');
            assignProvider(msg.sender);
            return true;
        }
        else{
            emit SystemInfo(msg.sender, 'Provider Unable to Update');
            return false;
        }
    }

    // Send a request from user to blockchain.
    // Assumes price is including the cost for verification
    function startRequest(uint64 time, uint16 target, uint64 price, bytes memory dataID) payable public returns (bool) {
        if(requestList[msg.sender].blockNumber == 0){   //never submitted before
            //register on List
            requestList[msg.sender].reqID         = requestCount;
            requestList[msg.sender].blockNumber   = block.number;  
            requestList[msg.sender].provider      = address(0);      
            requestList[msg.sender].time          = time;    
            requestList[msg.sender].target        = target;
            requestList[msg.sender].price         = price;
            requestList[msg.sender].dataID        = dataID;
            requestList[msg.sender].numValidations = 1;//fixed 3 for testing reasons
            requestList[msg.sender].status = '0' ;     //pending = 0x30, is in ascii not number 0
            pendingPool.push(msg.sender);
            emit SystemInfo (msg.sender, "Request Added");
            
            requestCount++;     
            assignRequest(msg.sender);                  //try an instant assignment
            return true;
        } else {    //submitted before
            return updateRequest(time, target, price, dataID);
            /*if(requestList[msg.sender].status == '0' ){                   //can only update pending request
                requestList[msg.sender].blockNumber    = block.number;         
                requestList[msg.sender].time        = time;       
                requestList[msg.sender].target      = target;
                requestList[msg.sender].price       = price;
                requestList[msg.sender].dataID      = dataID;
                emit SystemInfo(msg.sender, 'Request Updated');
                return true;
            }*/
        }
    }
    function stopRequest() public returns (bool){
        if (requestList[msg.sender].status == '0'){                   //can only cancel owned pending request, ('0' = 0x30)            
            delete requestList[msg.sender];                           //delete from List             
            emit SystemInfo(msg.sender, 'Request Stopped');
            return ArrayPop(pendingPool, msg.sender);                 //delete from Pool   
        }
        else{
            emit SystemInfo(msg.sender, 'Request Unable to Stop');
            return false;
        }
    }
    function updateRequest(uint64 time, uint16 target, uint64 price, bytes memory dataID) payable public returns (bool) {      
        if(requestList[msg.sender].status == '0' ){                   //can only update pending request
            requestList[msg.sender].blockNumber    = block.number;         
            requestList[msg.sender].time        = time;       
            requestList[msg.sender].target      = target;
            requestList[msg.sender].price       = price;
            requestList[msg.sender].dataID      = dataID;
            emit SystemInfo(msg.sender, 'Request Updated');
            return true;
        }
        else{
            emit SystemInfo(msg.sender, 'Request Unable to Update');
            return false;
        }
    }

    // Search in the requestPool, find a job for current provider. Triggered by startProviding
    // Returns: note: return value all in ascii format
    //          0: successfully assigned
    //          1: searched all providers but find no match
    //          2: no available provider right now
    //          3: failure during poping pool
    function assignProvider(address payable provAddr) private returns (byte){
        if(pendingPool.length == 0) return '2';     //no pending requests
        else {
            //search throught the requestPool
            for (uint64 i = 0; i < pendingPool.length; i++){  
                address payable reqAddr = pendingPool[i];     //save the re-usable reqID , save gas by avoiding multiple read
                if( requestList[reqAddr].time     <= providerList[provAddr].maxTime &&
                    requestList[reqAddr].target   <= providerList[provAddr].maxTarget &&
                    requestList[reqAddr].price    >= providerList[provAddr].minPrice){
                        //meet the requirement, assign the task
                        //update provider
                        providerList[provAddr].available = false;
                        ArrayPop(providerPool, provAddr);

                        //update request
                        requestList[reqAddr].provider = provAddr;
                        requestList[reqAddr].status = '1';    //providing
                        ArrayPop(pendingPool, reqAddr);

                        //update balanceList            addr here is requester's
                        balanceList[reqAddr] += requestList[reqAddr].price; 

                        providingPool.push(reqAddr);                       
                        //status move from pending to providing
                        emit PairingInfo(reqAddr, provAddr, "Request Assigned");
                        return '0';                   
                }                
            }
            //after for loop and no match
            return '1';
        }
    }

    // Assigning one task to one of the available providers. Only called from requestTask (private)
    // Search in the providerPool, if no match in the end, return false
    //could only assign one task at a time
    //auto sel the first searching result for now, no comparation between multiple availability.
    //TODO: need ot add preference next patch
    // Returns: 0: successfully assigned
    //          1: searched all providers but find no match
    //          2: no available provider right now
    //          3: failure during poping pool
    function assignRequest(address payable reqAddr) private returns (byte) {
        //provider availability is checked in pool not in list
        if (providerPool.length == 0)   return '2';
        else {            //if any provider in pool
            for (uint64 i = 0; i < providerPool.length; i++) {      
                address payable provAddr  = providerPool[i];   // save the provider's addr, reusable and save gas cost
                if(provAddr != address(0) && providerList[provAddr].available == true){
                    // Check if request conditions meet the providers requirements
                    if (requestList[reqAddr].target <= providerList[provAddr].maxTarget && 
                        requestList[reqAddr].time <= providerList[provAddr].maxTime && 
                        requestList[reqAddr].price >= providerList[provAddr].minPrice) {
                        
                        //update provider:
                        providerList[provAddr].available = false;
                        ArrayPop(providerPool, provAddr);

                        //update request
                        requestList[reqAddr].provider = provAddr;
                        requestList[reqAddr].status = '1';    //providing
                        ArrayPop(pendingPool, reqAddr);

                        //update balanceList              
                        balanceList[reqAddr] += requestList[reqAddr].price; 

                        providingPool.push(reqAddr);
                        emit PairingInfo(reqAddr, provAddr, "Request Assigned"); // Let provider listen for this event to see he was selected
                        return '0';
                    }
                }
            }
            // No provider was found matching the criteria -- request failed
            // TODO: how to return payment is to be discussed in future.
            //requestList[reqID].addr.transfer(requestList[reqID].price); // Returns the ether to the sender
            return '1';
        }
    }


    // Provider will call this when they are done and the result data is available.
    // This will invoke the validation stage. Only when the request got enough validators,
    // that req could be moved from pool and marked. Or that req stays providing
    function completeRequest(address payable reqAddr, bytes memory resultID) public returns (bool) {
        // Confirm msg.sender is actually the provider of the task he claims
        if (msg.sender == requestList[reqAddr].provider) {
            //change request obj
            requestList[reqAddr].status = '2';    //validating
            requestList[reqAddr].resultID = resultID;
            //move from providing pool to validating Pool.
            ArrayPop(providingPool, reqAddr);
            validatingPool.push(reqAddr);
            //release provider (not necessarily depend on provider) back into providerPool
            providerList[msg.sender].available = true;
            providerPool.push(msg.sender);
            emit SystemInfo(reqAddr, 'Request Computation Completed');
            //start validation process
            return validateRequest(reqAddr);
        }
        else {
            return false;
        }
    }

    // Called by assignRequest before finalizing stuff. Contract checks with validators
    // Returns false if there wasnt enough free providers to send out the required number of validation requests
    // need validation from 1/10 of nodes -- could change
    function validateRequest(address payable reqAddr) public returns (bool) {
        uint64 numValidatorsNeeded = requestList[reqAddr].numValidations; 
        //uint numValidators = providerCount / 10; 
        uint64 validatorsFound = 0;
        //select # of available provider from the pool and force em to do the validation
        for (uint64 i = 0; i < providerPool.length; i++) {
            address payable provID = providerPool[i]; //get provider ID
            if(provID != requestList[reqAddr].provider){   //validator and computer cannot be same
                if(requestList[reqAddr].validators.length == 0){ //if there are no validators yet, no need to compare to existing validator
                        //TODO: check whether selected validator capable with parameters (time, accuracy,....)
                        //EVENT: informs validator that they were selected and need to validate
                        emit PairingInfo(reqAddr, provID, 'Validation Assigned to Provider');
                        validatorsFound++;
                        //remove the providers availablity and pop from pool
                        providerList[provID].available = false;
                        ArrayPop(providerPool, provID);
                }
                else{  //previous validator exist in list, try avoiding them.
                        for(uint64 j = 0; j <= requestList[reqAddr].validators.length; j++){   //go through the list of existing validators
                            if(provID != requestList[reqAddr].validators[j]){ //validator cannot be same as existing validator
                                //EVENT: informs validator that they were selected and need to validate
                                emit PairingInfo(reqAddr, provID, 'Validation Assigned to Provider');
                                validatorsFound++;
                                //TODO: Add provider to the validators array for this request
                                requestList[reqAddr].validators.push(provID);
                                //remove the providers availablity and pop from pool
                                providerList[provID].available = false;
                                ArrayPop(providerPool, provID);
                            }
                        }
                    }    
            } else continue;
            //check whether got enough validator
            if(validatorsFound < numValidatorsNeeded){
                continue;
            }
            else{       //enough validator
                emit SystemInfo(reqAddr, 'Enough Validators');
                return true;
                break;
            }
            //loop until certain # of validators selected
        }   
        //exit loop without enough validators    
        emit SystemInfo(reqAddr, 'Not Enough Validators');
    }

    // needs to be more secure by ensuring the submission is coming from someone legit 
    // similar to completeTask but this will sign the validation list of the target Task
    //TODO: the money part is ommited for now
    function submitValidation(address payable reqAddr, bool result) public returns (bool) {
        // Pay the validator 
        // uint partialPayment = requestList[reqID].price / 100; // amount each validator is paid
        // msg.sender.transfer(partialPayment);
        // balanceList[requestList[reqID].addr] -= partialPayment;
        if(msg.sender != requestList[reqAddr].provider) {     //validator cannot be provider
            requestList[reqAddr].validators.push(msg.sender);     //push array
            requestList[reqAddr].signatures.push(result);     //edit mapping
            providerList[msg.sender].available = true;        //release validator
            providerPool.push(msg.sender);
        }
        //emit ValidationInfo(reqID, provID, 'Validator Signed');
        //check if valid
        
        //emit PairingInfo(reqAddr, msg.sender, 'Validator Signed');
        return checkValidation(reqAddr);
        // If enough validations have been submitted
        //if (requestList[reqAddr].validators.length == requestList[reqAddr].numValidations) {
            //return checkValidation(reqID, requestList[reqID].price - requestList[reqID].numValidationsNeeded * partialPayment);
        //}
    }
    
    function checkValidation(address payable reqAddr) public returns (bool) {
        // Add up successful validations
        bool flag = false;
        uint64 successCount = 0;
        for (uint64 i=0; i<requestList[reqAddr].validators.length; i++) {
            if (requestList[reqAddr].signatures[i] == true) successCount++;
        }
        // if 2/3 of validation attempts were successful
        // TODO: determine the fraction
        if (successCount  >= requestList[reqAddr].numValidations) { 
            // if 2/3 of validations were valid then provider gets remainder of money
            //requestList[reqID].provider.transfer(payment); 
            //balanceList[requestList[reqID].addr] -= payment;
            //TODO: [important] leave out the payment part for now.
            requestList[reqAddr].isValid = true; // Task was successfully completed! 
            flag = true;
            emit IPFSInfo(reqAddr, 'Validation Complete', requestList[reqAddr].resultID);
        }
        // otherwise, work was invalid, the providers payment goes back to requester
        //else {
            //requestList[reqID].addr.transfer(payment);
            //balanceList[requestList[reqID].addr] -= payment;
        //}
        // EVENT: task is done whether successful or not
        //emit TaskCompleted(requestList[reqID].addr, reqID);

        //popout from pool
        flag = flag && ArrayPop(validatingPool, reqAddr);
        // TODO : 
        // Add
        return flag;
    }


    // called by startProviding if the validatingPool is not empty
    // assigns the new provider to validate a task
    // IDEA: Could be modified so that any available provider could call. For now it assumes only used on new providers in startProviding
    function findValidation(address payable provAddr) private {
        for(uint64 i = 0; i < validatingPool.length; i++){  //search the entire validatingpool

            address payable reqAddr = validatingPool[i]; //set reqAddr current task

            if(requestList[reqAddr].numValidations > requestList[reqAddr].validators.length){ //check to see if the task has enough validators

                //since the provAddr is a new provider, we don't need to check if he is already a validator, should be impossible unless bug exists

                if(provAddr != requestList[reqAddr].provider){ //check to make sure he is not the computer
                    emit PairingInfo(reqAddr, provAddr, 'Validation Assigned to Provider');
                    requestList[reqAddr].validators.push(provAddr);

                    providerList[provAddr].available = false;
                    ArrayPop(providerPool, provAddr);

                    //alert task owner if their task now has enough validators
                    if(requestList[validatingPool[i]].validators.length == requestList[validatingPool[i]].numValidations){
                        emit SystemInfo(reqAddr, 'Enough Validators');
                    }
                    break;
                }
                //else{}
            }
            //else{}
        }
    }

/////////////////////////////////////////////////////////////////////
    // Used to dynamically remove elements from array of open provider spaces. 
    // Using a swap and delete method, search for the desired addr throughout the whole array
    // delete the desired and swap the hole with last element
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
    }
    /////////////////////////////////////////////////////////////////////////////////
    //some helpers defined here

    function getProvider(address payable ID) public view returns(Provider memory){
        return providerList[ID];
    }
    function getRequest(address payable ID) public view returns (Request memory){
	    return requestList[ID];
    }
    function getProviderCount() public view returns (uint256){
        return providerCount;
    }
    function getRequestCount() public view returns (uint256){
        return requestCount;
    }

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


    //function getBalance(address addr) public view returns (uint256){
    //    return balanceList[addr];
    //}
    function listRequests(address payable[] memory IDList) public view returns(Request[50] memory){
	    Request[50] memory allRequest;
	    for (uint64 i = 0; i < IDList.length; i++){
		    allRequest[i] = getRequest(IDList[i]);
	    }
	    return allRequest;
    }
    function listProviders(address payable[] memory IDList) public view returns(Provider[50] memory){
        Provider[50] memory allProvider;
        //address addr;
        for (uint64 i = 0; i < IDList.length;i++){
            allProvider[i] = getProvider(IDList[i]);
        }
        return allProvider;
    }
/*    function listAllRequests() public view returns(Request[50] memory){
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
*/

}
