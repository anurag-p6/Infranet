// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {AgentStaking} from "../src/AgentStaking.sol";

contract DeployStaking is Script {
    function run() external {
        // Minimum bond in wei. Override with MIN_STAKE_WEI env var.
        // Default: 0.01 MON (1e16 wei).
        uint256 minStake = vm.envOr("MIN_STAKE_WEI", uint256(1e16));

        vm.startBroadcast();
        AgentStaking staking = new AgentStaking(minStake);
        vm.stopBroadcast();

        console.log("AgentStaking deployed at:", address(staking));
        console.log("Owner:", msg.sender);
        console.log("Minimum stake (wei):", minStake);
    }
}
