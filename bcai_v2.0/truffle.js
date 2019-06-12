const path = require("path");

//[Tutorial] How to deploy contract to Ropsten using Truffle
//https://www.trufflesuite.com/tutorials/using-infura-custom-provider
//my secret for testing: pencil month wasp omit salad owner ride armor install erupt neglect chimney

var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "pencil month wasp omit salad owner ride armor install erupt neglect chimney";

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks:{
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      //before_timeout: 200000,          //  <=== NEW
      //test_timeout: 300000             //  <=== NEW
      websockets: true
      //added by Taurus see link: https://github.com/trufflesuite/truffle/issues/1254
    },
    ropsten: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "https://ropsten.infura.io/v3/759cf07e10b84410975b28c5b6818041");
      },
      network_id: '3',
    }
   
  },
  contracts_build_directory: path.join(__dirname, "client/src/contracts")
};
