console.log("Using bcai v9.3 as an example")
showPools();

function showPools(){
	var poolDisplay = false;
	return myContract.methods.getProviderPool().call().then(function(provPool){
		console.log("-----------------------------------------------------");
		console.log("Active provider pool: Total = ", provPool.length);
		console.log(provPool);
	}).then(function(){
		return myContract.methods.getRequestPool().call().then(function(reqPool){

			console.log("Pending pool:  Total = ", reqPool.length);
			console.log(reqPool);
		})
	}).then(function(){
		return myContract.methods.getProvidingPool().call().then(function(providingPool){
		console.log("Providing pool:  Total = ", providingPool.length);
		console.log(providingPool);
		})
	}).then(function(){
		return myContract.methods.getValidatingPool().call().then(function(valiPool){
            console.log("Validating pool:   Total = ", valiPool.length);
            console.log(valiPool);
            // return new Promise(function(res, rej){
            //     if(true) res();
            //     else rej('im not done');
            // })
				//}).then(function(){
					
					// poolDisplay = true;
					// return poolDisplay;
		})
				//return poolDisplay;
    })


    //return poolDisplay;
.then(function(){
    console.log("ret")
})
// .then(function(){
// 	return new Promise(function(res, rej){
// 		if(true) res();
// 		else rej('im not done');
// 	})
// })
	
}