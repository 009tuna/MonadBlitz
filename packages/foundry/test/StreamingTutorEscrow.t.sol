// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {StreamingTutorEscrow} from "../contracts/StreamingTutorEscrow.sol";

contract StreamingTutorEscrowTest is Test {
    StreamingTutorEscrow public escrow;

    address public owner = makeAddr("owner");
    address public humanTutor = makeAddr("humanTutor");
    address public aiPoolTutor = makeAddr("aiPoolTutor");
    address public student = makeAddr("student");
    address public stranger = makeAddr("stranger");

    uint256 public constant RATE_PER_SECOND = 5e15; // 0.005 MON
    uint256 public constant MAX_DURATION = 600;

    function setUp() public {
        escrow = new StreamingTutorEscrow(owner);

        vm.deal(student, 100 ether);
        vm.deal(stranger, 100 ether);

        vm.startPrank(owner);
        escrow.seedTutor(humanTutor, "Ayse Yilmaz", "Human tutor", "en,tr", RATE_PER_SECOND, true);
        escrow.seedTutor(aiPoolTutor, "AI Pool", "AI tutor pool", "en,tr", RATE_PER_SECOND, true);
        vm.stopPrank();
    }

    function testDepositAndWithdrawBalance() public {
        vm.prank(student);
        escrow.deposit{value: 1 ether}();
        assertEq(escrow.studentBalances(student), 1 ether);

        uint256 balanceBefore = student.balance;
        vm.prank(student);
        escrow.withdrawBalance(0.4 ether);

        assertEq(escrow.studentBalances(student), 0.6 ether);
        assertEq(student.balance, balanceBefore + 0.4 ether);
    }

    function testCannotStartSessionWithInactiveTutor() public {
        vm.prank(humanTutor);
        escrow.setTutorActive(false);

        vm.prank(student);
        escrow.deposit{value: 10 ether}();

        vm.prank(student);
        vm.expectRevert("Tutor is inactive");
        escrow.startSession(humanTutor, MAX_DURATION);
    }

    function testCannotStartSessionWithoutSufficientBalance() public {
        vm.prank(student);
        escrow.deposit{value: 0.1 ether}();

        vm.prank(student);
        vm.expectRevert("Insufficient deposited balance");
        escrow.startSession(humanTutor, MAX_DURATION);
    }

    function testStartSessionReservesExactAmount() public {
        uint256 requiredDeposit = RATE_PER_SECOND * MAX_DURATION;

        vm.prank(student);
        escrow.deposit{value: requiredDeposit + 1 ether}();

        vm.prank(student);
        uint256 sessionId = escrow.startSession(humanTutor, MAX_DURATION);

        assertEq(sessionId, 1);
        assertEq(escrow.studentBalances(student), 1 ether);
        assertEq(escrow.activeSessionIds(student), sessionId);

        StreamingTutorEscrow.Session memory session = escrow.getSession(sessionId);
        assertEq(session.depositAmount, requiredDeposit);
        assertEq(session.ratePerSecond, RATE_PER_SECOND);
        assertEq(uint256(session.status), uint256(StreamingTutorEscrow.SessionStatus.Active));
    }

    function testStudentCannotOpenSecondActiveSession() public {
        vm.prank(student);
        escrow.deposit{value: 20 ether}();

        vm.prank(student);
        escrow.startSession(humanTutor, MAX_DURATION);

        vm.prank(student);
        vm.expectRevert("Student already has an active session");
        escrow.startSession(aiPoolTutor, MAX_DURATION);
    }

    function testStopSessionCapsEarnedAmountAtDeposit() public {
        uint256 requiredDeposit = RATE_PER_SECOND * 10;

        vm.prank(student);
        escrow.deposit{value: requiredDeposit}();

        vm.prank(student);
        uint256 sessionId = escrow.startSession(humanTutor, 10);

        vm.warp(block.timestamp + 1 hours);

        vm.prank(student);
        escrow.stopSession(sessionId);

        StreamingTutorEscrow.Session memory session = escrow.getSession(sessionId);
        assertEq(session.earnedAmount, requiredDeposit);
        assertEq(session.depositAmount, requiredDeposit);
        assertEq(session.refundedAmount, 0);
    }

    function testShortSessionProducesRefundableAmount() public {
        uint256 requiredDeposit = RATE_PER_SECOND * MAX_DURATION;

        vm.prank(student);
        escrow.deposit{value: requiredDeposit}();

        vm.prank(student);
        uint256 sessionId = escrow.startSession(humanTutor, MAX_DURATION);

        vm.warp(block.timestamp + 120);

        vm.prank(student);
        escrow.stopSession(sessionId);

        StreamingTutorEscrow.Session memory session = escrow.getSession(sessionId);
        assertEq(session.earnedAmount, RATE_PER_SECOND * 120);
        assertEq(session.depositAmount - session.earnedAmount, RATE_PER_SECOND * 480);
    }

    function testClaimOnlyPaysTutorAndIsRepeatSafe() public {
        vm.prank(student);
        escrow.deposit{value: RATE_PER_SECOND * MAX_DURATION}();

        vm.prank(student);
        uint256 sessionId = escrow.startSession(humanTutor, MAX_DURATION);

        vm.warp(block.timestamp + 60);
        vm.prank(student);
        escrow.stopSession(sessionId);

        uint256 balanceBefore = humanTutor.balance;
        uint256 expectedClaim = RATE_PER_SECOND * 60;

        vm.prank(humanTutor);
        escrow.claim(sessionId);

        assertEq(humanTutor.balance, balanceBefore + expectedClaim);

        StreamingTutorEscrow.Session memory session = escrow.getSession(sessionId);
        assertEq(session.claimedAmount, expectedClaim);

        vm.prank(humanTutor);
        vm.expectRevert("Nothing to claim");
        escrow.claim(sessionId);
    }

    function testRefundOnlyPaysStudentAndIsRepeatSafe() public {
        vm.prank(student);
        escrow.deposit{value: RATE_PER_SECOND * MAX_DURATION}();

        vm.prank(student);
        uint256 sessionId = escrow.startSession(humanTutor, MAX_DURATION);

        vm.warp(block.timestamp + 30);
        vm.prank(student);
        escrow.stopSession(sessionId);

        uint256 refundable = RATE_PER_SECOND * (MAX_DURATION - 30);
        uint256 balanceBefore = student.balance;

        vm.prank(student);
        escrow.refundUnused(sessionId);

        assertEq(student.balance, balanceBefore + refundable);

        StreamingTutorEscrow.Session memory session = escrow.getSession(sessionId);
        assertEq(session.refundedAmount, refundable);

        vm.prank(student);
        vm.expectRevert("Nothing to refund");
        escrow.refundUnused(sessionId);
    }

    function testClaimThenRefundMatchesRefundThenClaim() public {
        uint256 earned = RATE_PER_SECOND * 90;
        uint256 refundable = RATE_PER_SECOND * (MAX_DURATION - 90);

        vm.prank(student);
        escrow.deposit{value: RATE_PER_SECOND * MAX_DURATION}();

        vm.prank(student);
        uint256 sessionIdOne = escrow.startSession(humanTutor, MAX_DURATION);

        vm.warp(block.timestamp + 90);
        vm.prank(student);
        escrow.stopSession(sessionIdOne);

        uint256 tutorBeforeOne = humanTutor.balance;
        uint256 studentBeforeOne = student.balance;

        vm.prank(humanTutor);
        escrow.claim(sessionIdOne);
        vm.prank(student);
        escrow.refundUnused(sessionIdOne);

        uint256 tutorAfterClaimRefund = humanTutor.balance - tutorBeforeOne;
        uint256 studentAfterClaimRefund = student.balance - studentBeforeOne;

        vm.prank(student);
        escrow.deposit{value: RATE_PER_SECOND * MAX_DURATION}();

        vm.prank(student);
        uint256 sessionIdTwo = escrow.startSession(aiPoolTutor, MAX_DURATION);

        vm.warp(block.timestamp + 90);
        vm.prank(student);
        escrow.stopSession(sessionIdTwo);

        uint256 tutorBeforeTwo = aiPoolTutor.balance;
        uint256 studentBeforeTwo = student.balance;

        vm.prank(student);
        escrow.refundUnused(sessionIdTwo);
        vm.prank(aiPoolTutor);
        escrow.claim(sessionIdTwo);

        uint256 tutorAfterRefundClaim = aiPoolTutor.balance - tutorBeforeTwo;
        uint256 studentAfterRefundClaim = student.balance - studentBeforeTwo;

        assertEq(tutorAfterClaimRefund, earned);
        assertEq(studentAfterClaimRefund, refundable);
        assertEq(tutorAfterRefundClaim, earned);
        assertEq(studentAfterRefundClaim, refundable);
    }

    function testHumanAndAiTutorsAreBothValidTargets() public {
        vm.prank(student);
        escrow.deposit{value: 20 ether}();

        vm.prank(student);
        uint256 sessionIdOne = escrow.startSession(humanTutor, 60);

        vm.warp(block.timestamp + 60);
        vm.prank(student);
        escrow.stopSession(sessionIdOne);

        vm.prank(humanTutor);
        escrow.claim(sessionIdOne);

        vm.prank(student);
        uint256 sessionIdTwo = escrow.startSession(aiPoolTutor, 60);

        vm.warp(block.timestamp + 60);
        vm.prank(student);
        escrow.stopSession(sessionIdTwo);

        vm.prank(aiPoolTutor);
        escrow.claim(sessionIdTwo);

        assertEq(escrow.activeSessionIds(student), 0);
        assertGt(humanTutor.balance, 0);
        assertGt(aiPoolTutor.balance, 0);
    }
}
