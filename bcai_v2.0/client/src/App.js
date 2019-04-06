// this is the main entrance of Application
// version: v2.0.2, align with bcai_2.0.2.sol


// TODO: update appearance -- material-ui
// TODO: fix the async function dependency. e.g. Need returned dataID to send Tx
// TODO: use this.state.RequestStartTime to record block# and narrow down the searching range of events

import React, { Component } from "react";
import TaskContract from "./contracts/TaskContract.json";
import getWeb3 from "./utils/getWeb3";
import truffleContract from "truffle-contract";
import ipfs from './ipfs';
import t from 'tcomb-form';
import ReactNotification from "react-notifications-component";
import "react-notifications-component/dist/theme.css";

import "./App.css";
//import { Accounts } from "web3-eth-accounts/types";
//import { userInfo } from "os";
const hex2ascii = require('hex2ascii')

const FormSchema = t.struct({
  time: t.Number,
  target: t.Number,
  price: t.Number,
  account: t.String
})

class App extends Component {
  state = {
    //web3, account, contract instance, update later by setState()
    web3: null,
    accounts: null,
    myAccount: null,
    myContract: null,
    debug: false,
    count: 0,

    //user level variable
    mode: "USER",
    events: [],
    ValidationResult: false,
    Time: 0,
    Target: 0,
    Price: 0,
    dataID: null,
    resultID: null, //TODO
    RequestStartTime: 0,

    //variables to display status
    providerCount: 0,
    pendingCount: 0,
    validatingCount: 0,
    providingCount: 0,
    providerList: null,
    
  };

  constructor(props) {
    super(props)
    this.state = { mode: "USER", };
    //the following bind enable calling the function directly using func() syntax
    //NOTE: adding bind for new added functions is necessary
    this.captureFile = this.captureFile.bind(this);
    this.showPools = this.showPools.bind(this);
    this.ListoutPool = this.ListoutPool.bind(this);
    this.DisplayNonZeroInList = this.DisplayNonZeroInList.bind(this);
    this.TimeChange = this.TimeChange.bind(this);
    this.TargetChange = this.TargetChange.bind(this);
    this.PriceChange = this.PriceChange.bind(this);
    this.submitRequest = this.submitRequest.bind(this);
    this.submitJob = this.submitJob.bind(this);
    this.submitValidation = this.submitValidation.bind(this);
    this.IPFSSubmit = this.IPFSSubmit.bind(this);
    this.changeMode = this.changeMode.bind(this);
    this.changeAccount = this.changeAccount.bind(this);
    this.addNotification = this.addNotification.bind(this);
    this.applyAsProvider = this.applyAsProvider.bind(this);
    this.notificationDOMRef = React.createRef();
  }

  //initiate the page
  componentWillMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();
      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();
      // Get the contract instance.
      const Contract = truffleContract(TaskContract);
      Contract.setProvider(web3.currentProvider);
      const instance = await Contract.deployed();
      console.log("here is the instance " + instance);
      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, myContract: instance, myAccount: accounts[0], events: [] })
      this.setState({Time: 1, Price : 1, Target : 1, count : 0})
      console.log("contract set up!");
      this.showPools();
    }
    catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.log(error);
    }
  };

  //DidMount handel the task after page loaded, omitted here
  /*   componentDidMount = async () => {
      if (this.state.myContract) {
  
      }
    } */
  
  /////// Supporting functions for app ////////////////////////////////////////////////////////////////////
  //NOTE:[important] using => is very important,this pass the context without changing the this ref.
  //https://medium.com/@thejasonfile/callback-functions-in-react-e822ebede766
  //NOTE: event.preventDefault() is important to stop page from refreshing itself after an event happen.
  //[Tutorial] some tricks about async and await: https://flaviocopes.com/javascript-async-await/
  //https://medium.com/codebuddies/getting-to-know-asynchronous-javascript-callbacks-promises-and-async-await-17e0673281ee
  /////////////////////////////////////////////////////////////////////////////////////////////////////////
  TimeChange(event) {
    event.preventDefault();
    this.setState({ Time: event.target.value })
  }
  TargetChange(event) {
    event.preventDefault();
    this.setState({ Target: event.target.value })
  }
  PriceChange(event) {
    event.preventDefault();
    this.setState({ Price: event.target.value })
  }

  //file readers: https://developer.mozilla.org/en-US/docs/Web/API/FileReader
  captureFile(event) {    //using filereader to load file into buffer after selection
    event.preventDefault()
    console.log("capture file")
    const file = event.target.files[0]
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(file)
    reader.onloadend = () => {
      this.setState({ buffer: Buffer(reader.result) })
      console.log("buffer", this.state.buffer);
    }
  }
/*  //call-back style code only for reference [deprecated]
  IPFS = async () =>{
    ipfs.files.add(this.state.buffer, (err, result) => {
      if (err) {
        console.log("IPFS Error!", err);
        this.addNotification("Error", "Your file could not be uploaded. Please choose a file and try again.", "warning");
        return null
      }
      else {
        console.log("ipfsHash returned", result[0].hash)
        this.addNotification("Upload Complete", "File was succesfully added to IPFS! URL/DataID: " + result[0].hash, "success")
        this.setState({ dataID: result[0].hash })
        return result[0].hash
      }
    })
  }
  */
  //Wrap the IPFS api into a promise version, thus can be handled easily later.
  IPFSupload = async() => {
    return new Promise((resolve, reject) => {
      ipfs.files.add(this.state.buffer, (err, result) => {
        if (err) { reject(err) }    //if err, handle using reject function
        else { resolve(result) }    //if no err, handle using resolve
      })                            //NOTE: resolve and rej is provided where IPFSupload is called.
    })
  }
  //submit the file in buffer to the IPFS api
  //NOTE: wrap the callback function file.add() into a promiss-pattern call, see details in below link.
  //https://medium.com/codebuddies/getting-to-know-asynchronous-javascript-callbacks-promises-and-async-await-17e0673281ee
  IPFSSubmit =  async (event) => {  //declare this as async and it will return a promise, even not explicitly
    event.preventDefault();   //stop refreshing
    console.log("submiting...")
    this.addNotification("Uploading file...", "Awaiting response from IPFS", "info");
    let returnHash = await this.IPFSupload()
      .then(result => {
        return result[0].hash
      }).catch(err => {
        console.log("IPFS Error!", err);
        return undefined
      })
    if (returnHash != undefined){
      console.log("ipfsHash returned", returnHash)
      this.addNotification("Upload Complete", "File was succesfully added to IPFS! URL/DataID: " + returnHash, "success")
      this.setState({ dataID: returnHash })
      return returnHash
    }
    else {
      this.addNotification("Error", "Your file could not be uploaded. Please choose a file and try again.", "warning");
      return undefined
    }
  }



  //seach for all events related to current(provider) addr, return the reqAddrs
  matchReq = async (provAddr) => {
    let reqAddr = await this.state.myContract.getPastEvents("allEvents", {fromBlock: 0, toBlock: 'latest'})
      .then(pastEvents => { //NOTE:[IMPORTANT] this.state.event is not updated in this stage
        console.log("returned all events:", pastEvents) 
        if (pastEvents == undefined) return undefined
        else {
          // Look for pairing info events
          for (var i = pastEvents.length - 1; i >= 0; i--) {
            console.log(  "prov", pastEvents[i].args.provAddr)
            console.log(  "req", pastEvents[i].args.reqAddr)
            console.log("provD ", provAddr)
            // Request Addr exist and provAddr matches
            if (pastEvents[i].args.reqAddr && provAddr == pastEvents[i].args.provAddr) {
                return pastEvents[i].args.reqAddr
            }
          }
          return undefined  // not find
        }
      })
      .catch(err => {return err})
      console.log(reqAddr)
      return reqAddr
  }

  //upload the file to IPFS and send the TX at the same time. No addtional button is needed
  submitRequest = async (event) => {
    event.preventDefault();
    //Combine the startRequest with the IPFS, so user do not need click additional button
    let returnHash = await this.IPFSSubmit(event)
    if (returnHash != undefined){
      this.state.myContract.startRequest(this.state.Time, this.state.Target,
        this.state.Price, this.state.web3.utils.asciiToHex(this.state.dataID),
        { from: this.state.myAccount, value: this.state.Price })
        .then(ret => {
          console.log(ret);
          this.addNotification("Blockchain Tx Successful", "Request submitted to contract", "success")
          var StartTime = ret.receipt.blockNumber;  //record the block# when submitted, all following events will be tracked from now on
          this.setState({RequestStartTime : StartTime})
          console.log("Event Tracking start at #", this.state.RequestStartTime)
        })
        .catch(err => {
          console.log(err);
          this.addNotification("Submit Request Failed", "Please check your configuration", "warning")
        })
    }
    else {
      console.log("IPFS return Hash undefined")
    }
//    this.addNotification("Sending Request to Ethereum Blockchain", "You will be notified when the tx is finished", "info");
    
    //print output only after the state setting
    console.log("maxTime = ",   this.state.Time);
    console.log("minTarget = ", this.state.Target);
    console.log("maxPrice = ",  this.state.Price);
    console.log("dataID = ",    this.state.dataID);
  }


  //submitJob will check whether you are assigned a task first.
  //Only if you are assigned, it will send the TX
  //This check is also done in smart contract, you cannot submit result to other's task.
  //Given that, checking in client is still necessary because checking onchain consumes gas.
  submitJob = async (event) => {
    event.preventDefault();
    let reqAddr = await this.matchReq(this.state.myAccount)
    console.log("RequestAddr = ", reqAddr)
    if (reqAddr == undefined){
      this.addNotification("Result Submission Failed", "You are not assigned a task", "warning")
    }
    else {
      let resultHash = await this.IPFSSubmit(event)
      if (resultHash != undefined){
        console.log("ResultHash = ", resultHash)
        this.state.myContract.completeRequest(reqAddr, this.state.web3.utils.asciiToHex(resultHash),
          { from: this.state.myAccount }).then(ret => {
            console.log("Submit Result Return:", ret);
            this.addNotification("Result Submission Succeed", "Work submitted to contract", "success")
          })
      }
      else { console.log("Failed to submit to IPFS")}
    }
  }

  submitValidation = async (event) => {
    event.preventDefault();
    let req = await this.matchReq(this.state.myAccount)
    console.log(req);
    if (req == undefined){
      this.addNotification("Validation Submission Failed", "You are not assigned as Validator", "warning")
    }
    this.state.myContract.submitValidation(req, this.state.ValidationResult,
      { from: this.state.myAccount }).then(ret => {
        console.log(ret);
        this.addNotification("Validation Submission Succeeded", "Validation submitted to contract", "success")
      })
  }

  applyAsProvider(event) {
    event.preventDefault();
    this.addNotification("Worker application submitted!", "Stand by for approval from the contract", "info")
    this.state.myContract.startProviding(this.state.Time, this.state.Target,
      this.state.Price, { from: this.state.myAccount })
      .then(ret => {
        this.addNotification("Worker application approved", "Your computer is now registered on the blockchain", "success")
      })
      .catch(err => {
        console.log(err)
        this.addNotification("Worker application failed", "Please check your configuration", "warning")
      })
  }


  changeMode(event) {
    event.preventDefault()
    if (this.state.mode === "USER"){
      this.setState({ mode: "WORKER" })
      this.setState({ count: 9, myAccount: this.state.accounts[9]})
    } 
    else if (this.state.mode === "WORKER"){
      this.setState({ mode: "USER" })
      this.setState({ count: 0, myAccount: this.state.accounts[0]})
    } 
    else throw String("Setting mode error!")
  }

  changeAccount(event) {
    event.preventDefault();
    this.setState({ myAccount: this.state.accounts[event.target.value] ,
    count: event.target.value})
  }
  ////// Supporting functions for display //////////////////////////////////////////////////////////////////
  showPools() {		//optional [--list] 
    this.state.myContract.getProviderPool.call().then(provPool => {
      console.log("=======================================================");
      console.log("Active provider pool: Total = ", provPool.length);
      console.log(provPool);
      this.setState({ providerCount: provPool.length })
      this.setState({ providerList: provPool })
//      return provPool;
//    }).then(provPool => {
//      if (provPool.length > 0) return this.ListoutPool(provPool, 'provider');
    })


    this.state.myContract.getPendingPool.call().then(reqPool => {
      console.log("=======================================================")
      console.log("Pending pool:  Total = ", reqPool.length);
      console.log(reqPool);
      this.setState({ pendingCount: reqPool.length })
      //return reqPool;
    //}).then(reqPool => {
      //if (reqPool.length > 0) return this.ListoutPool(reqPool, 'request');
    })

    this.state.myContract.getProvidingPool.call().then(providingPool => {
      console.log("=======================================================")
      console.log("Providing pool:  Total = ", providingPool.length);
      console.log(providingPool);
      this.setState({ providingCount: providingPool.length })
      //return providingPool;
//    }).then(providingPool => {
      //if (providingPool.length > 0) return this.ListoutPool(providingPool, 'request');
    })//.then(function(){

    this.state.myContract.getValidatingPool.call().then(valiPool => {
      console.log("=======================================================")
      console.log("Validating pool:  Total = ", valiPool.length);
      console.log(valiPool);
      this.setState({ validatingCount: valiPool.length })
//      return valiPool;
      //})
//    }).then(valiPool => {
      //if (valiPool.length > 0) return this.ListoutPool(valiPool, 'request');
    })
  }

  ListoutPool(Pool, type) {		//--list [--debug]
    //console.log("List out Pool")
    if (type === 'provider') {
      return this.state.myContract.listProviders.call(Pool)
        .then(proList => {
          console.log("-----------------------------------------------------")
          this.DisplayNonZeroInList(proList, 'provider');
        })
    }
    else if (type === 'request') {
      return this.state.myContract.listRequests.call(Pool)
        .then(pendList => {
          console.log("-----------------------------------------------------")
          this.DisplayNonZeroInList(pendList, 'request');
        })
    }
    else throw new Text("Not supported type!")
  }

  DisplayNonZeroInList(List, type) {
    if (type === 'request')
      for (var i = 0; i < List.length; i++) {
        if (List[i]['addr'] !== 0) {
          if (this.state.debug) {
            console.log(List[i]);
            console.log("-----------------------------------------------------")
          } else {
            //simple print:
            console.log("reqID = ", List[i]['reqID']);
            console.log("addr = ", List[i]['addr']);
            console.log("provider = ", List[i]['provider']);
            console.log("status = ", List[i]['status']);
            console.log("-----------------------------------------------------")
          }
        }
      }
    else if (type === 'provider')
      for (var j = 0; j < List.length; j++) {
        if (List[j]['addr'] !== 0) {
          if (this.state.debug) {
            console.log(List[j]);
            console.log("-----------------------------------------------------")
          } else {
            console.log("provD = ", List[j]['provID']);
            console.log("addr = ", List[j]['addr']);
            console.log("available = ", List[j]['available']);
            console.log("-----------------------------------------------------")
          }
        }
      }
    else throw new Text('Not supported type for display')
  }




  // Workflow:


  // Some bugs to note:
  // Validating pool isnt always cleared

  // For validators, account[3] is always skipped, making the validators accounts 1, 2, and 4

  // only 1 validator is currently working - this is because ctrct.getPastEvents() only
  // gets the events that were emitted within the last call to the contract on the blockchain
  // - any events emitted before that call are erased and must be fetched in other ways.

  // The number of provider pool sometimes spontaneously increments when performing certain tasks

  // The code to watch for events needs to be changed entirely most likely




  //USER
  // Ensure User mode is active
  // choose job file 
  // uploads file to ipfs
  // [OPTIONAL] fill out time target price and account
  // submit task to contract
  // eventually check status will print the dataID to fetch from IPFS

  //PROVIDER
  // Ensure Worker mode is active
  // look for notification with dataID/IPFS Hash
  // Fetch the data from ipfs
  // do the computational work to get result data 
  // choose result data file
  // upload result file to ipfs
  // Submit result to contract

  //NEW APPLICANT
  // Ensure Worker mode is active
  // Fill out the time, target and price, and make sure the right account is selected
  // Hit Apply to Become a Provider
  // Await notification 



  // Checking status of account. 
  checkEvents = async () => {
//    console.log(this.state.myContract);
    //let contractEvent = this.state.myContract.PairingInfo();
    let pastEvents = await this.state.myContract.getPastEvents("allEvents", {fromBlock: 0, toBlock: 'latest'});
    console.log("All events:", pastEvents)

    this.setState({
        events: pastEvents
    });
    //this.setState({ events: this.state.events.push(pastEvents)})
    //console.log('here are th events')
    //console.log(this.state.events)
    // For pairing info events
    for (var i = this.state.events.length - 1; i >= 0; i--) {
      // Request Assigned
      if (this.state.events[i].args && hex2ascii(this.state.events[i].args.info) == "Request Assigned") {
        if (this.state.events[i] && this.state.myAccount == this.state.events[i].args.reqAddr) {
          this.addNotification("Provider Found", "Your task is being completed by address "
            + this.state.events[i].args.provAddr, "success")
        }
        if (this.state.events[i] && this.state.myAccount == this.state.events[i].args.provAddr) {
          this.addNotification("You Have Been Assigned A Task", "You have been chosen to complete the request from address", "info");
        }
      }

      // Request Computation Complete
      if (this.state.events[i].args && hex2ascii(this.state.events[i].args.info) == "Request Computation Completed") {
//        console.log("alskdjf;laksjdf;laskjdf")
        if (this.state.events[i] && this.state.myAccount == this.state.events[i].args.reqAddr) {
          this.addNotification("Awaiting validation", "Your task is finished and waiting to be validated", "info")
        }
        if (this.state.events[i] && this.state.myAccount == this.state.events[i].args.provAddr) {
          this.addNotification("Awaiting validation", "You have completed a task an are waiting for validation"
            + this.state.events[i].args.reqAddr, "info");
        }
      }

      // Validation Assigned to Provider
      if (this.state.events[i].args && hex2ascii(this.state.events[i].args.info) == "Validation Assigned to Provider") {
        if (this.state.events[i] && this.state.myAccount == this.state.events[i].args.reqAddr) {
          this.addNotification("Validator Found", "A validator was found for your task but more are still needed"
            + this.state.events[i].args.provAddr, "info")
        }
        if (this.state.events[i] && this.state.myAccount == this.state.events[i].args.provAddr) {
          this.addNotification("You are a validator", "You need to validate the task as true or false."
            + this.state.events[i].args.reqAddr, "info");
        }
      }

      // Not Enough validators
      if (this.state.events[i].args && hex2ascii(this.state.events[i].args.info) == "Not Enough Validators") {
        if (this.state.myAccount == this.state.events[i].args.reqAddr) {
          this.addNotification("Not Enough Validators", "More validators are needed before the result can be sent to you"
            + this.state.events[i].args.provAddr, "warning")
        }
        if (this.state.myAccount == this.state.events[i].args.provAddr) {
          this.addNotification("Not Enough Validators", "There were not enough validators to verfiy your resulting work. Please wait."
            + this.state.events[i].args.reqAddr, "info");
        }
      }


      // Enough Validators
      if (this.state.events[i].args && hex2ascii(this.state.events[i].args.info) == "Enough Validators") {
        if (this.state.myAccount == this.state.events[i].args.reqAddr) {
          this.addNotification("All Validators Found", "Your task is being validated. Please hold.", "success")
        }
        if (this.state.myAccount == this.state.events[i].args.provAddr) {
          this.addNotification("All Validators Found", "Your work is being validated. Please hold.", "info");
        }
      }


      // Validator Signed
      if (this.state.events[i].args && hex2ascii(this.state.events[i].args.info) == "Validator Signed") {
        if (this.state.myAccount == this.state.events[i].args.reqAddr) {
          this.addNotification("Validator signed", "Your task is being validated", "info")
        }
        if (this.state.myAccount == this.state.events[i].args.provAddr) {
          this.addNotification("You Have signed your validation", "You have validated the request from address", "info");
        }
      }


      // Validation Complete
      if (this.state.events[i].args && hex2ascii(this.state.events[i].args.info) == "Validation Complete") {
        if (this.state.myAccount == this.state.events[i].args.reqAddr) {
          this.addNotification("Job Done", "Please download your resultant file from IPFS using the hash " + this.state.events[i].args.extra, "success")
        }
        if (this.state.myAccount == this.state.events[i].args.provAddr) {
          this.addNotification("Work Validated!", "Your work was validated and you should receive payment soon", "info");
        }
      }
    }

    /*   contractEvent.watch(function (error, result) {
        if (!error) {
          console.log('event was emited')
          console.log(result);
        }
        else {
          console.log(error);
        }
      }); */
  }

  addNotification(title, message, type) {
    this.notificationDOMRef.current.addNotification({
      title: title,
      message: message,
      type: type,
      insert: "top",
      container: "top-right",
      animationIn: ["animated", "fadeIn"],
      animationOut: ["animated", "fadeOut"],
      dismiss: { duration: 5000 },
      dismissable: { click: true }
    });
  }
  showApplyButton() {
    if (this.state.mode === 'WORKER') {
      return (
        <button onClick={this.applyAsProvider} style={{ margin: 10 }}>
          Submit Provider Application
          </button>
      );
    }
  }

  showValidationButtons() {
    if (this.state.mode === 'WORKER') {
      return (
        <div>
          <h2> VALIDATIONS </h2>
          <button onClick={() => this.setState({ ValidationResult: !this.state.ValidationResult })} style={{ marginBottom: 5 }} >
            Click Here to toggle validation result
          </button>
          <br></br>
          Current Validation Result: {'' + this.state.ValidationResult}
          <br></br>
          <button onClick={this.submitValidation} style={{ marginTop: 10, marginBottom: 100 }}>
            Submit Validation Result
          </button>
        </div>
      );
    }
  }

  showSubmitJobButton() {
    if (this.state.mode === 'WORKER') {
      return (
        <button onClick={this.submitJob} style={{ marginTop: 10, marginLeft: 15, marginBottom: 100 }}>
          Submit File as Job Result
        </button>
      );
    }
  }
  showSubmitRequestButton() {
    if (this.state.mode === 'USER') {
      return (
        <button onClick={this.submitRequest} style={{ margin: 10 }}>
          Submit Task Request
        </button>
      );
    }
  }

  showApplyTitle() {
    if (this.state.mode === 'WORKER') {
      return (
        <h2>APPLY TO BE A PROVIDER</h2>
      );
    }
  }


  /////////////////////////////////////////////////////////////////////////////////
  //components of react: https://reactjs.org/docs/forms.html  
  render() {

    document.body.style = 'background:gold;';
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        <ReactNotification ref={this.notificationDOMRef} />
        <h1 style={{ marginBottom: 50 }}>Welcome to the BCAI Dapp Web Interface</h1>

        <h2 style={{ margin: 5 }}>CURRENT ACCOUNT</h2>
        {this.state.myAccount} <br></br>
        <button onClick={this.checkEvents} style={{ marginBottom: 20 }}> Check Current Account Status </button>
        <h2 style={{ margin: 5 }}>{this.state.mode} MODE</h2>
        <button onClick={this.changeMode} style={{ marginBottom: 100 }}>Switch modes</button>



        <h2>{this.state.mode === 'USER' ? "UPLOAD TASK SCRIPT" : "UPLOAD RESULT"}</h2>
        <form onSubmit={this.IPFSSubmit}>
          <input type='file' onChange={this.captureFile}></input>
          <input type='submit' value="Upload to IPFS"></input>
        </form>
        {this.showSubmitJobButton()}


        {this.showValidationButtons()}


        <form onSubmit={this.startRequestSubmit}>
          {this.showApplyTitle()}
          <p><label>
            Time : (in seconds)
          <input type="number" value={this.state.Time} onChange={this.TimeChange} />
          </label></p>
          <p><label>
            Target : (0-100)
          <input type="number" value={this.state.Target} onChange={this.TargetChange} />
          </label></p>
          <p><label>
            Price : (in wei)
          <input type="number" value={this.state.Price} onChange={this.PriceChange} />
          </label></p>
          <p>Use account: <input type="number" value={this.state.count} onChange={this.changeAccount}></input>
            <br></br>
            {this.showSubmitRequestButton()}
            {this.showApplyButton()}
          </p>
        </form>



        <div style={{ marginTop: 100 }}>
          <h2 style={{ margin: 5 }}>CURRENT STATE OF CONTRACT</h2>
          <p>Provider Pool = {this.state.providerCount}</p>
          <p>Pending Pool = {this.state.pendingCount}</p>
          <p>Providing Pool = {this.state.providingCount}</p>
          <p>Validating Pool = {this.state.validatingCount}</p>
          <button onClick={this.showPools}>
            Refresh
        </button>
        </div>

      </div>
    );
  }
}

export default App;
