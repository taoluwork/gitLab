pragma solidity >= 0.4.22 < 0.6.0;
contract Fibonacci{
    function caculate(uint32 index) public pure returns (uint256 result){
        uint256[1000] memory array;
        array[0] = 1;
        array[1] = 1;
        for (uint i = 2; i<index; i++){
            array[i] = array[i-2] + array [i-1];
        }
        return array[index];
    }
}