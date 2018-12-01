var contr = artifacts.require("eventTest");
//cannot use .sol name

module.exports = function(deployer) {
    // deployment steps
    deployer.deploy(contr);
    
}
