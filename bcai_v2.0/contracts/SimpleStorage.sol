pragma solidity ^0.4.24;

contract SimpleStorage {
  string storedData;

  function set(string x) public {
    storedData = x;
  }

  function get() public view returns (string) {
    return storedData;
  }
}
