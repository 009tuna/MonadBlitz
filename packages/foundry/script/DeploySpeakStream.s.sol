// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import {SpeakStream} from "../contracts/SpeakStream.sol";

/**
 * @notice SpeakStream kontratini deploy eder, test ogretmeni + AI Tutor Pool seed'ler
 * @dev Kullanim: yarn deploy --file DeploySpeakStream.s.sol --network monadTestnet
 */
contract DeploySpeakStream is ScaffoldETHDeploy {
    // AI Tutor Pool adresi — tum AI ogretmen seanslari bu adrese akar
    // Bu adres icin private key'e sahip olmalisiniz (veya multisig)
    // Demo icin deployer adresini kullaniyoruz
    address constant AI_TUTOR_POOL = 0x1234567890AbCdEf1234567890aBcDeF12345678;

    function run() external ScaffoldEthDeployerRunner {
        // 1. SpeakStream kontratini deploy et
        SpeakStream speakStream = new SpeakStream();
        console.log("SpeakStream deployed at:", address(speakStream));

        // Scaffold-ETH deployment registry'sine kaydet (ABI export icin)
        deployments.push(Deployment({name: "SpeakStream", addr: address(speakStream)}));

        // 2. Demo icin insan ogretmen kaydet
        speakStream.registerTeacher(
            unicode"Ayse Yilmaz",
            "Native Turkish speaker, teaches English. 5 years of experience in conversational English.",
            "en,tr",
            0.0001 ether // 0.0001 MON/saniye = ~0.006 MON/dakika
        );
        console.log("Teacher 1 (Ayse - Human) registered with deployer address");

        // 3. AI Tutor Pool'u kaydet
        // Not: registerTeacher sadece msg.sender icin calisir.
        // AI Pool icin ayri bir islem gerekir — ya pool adresi kendi register olur,
        // ya da kontrata owner-only registerTeacherFor eklenir.
        // Demo icin deployer'in kendisi hem insan ogretmen hem pool olarak calisir.
        // Frontend'de AI_TUTOR_POOL_ADDRESS = deployer adresi olarak set edilecek.
        console.log("AI Tutor Pool address (use deployer):", msg.sender);
        console.log("Update AI_TUTOR_POOL_ADDRESS in frontend/lib/aiTeachers.ts with deployer address");
    }
}
