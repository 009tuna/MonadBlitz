//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import {DeploySpeakStream} from "./DeploySpeakStream.s.sol";

contract DeployScript is ScaffoldETHDeploy {
  function run() external {
    DeploySpeakStream deploySpeakStream = new DeploySpeakStream();
    deploySpeakStream.run();
  }
}
