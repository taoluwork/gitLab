var MarksWill = artifacts.require("./MarksWill.sol");

contract('MarksWill', function() {
    /* it("should assert true", function(done) {
       var voting = Voting.deployed();
       assert.isTrue(true);
       done();
    }); */
    const will = MarksWill.deployed(1123234112,22,33);
    it("When both passwords are correct and deadline is not reached", function(){
        return will.then(instance=>{
            //console.log(instance)
            return instance.withDraw.call(22,33).then(result=>{
                //  console.log(result);
                //expect(instance.validCandidate('a')).to.be.a(true);
                assert.isTrue(result);
            });
        });
    });


    it("When one or both pieces of password are incorrect", function(){
        return will.then(instance1=>{
            //console.log(instance1)
            return instance1.withDraw.call(11,23).then(result1=>{
               // console.log(result1);
                assert.isFalse(result1);   
            });
        });
    });
});
