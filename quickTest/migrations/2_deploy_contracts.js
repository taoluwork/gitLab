var contr = artifacts.require("quickTest");
//cannot use .sol name

module.exports = function(deployer) {
    // deployment steps
    deployer.deploy(contr);
    
}
