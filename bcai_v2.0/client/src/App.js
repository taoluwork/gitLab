import React, { Component } from "react";
import TaskContract from "./contracts/TaskContract.json";
import getWeb3 from "./utils/getWeb3";
import truffleContract from "truffle-contract";
import ipfs from './ipfs';

import "./App.css";

class App extends Component {
  state = { 
    web3: null, 
    accounts: null, 
    myContract: null ,
    debug: false,
    providerCount : 0,
    pendingCount : 0,
    validatingCount :0,
    providingCount:0, 
    providerList: null,

    
  };


  constructor(props){
    super(props)
    this.state = {};
    this.captureFile = this.captureFile.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.showPools = this.showPools.bind(this);
    this.ListoutPool = this.ListoutPool.bind(this);
    this.DisplayNonZeroInList = this.DisplayNonZeroInList.bind(this);
    this.setState = this.setState.bind(this).bind(this)
    
  }


  componentWillMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();
      //console.log(web3);
      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();
      //console.log(accounts);
      // Get the contract instance.
      const Contract = truffleContract(TaskContract);
      Contract.setProvider(web3.currentProvider);
      const instance = await Contract.deployed();
      //console.log(instance);
      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, myContract: instance })
        console.log("contract setted up!");
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

  // runExample = async () => {
  //   const { accounts, contract } = this.state;

  //   // Stores a given value, 5 by default.
  //   await contract.set(1721241, { from: accounts[2] });

  //   // Get the value from the contract to prove it worked.
  //   const response = await contract.get();

  //   // Update state with the result.
  //   this.setState({ storageValue: response.toNumber() });
  // };

  //file readers: https://developer.mozilla.org/en-US/docs/Web/API/FileReader


  captureFile(event){
    console.log("capture file");
    event.preventDefault()
    const file = event.target.files[0]
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(file)
    reader.onloadend = () =>{
      this.setState({buffer: Buffer(reader.result)})
      console.log("buffer", this.state.buffer);
    }
  }

  onSubmit(event){
    console.log("submitted!")
    event.preventDefault();
    ipfs.files.add(this.state.buffer, (err, result)=>{
      if(err){
        console.log("Error!", err);
        return
      }
      else{
        
        //this.setState({ipfsHash: result[0].hash})
        console.log("ipfsHash returned", result[0].hash)
        return this.state.myContract.set(result[0].hash, {from: this.state.accounts[0]}).then((res)=>{
          console.log("Send", res);
          return this.state.myContract.get.call({from: this.state.accounts[0]}).then((ipfsHash)=>{
            console.log("Fetched", ipfsHash);
            this.setState({ipfsHash})
            
          })
        })
      }
    })
    
  }  
  //NOTE:[important] using => is very important,this pass the context without changing the this ref.
  //https://medium.com/@thejasonfile/callback-functions-in-react-e822ebede766

  showPools(){		//optional [--list] 
    //NOTE: the following 'return' is important, it actually return the promise object
    //this avoid the issue of unhandled promise.
    this.state.myContract.getProviderPool.call().then(provPool =>{
      console.log("=======================================================");
      console.log("Active provider pool: Total = ", provPool.length);
      console.log(provPool);
      this.setState({providerCount: provPool.length})
      this.setState({providerList: provPool})
      return provPool; 
     }).then(provPool => {
       if(provPool.length >0) return this.ListoutPool(provPool,'provider');
    })
    
    
    this.state.myContract.getPendingPool.call().then(reqPool => {
        console.log("=======================================================")
        console.log("Pending pool:  Total = ", reqPool.length);
        console.log(reqPool);
        this.setState({pendingCount: reqPool.length})
        return reqPool;
      
    }).then(reqPool => {
       if(reqPool.length>0) return this.ListoutPool(reqPool, 'request');
    })
      
    this.state.myContract.getProvidingPool.call().then(providingPool => {
        console.log("=======================================================")
        console.log("Providing pool:  Total = ", providingPool.length);
        console.log(providingPool);
        this.setState({providingCount: providingPool.length})
        return providingPool;
    }).then(providingPool => {
      if(providingPool.length>0) return this.ListoutPool(providingPool, 'request');
    })//.then(function(){
    
    this.state.myContract.getValidatingPool.call().then(valiPool => {
        console.log("=======================================================")
        console.log("Validating pool:  Total = ", valiPool.length);
        console.log(valiPool);
        this.setState({validatingCount: valiPool.length})
        return valiPool;
        //})
    }).then(valiPool => {
       if(valiPool.length>0) return this.ListoutPool(valiPool, 'request');
    })
  }

  ListoutPool(Pool,type){		//--list [--debug]
    //console.log("List out Pool")
    if (type === 'provider'){
      return this.state.myContract.listProviders.call(Pool)
      .then(proList => {
        console.log("-----------------------------------------------------")
        this.DisplayNonZeroInList(proList,'provider');
      })
    }
    else if (type === 'request'){
      return this.state.myContract.listRequests.call(Pool)
      .then(pendList => {
        console.log("-----------------------------------------------------")
        this.DisplayNonZeroInList(pendList,'request');
      })
    }
    else throw new Text("Not supported type!")
  }

  DisplayNonZeroInList(List, type){
    if(type === 'request')
      for(var i = 0;i < List.length;i++){
        if(List[i]['addr'] !== 0){
          if(this.state.debug){
            console.log(List[i]);
            console.log("-----------------------------------------------------")
          } else {
            //simple print:
            console.log("reqID = ", List[i]['reqID']);
            console.log("addr = ", List[i]['addr']);
            console.log("provider = ", List[i]['provider']);
            console.log("status = ",  List[i]['status']);
            console.log("-----------------------------------------------------")							
          }
        }
      }
    else if (type === 'provider')
      for (var j = 0;j < List.length ;j++){
        if(List[j]['addr'] !== 0){
          if(this.state.debug){
            console.log(List[j]);
            console.log("-----------------------------------------------------")
          } else{
            console.log("provD = ", List[j]['provID']);
            console.log("addr = ", List[j]['addr']);
            console.log("available = ", List[j]['available']);
            console.log("-----------------------------------------------------")
          }
        }
      }
    else throw new Text('Not supported type for display')	
  }

  //components of react: https://reactjs.org/docs/forms.html

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        <h1>Your Mode: User</h1>
        <p>You can change mode later.</p>
        <img src={`https://ipfs.infura.io/ipfs/${this.state.ipfsHash}`} alt="" />
        <h2>Upload Task Script</h2>
        <form  onSubmit = {this.onSubmit}>
          <input type = 'file' onChange = {this.captureFile}></input>
          <input type = 'submit' value = "Click"></input>
        </form>
        
        <p>
          Your account: {this.state.accounts[0]}
        </p>
        <button onClick={this.showPools}>
          Refresh
        </button>
        <div>
          <p>Active Provider {this.state.providerList} Total = {this.state.providerCount}</p>
          <p>PendingPool ={this.state.pendingCount}</p> 
          <p>Providing Pool = {this.state.providingCount}</p>
          <p>Validating Pool = {this.state.validatingCount}</p>

        </div>
      </div>
    );
  }
}

export default App;
