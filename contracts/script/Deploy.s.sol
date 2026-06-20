// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {INFRToken} from "../src/INFRToken.sol";

contract Deploy is Script {
    uint256 internal constant INITIAL_SUPPLY = 1_000_000;

    function run() external {
        vm.startBroadcast();
        address deployer = msg.sender;
        INFRToken token = new INFRToken(INITIAL_SUPPLY);
        vm.stopBroadcast();

        console.log("INFRToken deployed at:", address(token));
        console.log("Deployer (full supply):", deployer);
        console.log("Initial supply (tokens):", INITIAL_SUPPLY);
    }
}
