var BCAI = artifacts.require("TaskContract");

contract('TaskContract', function() {
    /* it("should assert true", function(done) {
       var voting = Voting.deployed();
       assert.isTrue(true);
       done();
    }); */
    const bcai = BCAI.deployed();
    it("Test 1: Deployment", function(){
        return bcai.then(instance=>{
            //console.log(instance)
            //return instance.withDraw.call(22,33).then(result=>{
                //  console.log(result);
                //expect(instance.validCandidate('a')).to.be.a(true);
                //assert.isTrue(result);
            //});});
            return instance != null;
            
        });
    });


    it("Test 2: start providing", function(){
        return bcai.then(instance1=>{
            //console.log(instance1)
            return instance1.startProviding(11,23,100).then(result1=>{
                console.log(result1);
              
            });
        });
    });
});
