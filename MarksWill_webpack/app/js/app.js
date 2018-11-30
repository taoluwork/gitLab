const Promise = require("bluebird");
const truffleContract = require("truffle-contract");
const $ = require("jquery");
// Not to forget our built contract
const willJson = require("../../build/contracts/MarksWill.json");
require("file-loader?name=../index.html!../index.html");


// Supports Mist, and other wallets that provide 'web3'.
if (typeof web3 !== 'undefined') {
    // Use the Mist/wallet/Metamask provider.
    window.web3 = new Web3(web3.currentProvider);
} else {
    // Your preferred fallback.
    window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
}

web3.eth.getTransactionReceiptMined = require("./utils.js");

function sequentialPromise(promiseArray) {
    const result = promiseArray.reduce(
        (reduced, promise, index) => {
            reduced.results.push(undefined);
            return {
                chain: reduced.chain
                    .then(() => promise)
                    .then(result => reduced.results[ index ] = result),
                results: reduced.results
            };
        },
        {
            chain: Promise.resolve(),
            results: []
        });
    return result.chain.then(() => result.results);
}

sequentialPromise([
    Promise.resolve(web3.eth), Promise.resolve({ suffix: "Promise" })
]).then(console.log);
web3.eth.getAccountsPromise = function () {
    return new Promise(function (resolve, reject) {
        web3.eth.getAccounts(function (e, accounts) {
            if (e != null) {
                reject(e);
            } else {
                resolve(accounts);
            }
        });
    });
};


const Will = truffleContract(willJson);
Will.setProvider(web3.currentProvider);
//Set default account to be used
Will.defaults({
    from  :web3.eth.accounts[0]
})

window.addEventListener('load', function() {
    $("#withdraw_btn").click(function(){
        return withdrawfunc().then(update=>{
            window.location.reload();
        });
    });

    $("#addFund_btn").click(function(){
        return addFundfunc().then(update=>{
            window.location.reload();
        });

    });

    UserInterface();;
});


//Updating UI show deposit
const UserInterface = function(){
    return Will.deployed().then(_deployed => {
        deployed = _deployed;
        deployed.showFund.call().then(result => {
            $("#deposit").html("The money Mr. Mark deposited is: " + web3.fromWei(result,'ether'));
        });
    });
}

const addDefaultFundfunc = function() {
    //this will add some ether from default account[0], deposit this money before withdraw.
    
    return Will.deployed().then(_deployed=>{
        deployed = _deployed;
        if (web3.eth.getBalance(deployed.address) == 0 ){
            console.log("contract address:  " + deployed.address);
            console.log("Account 0 balance now:  " + web3.eth.accounts[0]+" , " + web3.eth.getBalance(web3.eth.accounts[0])+ "wei.");
            //console.log(web3.eth.getBalance(deployed.address));
            //send 1 ether to the account;
            return deployed.addFund.sendTransaction({from:web3.eth.accounts[0],gas:90000, value: web3.toWei("1",'ether')}).then(result=> {            
                console.log("Contract balance: " + result);
            });
        };
    });  
};


//Function that will be executed when button is pressed
const withdrawfunc = function() {
    //check if address is valid
    //alert($("input[name='receiver']").val());
    if(web3.isAddress($("input[name='receiver']").val()) == false){
        alert("Please enter a valid address! \te.g: " + web3.eth.accounts[1]);
    } 
    else {
        return Will.deployed().then(_deployed=>{
            deployed = _deployed;   //get contract instance
            
            //check if you have money
            if(web3.eth.getBalance(deployed.address) == 0){
                addDefaultFundfunc();   
                alert("Mr.Mark did not deposit any money. \nSystem deposit 1 Ether for you from account[0].");
            }   else{
                return deployed.withdraw.call($("input[name='password_p1']").val(), $("input[name='password_p2']").val(), $("input[name='receiver']").val()).then(function(validity) {
                    console.log($("input[name='password_p1']").val(), $("input[name='password_p2']").val(), $("input[name='receiver']").val());
                    //web3.sendTransaction({from: deployed.address, to:$("input[name='receiver']").val(), value:web3.toWei("1","ether"), gas:90000}).then(result=>{});
                    //console.log(validity);
                    if (validity){
                        //if return value is true, means successfully withdrawed.
                        alert ("Congratulations! You have successfully withdrawed the money.");
                    }  else{
                        alert("Please enter Valid Password!");
                        alert("Note: Password actually is 22 + 33 :)");
                    };
                });
            };
        });
    };
};

//Function that will be executed when button is pressed
const addFundfunc = function() {
    //this will add some ether from default account[0], deposit this money before withdraw.
    
    return Will.deployed().then(_deployed=>{
        deployed = _deployed;
        console.log("contract address:  " + deployed.address);
        console.log("Account 0 bal:  " + web3.eth.accounts[0]+" , " + web3.eth.getBalance(web3.eth.accounts[0]));
        //console.log(web3.eth.getBalance(deployed.address));

        return deployed.addFund.sendTransaction({from:web3.eth.accounts[0],gas:90000, value: web3.toWei($("input[name='addFund']").val(),'ether')}).then(result=> {
            console.log("contract balance:  " + web3.eth.getBalance(deployed.address));
            console.log("Added successfully:  " + web3.fromWei(web3.eth.getBalance(deployed.address)), 'ether');
        //alert("sent" + deployed.address + web3.eth.getBalance(deployed.address));
        });
    });  
};

