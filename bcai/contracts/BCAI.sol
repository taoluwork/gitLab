pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;   //return self-defined type

contract TaskContract {

    uint128 public requestCount;                    //total number of requests sent to contract
    uint128 public providingCount;                  //total number of requests that contract found provider for
    uint64 public providerCount;                    //number of active providers in the mapping below
    mapping (uint64 => Provider) public providerList;   //list of known providers. must apply. maps providerID to struct
    mapping (address => uint64) public providerID;      //look up providerID using address     NOTE: possible not needed
    //NOTE: addr is the only identifier for provider object.
    //However, providerID could possibly be same between different address.
    //e.g. Tom has Two account with addr_1, addr_2, but he could be assigned an unique providerID.

    mapping (uint128 => Request) public requestList;    //mapping requestCount to Request object, requestCount is the unique number used as identifier
    mapping (address => uint64) public requestID;       //look up requestID using address (user's)  NOTE: single user could have multiply requestID

    uint64[] public spaces;                             //Open spaces where providers left. should be filled when new provider comes
    mapping (address => uint256) public balanceList;    //for keeping track of how much money requesters have sent
    
    constructor() public {      //sol 5.0 syntax
        requestCount = 0;
        providingCount = 0;
        providerCount = 0;
    }

    struct Request {
        address payable addr;       //payable is new feature from sol v5.0
        address payable provider;   //addr of worker
        uint128 reqID;              //requestID is the only identifier for each Request
        uint64  dataID;             //dataID used to fetch the off-chain data
        uint64  time;               //time
        uint16  accuracy;           //target 0-100
        uint256 price;              
        uint64  resultID;
        uint64  numValidationsNeeded;
        bool[]  validations;
        bool    isValid;
        bool    isCompleted;
    }

    struct Provider {
        address payable addr;
        uint64  providedCount;
        uint64  requestedCount;
        uint64  maxTime;
        uint16  maxTarget;
        uint256 minPrice;
        bool    available; // Used to determine if provider is already doing something
    }

    event TaskAssigned(address provider, uint128 reqID);        // next step: call completeTask
    event ValidationRequested(address validator, uint128 reqID); // next step: validator calls submitValidation
    event TaskCompleted(address requestor, uint128 reqID);      // done




    // Function called to become a provider of tasks for anyone requesting. 
    // NOTE: does nothing if already a provider - also used to update
    function startProviding(uint64 maxTime, uint16 maxTarget, uint64 minPrice) public {
        // If new provider
        if (providerList[providerID[msg.sender]].addr != msg.sender) { // address is not on the chain
            Provider memory prov = Provider(
		    msg.sender,    //addr 
		    0,             //prividedCount
		    0,             //requestedCount
		    maxTime,       //maxTime
		    maxTarget,     //maxTarget
		    minPrice,      //minPrice
		    true);         //available

            // If there are vacant providerIDs
            if (spaces.length > 0) {
                providerID[msg.sender] = pop(); // Pops the most recently vacated from spaces
            }
            // Else put them at the end of the list
            else {
                providerID[msg.sender] = providerCount;
            }
            // These update either way
            providerList[providerID[msg.sender]] = prov;
            providerCount++;
        }
        else { // Updating old provider -- address is on the chain
            providerList[providerID[msg.sender]].maxTime = maxTime;
            providerList[providerID[msg.sender]].maxTarget = maxTarget;
            providerList[providerID[msg.sender]].minPrice = minPrice;
	    providerList[providerID[msg.sender]].available = true;
        }
    }

    // Treats msg.sender as provider and makes them unavailable for requests
    function stopProviding() public {
        // If the sender is already a valid provider
        if (providerList[providerID[msg.sender]].addr == msg.sender) {
            providerList[providerID[msg.sender]].available = false;
            providerList[providerID[msg.sender]].addr = address(0);
            // checking that theyre not the last provider to register 
            if (providerID[msg.sender] != providerCount-1) {
                // Label ID as vacant
                spaces.push(providerID[msg.sender]);
            }
            providerCount--;
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

    // Used to dynamically remove elements from array of open provider spaces. 
    function pop() private returns(uint64) {
        if (spaces.length < 1) return 0x0;
        uint64 value = spaces[spaces.length-1];
        delete spaces[spaces.length-1];
        spaces.length--;
        return value;
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
            false                   //isCompleted
            );

        //copy the mem var into storage
        requestList[requestCount] = req;        //requestCount used as index here, from 0 to +++
        requestCount++;
        return assignTask(req);
	//return true;
    }

    // Assigning task to one of the available providers. Only called from requestTask (private)
    //function assignTask(uint128 taskID, uint64 dataID, uint16 target, uint64 time, uint256 price) private returns (bool) {


    function assignTask(Request memory req) private returns (bool) {
        for (uint64 i = 0; i<providerCount + spaces.length; i++) {
            // Check if they are active provider
            if (providerList[i].addr == address(0)) {
                continue;
                
            }
            // Check if request conditions meet the providers requirements
            else if (req.accuracy <= providerList[i].maxTarget && 
                    req.time <= providerList[i].maxTime && 
                    req.price >= providerList[i].minPrice && 
                    providerList[i].available) {
                
                // records how much money the requester sent                
                balanceList[req.addr] += req.price; 
                
                //update request
                req.provider = providerList[i].addr;
                requestList[req.reqID] = req; // save to mapping of requests 
                //requestCount++;       //done in RequestTask function
                //NOTE: assign existing task should not increase the # of requestCount

                providerList[i].available = false;
                

                //EVENT
                emit TaskAssigned(req.provider, req.reqID); // Let provider listen for this event to see he was selected
                return true;
            }
        }
        // No provider was found matching the criteria -- request failed
        req.addr.transfer(req.price); // Returns the ether to the sender
        return false;
    }





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




    /////////////////////////////////////////////////////////////////////////////////
    //some helpers defined here
    function getProviderAddr(uint64 proID) public view returns (address) {
        return providerList[proID].addr;
    }
    function getProviderID(address inAddr) public view returns(uint64){
        return providerID[inAddr];
    }
    function testTask() public {
        emit TaskAssigned(msg.sender, 1);
    }

    function getProvider(uint64 proID) public view returns(Provider memory){
        return providerList[proID];
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
   
    
    function listRequests() public view returns(Request[3] memory){
	    Request[3] memory allRequest;
	    for (uint64 i = 0; i < 3; i++){
		    allRequest[i] = getRequest(i);
	    }
	    return allRequest;
    }
    function listProviders() public view returns(Provider[3] memory){
        Provider[3] memory allProvider;
        //Provider memory localPro;
        //allProvider[0] = getProvider(0);
        //allProvider[1] = getProvider(1);
        //allProvider[2] = getProvider(2);
        //allProvider[0] = getProvider(0);
        //allProvider[1] = getProvider(1);
        //NOTE: for loop is not functional here
        //Must be a bug, return invalid VM opcode error
        for (uint64 i = 0; i < 3;i++){
            allProvider[i] = getProvider(i);
        }
        return allProvider;
    }
}
