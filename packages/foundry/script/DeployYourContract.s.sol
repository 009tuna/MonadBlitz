// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DeployHelpers.s.sol";
import {StreamingTutorEscrow} from "../contracts/StreamingTutorEscrow.sol";

/**
 * @notice Deploys StreamingTutorEscrow and seeds demo tutors.
 */
contract DeployYourContract is ScaffoldETHDeploy {
    address internal constant DEMO_HUMAN_TUTOR = 0x1000000000000000000000000000000000001001;

    function run() external ScaffoldEthDeployerRunner {
        StreamingTutorEscrow escrow = new StreamingTutorEscrow(deployer);
        deployments.push(Deployment({name: "StreamingTutorEscrow", addr: address(escrow)}));

        escrow.seedTutor(
            DEMO_HUMAN_TUTOR,
            unicode"Ayse Yilmaz",
            "Native Turkish speaker focused on conversational English.",
            "en,tr",
            5e15,
            true
        );

        escrow.seedTutor(
            deployer,
            "AI Tutor Pool",
            "Shared payout wallet used by frontend AI tutor aliases.",
            "en,tr,es",
            5e15,
            true
        );

        console.log("StreamingTutorEscrow deployed at:", address(escrow));
        console.log("AI tutor pool address:", deployer);
    }
}
