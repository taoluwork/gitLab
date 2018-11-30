var MarksWill = artifacts.require("MarksWill");
//cannot use .sol name

module.exports = function(deployer) {
    // deployment steps
    deployer.deploy(MarksWill,113245262132,22,33);
    
}
