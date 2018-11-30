/**************************************
Project p1 for CS4700 Blockchain
version 2.9
author list:	Tao Lu 	Landry Mathews	Miles Vesper
***************************************/

pragma solidity ^0.4.14;


contract MarksWill {
    uint256 private deadline; //NOTE: this time is UNIX time, not human-readable. 
            //Mr.Mark, please use some online simple tools to generate the UNIX deadline timestamp.
    uint256 private pwdp1;
    uint256 private pwdp2;    //first and second part of password
    uint256 private amount = 0;

    function MarksWill (uint256 ddl, uint256 password_p1, uint256 password_p2) public payable {
        deadline = ddl;
        pwdp1 = password_p1;
        pwdp2 = password_p2;
    }

    function addFund ( ) public payable returns (uint deposit) {
        amount += msg.value;
        return amount;
    }

    function showFund() public view returns (uint deposit) {
        return this.balance;
    }

    function withdraw (uint256 password_p1, uint256 password_p2, address receiver) public returns (bool) {        
        if (password_p1 == pwdp1 && password_p2 == pwdp2 && now < deadline) {
            receiver.transfer(amount - 90000);
            return true;
        } else 
            
            return false;
    }

    function cancelWithdraw(uint password) public returns (bool) {
        if (now > deadline && password == pwdp2) {
            selfdestruct(msg.sender);
            return true;
        } else 
        
            return false;
    }
}
