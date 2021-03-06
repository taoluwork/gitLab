const path = require("path");

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
  },
  contracts_build_directory: path.join(__dirname, "client/src/contracts")
};
