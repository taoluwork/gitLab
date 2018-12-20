# bcai
//version 0.9.5
//Author: Taurus
//copyright: tlu4@lsu.edu
//status: updating, expected to release v1.0
// may expand to a yellowpaper


Smart contract description on blockchain AI(BCAI):
This project aims at building a sharing computation resourse sharing system based on blockchain technology.

Overall Desgin:
Nodes:
A: user (requester), who has task need to be computed;
	Task will be saved on the contract storage as a struct Request.	
B: worker (provider), who can do task and get payment
	Contract maintains a dynamic list of active providers -- you can leave and rejoin at any time.
C,D,E: validators to validate whether result from B is acceptable.
	In the contract, providers that are not currently assigned a task are considered validators.
X: the smart contract itself.


Message flow:
B,C --startProvider-> X         emit Provider Added
A --requestTask-> X             emit Request Added
X --assignTask-> B              emit Request Assigned
B --completeTask-> X            emit Computation Complete
X --validateTask-> C,D          emit Validation Assigned
C,D --submitValidation--> X     emit Validation Complete
X --checkValidation-> All (public)

Status:
	The lifetime of Request is defined as 'Pending', 'providing', 'validating', 'complete'
	byte Request.status is defined as follows:
		0: 'pending',
		1: 'providing',
		2: 'validating',
		3: 'complete'

Struct and list:
	struct Request;
	struct Provider;
	
	uint256 public providerCount; 		//overall counter for providers	
	uint256 public requestCount;		//overall counter for requests			
	
	uint256[] public providerPool;      //tracing the active           
    uint256[] public pendingPool;		//tracking the active
    uint256[] providingPool;            //requests being computed
    uint256[] validatingPool;           //requests being validated
    uint256[] donePool;                 //may not used

	mapping (uint256 => Provider) public providerList;  //history
    mapping (uint256 => Request)  public requestList;   //history
    
    //mapping address with ID       //NOTE:editing these mapping cost a lot
    mapping (address => uint256[])  public providerMap;
    mapping (address => uint256[])  public requestMap;
    mapping (uint256 => uint256) public balanceList;    //reqID => balance
	
	
	


Smart contract Design:
    struct Request {
        uint256 reqID;                  //requestID is the only identifier for each Request
        uint256 blockNumber;
        address payable addr;           //payable is new feature from sol v5.0
        address payable provider;        
        uint64  time;                   //time
        uint16  target;                 //target 0-100.00
        uint256 price;                  //the max amount he can pay
        uint64  dataID;                 //dataID used to fetch the off-chain data
        uint64  resultID;               //dataID to fetch the result
        uint64  numValidations;         //user defined the validation
        bool[]  signatures;
        uint256[] validators;           //multisignature from validations
        bool    isValid;                //the final flag
        byte    status;                 //0: 'pending', 1:'providing', 2: validating, 3: complete, 7: done
    }

    struct Provider {
        //TODO: the provider name registration.
        uint256 provID;
        uint256 blockNumber;
        address payable addr;           //providers address    
        uint64  maxTime;                //max time
        uint16  maxTarget;              //max target he need
        uint256 minPrice;               //lowest price can accept
        bool    available;              //Used to determine if provider is already doing something
    }
    //event
    event SystemInfo    (uint256 ID, address payable addr , bytes info);
    event PairingInfo   (uint256 reqID, address payable reqAddr,
                            uint256 provID, address payable provAddr, bytes info);


Global mappings:	
	ProviderList records every provider registered on the blockchain history. The unique ID is the providerCount, which increase by 1 when add a new item but never decrease. Update provider did not update the count, stop provider did not decrease the count. So is requestList

    providerMap and RequestMap mapping the address to the unique ID, this is because one single address could fire multiple request or provider instance.
	
	
    
	
	
	
	
The whole scenario is working in following steps:
0. Deploy X to the blockchain
	Constructor is called,
	list, pool, array initialized.
	count initialized.
	
1. submit a task or add a provider	

1.1 node B startProviding(maxTime, maxTarget, minPrice)..
	PSUEDOCODE
	check new or existed provider
	new {
		update providerList: set up new config
		update providerID //for now , disable one ID refer to multiple address
		update pool
		increase count
	existed{
		update config
	wait to be assigned.



1.2 node A send requestTask to X
	requestTask(uint64 dataID, uint16 target, uint64 time) payable public returns (bool)
		1. dataID	//Let’s say raw data is stored off-chain. Use this ID to achieve data
		2. target	//error target defined by A, lets say this is a fixed length percentage. E.g. correction rate = 95.1234%, then target = 951234. Correct rate greater than this is acceptable.
		3. time		//time need to be done, deadline = Timelimit + now.
		4. msg.value 	//the money willing to pay, this is passed in the value field of the Tx and saved in requestors balance
	
	Here the contract will create a struct Request using the parameters with the following values:
	struct Request {
		address addr; 			//msg.sender - address of the requestor
		address provider;		//0x0 - updateed in assignTask if an available provider is found
		uint128 reqID;			//requestCount -- global counter
		uint64 dataID;			//parameter passed in as dataID
		uint64 time;			//parameter passed in as time
		uint16 accuracy;		//parameter passed in as target
		uint256 price; 			//parameter passed in as msg.value
		uint64 resultID;		//0 - changed in completeTask
		uint64 numValidationsNeeded; 	//0 - changed when provider submits results and validations are needed
		bool[] validations;		//emptyArray - filled in submitValidation calls
		bool isValid;			//false - changed in checkValidation
		byte status;			//set to '0' (pending) when submitted
    	}
	
PSUEDOCODE
	init emptyArray (for multi-sig)
	init Request req.
	update list, pool, count.
	write to storage mapping.
	return assignTask(req)
	//NOTE: sequence of execution is important. In case of running out of gas, modifying the storage should
	//be the last step.
	
	
2. contract X executes assignTask or findRequest
2.1 assignTask when task submitted.
	assignTask( ) private returns (byte)
	//assignTask should be triggered whenever new Request submitted, searching through the active provider pool.
	//Return '0' if find a match and assigned.
	//Return '1' if no match
	//Return '2' if no available provider.
	//called by requestTask() -- private.
	
	
	
PSUEDOCODE
	check pool: if any availabel provider 
	For each entry of provider pool:
		get the provider's address from Pool(array)
		get the provider's object from the List(mapping)
		if (available && meet requirements)
			//update providerList
			provider.availability = false	//exec first to lock this provider
			providerPOP
			//update reqList
			update Request.provider
			status '0' to '1', pending to providing
			requestPOP
			
			update balancesList
			update count
			emit event for provider to see and act upon
			return '0'
		else
			try next provider entry in mapping //for loop
	//upon failing to find provider (loop exited)
	//send ether back to requestor	//handling ether is not fully considered and tested.
	return '1'
	if loop fail due to empty Pool, return '2'
		
2.2 findRequest when new provider added.
	findRequest(Provider memory prov) private returns (byte)
	//Should be triggered whenever new provider added, searching through the active requestPool.
	//Return '0' if find a match and assigned.
	//Return '1' if no match
	//Return '2' if no available request.
	//called by startProviding() -- private.

PSUEDOCODE
	For each entry of request pool:
		get the request's reqID from Pool(array)
		get the request's object from the List(mapping)
		if (meet requirements)
			provider.availability = false	//exec first to lock this provider
			update Request.provider
			status '0' to '1', pending to providing
			save request to mapping
			
			update balancesList
			update count
			emit event for provider to see and act upon
			return '0'
		else
			try next request entry in mapping //for loop
	//upon failing to find request (loop exited)
	//send ether back to requestor		//handling ether should be very careful
	return '1'
	if loop fail due to empty Pool, return '2'
		
2.3 TODO: maybe we can extract the common part of the previous two and put it into
	function assgin(Request memory, Provider memory) private returns(bool)
	
	
3. B sees event with his address, does the requested computation then sends completeTask to X
	//event-listening,
	// -->check<--  // dev , test
	
	
	//computation offchain
	
	//completeTask
	completeTask(uint128 reqID, uint64 resultID) public returns (bool)
	1. reqID - the unique ID of the request that is being completed
	2. resultID - similar to dataID. Let’s say raw data is stored off-chain. Use this ID to achieve data
	
	This function confirms that the msg.sender was the original chosen provider then calls validateTask if they were.
	Also sets the provider to be available for a new request again.
	
	PSUEDOCODE
	If msg.sender is the provider of request reqID
		update request.complete
		update request.resultID
		provider.available = true
		return validateTask(reqID)
	else 
		return false







//////////////////////////////////////////////update stop here
4. X executes validateTask
	validateTask(uint128 reqID) private returns (bool)
	1. reqID - unique ID of the request that is being validated
	
	This function selects a certain number of providers to validate the work done by the provider B.
	If not enough providers are available for validation then the function returns false and the provider remains unavailable
	Each validator gets paid a predetermined amount of the original offering from the requestor.
	
	PSUEDOCODE
	validatorsFound = 0
	update request.numValidationsNeeded (possibly 1/10th of total providers, but set to 3 right now)
	For each entry in the provider mapping until validatorsFound == numValidators:
		if provider is real and available
			emit event for validator to see and act upon (nodes C,D,E)
			incrememnt validatorsFound
		else 
			try next provider entry in mapping
	if validatorsFound == numValidators return true
	else return false
	
	
5. C,D,E see event to validate with their address, do computation, and send result to submitValidation
	submitValidation(uint128 reqID, bool result) public returns (bool)
	1. reqID - unique ID used to refer to request being validated
	2. result - true or false, whether results were validated or not
	
	CURRENTLY DOES NOT CHECK WHETHER THE VALIDATORS WERE THE ACTUAL ONES CHOSEN
	ALSO DOES NOT ALSO HAVE A RETURN VALUE -- COULD BE BAD
	
	This function takes in validation results and saves them into the validations array within the request struct
	When the contract sees that enough validations have been submitted it will call checkValidation to determine if the provider is paid.
	
	
	PSUEDOCODE
	init partialPayment - the amount each validator gets paid (currently 1/100th of original offer)
	pay validator and deduct the cost from requestors on-contract balance
	push result onto request.validations array
	if all the validations have been submitted
		payment = remaining ether for task after validators are paid
		return checkValidation(reqID, payment)
		

	
6. X calls checkValidation
	checkValidation(uint128 reqID, uint payment) private returns (bool)
	1. reqID - unique ID used to refer to request that was validated
	2. payment - amount of ether that the provider will receive if work is successfully validated
	
	This function looks through each submitted validation and determines if 2/3 of the submissions were successful.
	If so the work was valid, and the provider gets paid.
	Otherwise the validations failed and the requestor gets some of the money back (validators are paid either way)
	
	PSUEDOCODE
	successCount = 0
	for each validation submitted:
		if validation == true
			successCount++
	if successCount >= 2/3 of request.numValidationsNeeded
		send payment to provider and deduct value from requestors on-contract balance
		request.isValid <- true
	else 
		send payment back to requestor and deduct value from his on-contract balance
	emit event saying task is done (whether successful or not) for requestor to see
	return request.isValid
	
	
	
Registration System:
	To become a provider you must register your provider address in the contracts system.
	This works by determining what type of requests you are willing to fulfill 
	and passing this information to the contract via startProviding function.
	
	1. startProviding(uint64 maxTime, uint16 maxTarget, uint64 minPrice) public 
		1. maxTime - max time you are willing to spend on any given request
		2. maxTarget - max accuracy you can be expected to meet for a request
		3. minPrice - minimum price you will complete a request for

		This function allows a new provider to register and also allows an old provider to 
		update their parameters for the type of requests they will do.

		PSUEDOCODE
		if address isnt already a registered provider
			create the provider and add them to first empty space in the mappings
			numProviders++
		else (address was found in mapping)
			update maxTime, maxTarget, minPrice
			
	2. stopProviding() public
		This function will be called when a provider is done offering his cpu to complete tasks.
		It will remove his address from the mappings and create an empty space for a new provider to fill.
		If they were the most recent provider to register then no empty space will be created, just remove them.
		
		PSUEDOCODE
		if sender is a registered provider
			provider.available = false
			provider.addr = 0
			if sender is not the most recent provider to register
				save their index to spaces array so it can be filled by future provider
			numProviders--
			
			
