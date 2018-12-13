import React, { Component } from "react";
import SimpleStorageContract from "./contracts/SimpleStorage.json";
import getWeb3 from "./utils/getWeb3";
import truffleContract from "truffle-contract";
import ipfs from './ipfs';

import "./App.css";

class App extends Component {
  state = { storageValue: 0, web3: null, accounts: null, contract: null };
  constructor(props){
    super(props)
    
    this.state = {
      ipfsHash: '',
      storageValue: 0, 
      web3: null, 
      buffer: null}
    
      //this.componentDidMount();
    this.captureFile = this.captureFile.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }


  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();
      //console.log(web3);
      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();
      //console.log(accounts);
      // Get the contract instance.
      const Contract = truffleContract(SimpleStorageContract);
      Contract.setProvider(web3.currentProvider);
      const instance = await Contract.deployed();
      //console.log(instance);
      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance }, this.runExample);
      return instance.get.call(accounts[0]).then((ipfsHash)=>{
        return this.setState({ipfsHash})
      })
    }
     
    catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.log(error);
    }
  };

  runExample = async () => {
    const { accounts, contract } = this.state;

    // Stores a given value, 5 by default.
    await contract.set(1721241, { from: accounts[2] });

    // Get the value from the contract to prove it worked.
    const response = await contract.get();

    // Update state with the result.
    this.setState({ storageValue: response.toNumber() });
  };

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
        return this.state.contract.set(result[0].hash, {from: this.state.accounts[0]}).then((res)=>{
          console.log("Send", res);
          return this.state.contract.get.call({from: this.state.accounts[0]}).then((ipfsHash)=>{
            console.log("Fetched", ipfsHash);
            this.setState({ipfsHash})
            
          })
        })
      }
    })
    
  }  


  //components of react: https://reactjs.org/docs/forms.html

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        <h1>Your Image</h1>
        <p>Your image is saved on IPFS and Ethereum blockchain</p>
        <img src={`https://ipfs.infura.io/ipfs/${this.state.ipfsHash}`} alt="" />
        <h2>Upload Image</h2>
        <form  onSubmit = {this.onSubmit}>
          <input type = 'file' onChange = {this.captureFile}></input>
          <input type = 'submit' value = "Click"></input>
        </form>
        
        <p>
          If your contracts compiled and migrated successfully, below will show
          a stored value of 5 (by default).
        </p>
        <p>
          Try changing the value stored on <strong>line 40</strong> of App.js.
        </p>
        <div>The stored value is: {this.state.storageValue}</div>
      </div>
    );
  }
}

export default App;
