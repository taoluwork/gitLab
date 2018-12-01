//This is a quick test
pragma solidity 0.5.0;
contract eventTest {
    event Test_1(
		address indexed _from,
		uint _value
    );

    function eventFire() public payable returns(address) {
        emit Test_1(msg.sender, msg.value);
        return msg.sender;
    }
}
