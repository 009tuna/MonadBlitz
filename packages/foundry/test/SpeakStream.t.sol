// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {SpeakStream} from "../contracts/SpeakStream.sol";

/**
 * @title SpeakStream Test Suite
 * @notice SpeakStream kontratının tüm ana fonksiyonlarını test eder
 */
contract SpeakStreamTest is Test {
    SpeakStream public speakStream;

    // Test adresleri
    address public teacher1 = makeAddr("teacher1");
    address public teacher2 = makeAddr("teacher2");
    address public student1 = makeAddr("student1");
    address public student2 = makeAddr("student2");

    // Sabitler
    uint256 constant RATE_PER_SECOND = 0.0001 ether; // 0.0001 MON/saniye
    uint256 constant SESSION_DURATION = 600; // 10 dakika = 600 saniye

    function setUp() public {
        speakStream = new SpeakStream();

        // Test hesaplarına bakiye ver
        vm.deal(student1, 100 ether);
        vm.deal(student2, 100 ether);
        vm.deal(teacher1, 1 ether);
        vm.deal(teacher2, 1 ether);
    }

    // ============================================================
    //                    TEST: ÖĞRETMEN KAYDI
    // ============================================================

    function testRegisterTeacher() public {
        vm.prank(teacher1);
        speakStream.registerTeacher("Ayse", "Native Turkish speaker", "en,tr", RATE_PER_SECOND);

        SpeakStream.Teacher memory t = speakStream.getTeacher(teacher1);
        assertEq(t.wallet, teacher1);
        assertEq(t.name, "Ayse");
        assertEq(t.bio, "Native Turkish speaker");
        assertEq(t.languages, "en,tr");
        assertEq(t.ratePerSecond, RATE_PER_SECOND);
        assertTrue(t.active);
        assertEq(t.totalEarned, 0);
        assertEq(t.withdrawable, 0);

        // teacherList'e eklenmiş mi?
        assertEq(speakStream.getTeacherCount(), 1);
    }

    function testCannotRegisterTwice() public {
        vm.startPrank(teacher1);
        speakStream.registerTeacher("Ayse", "Bio", "en,tr", RATE_PER_SECOND);

        vm.expectRevert("Zaten kayitli");
        speakStream.registerTeacher("Ayse2", "Bio2", "en", RATE_PER_SECOND);
        vm.stopPrank();
    }

    // ============================================================
    //                  TEST: SEANS BAŞLATMA
    // ============================================================

    function testStartSessionDepositsCorrectly() public {
        // Önce öğretmen kaydet
        vm.prank(teacher1);
        speakStream.registerTeacher("Ayse", "Bio", "en,tr", RATE_PER_SECOND);

        // Öğrenci seans başlatsın
        uint256 deposit = RATE_PER_SECOND * SESSION_DURATION; // 0.06 ether
        vm.prank(student1);
        uint256 sessionId = speakStream.startSession{value: deposit}(teacher1, SESSION_DURATION);

        assertEq(sessionId, 0);

        SpeakStream.Session memory s = speakStream.getSession(sessionId);
        assertEq(s.student, student1);
        assertEq(s.teacher, teacher1);
        assertEq(s.ratePerSecond, RATE_PER_SECOND);
        assertEq(s.maxDuration, SESSION_DURATION);
        assertEq(s.totalDeposited, deposit);
        assertEq(s.releasedToTeacher, 0);
        assertEq(s.refundedToStudent, 0);
        assertTrue(s.status == SpeakStream.SessionStatus.Active);
    }

    function testCannotStartSessionWithInactiveTeacher() public {
        // Öğretmen kaydet ve pasife al
        vm.startPrank(teacher1);
        speakStream.registerTeacher("Ayse", "Bio", "en,tr", RATE_PER_SECOND);
        speakStream.setTeacherActive(false);
        vm.stopPrank();

        uint256 deposit = RATE_PER_SECOND * SESSION_DURATION;
        vm.prank(student1);
        vm.expectRevert("Ogretmen aktif degil");
        speakStream.startSession{value: deposit}(teacher1, SESSION_DURATION);
    }

    function testCannotStartSessionWithInsufficientDeposit() public {
        vm.prank(teacher1);
        speakStream.registerTeacher("Ayse", "Bio", "en,tr", RATE_PER_SECOND);

        // Yetersiz depozito ile dene
        vm.prank(student1);
        vm.expectRevert("Yetersiz depozito");
        speakStream.startSession{value: 0.01 ether}(teacher1, SESSION_DURATION);
    }

    // ============================================================
    //              TEST: RELEASE ELAPSED (ÖDEME AKIŞI)
    // ============================================================

    function testReleaseElapsedPaysTeacher() public {
        // Setup: öğretmen kaydet, seans başlat
        vm.prank(teacher1);
        speakStream.registerTeacher("Ayse", "Bio", "en,tr", RATE_PER_SECOND);

        uint256 deposit = RATE_PER_SECOND * SESSION_DURATION;
        vm.prank(student1);
        uint256 sessionId = speakStream.startSession{value: deposit}(teacher1, SESSION_DURATION);

        // 30 saniye geçti, 28 saniye doğrulandı (2 saniye reddedildi)
        uint256 studentBalanceBefore = student1.balance;

        vm.prank(student1);
        speakStream.releaseElapsed(sessionId, 30, 28);

        // Öğretmenin withdrawable bakiyesi artmış olmalı
        SpeakStream.Teacher memory t = speakStream.getTeacher(teacher1);
        assertEq(t.withdrawable, 28 * RATE_PER_SECOND);
        assertEq(t.totalEarned, 28 * RATE_PER_SECOND);

        // Öğrenciye 2 saniyelik iade yapılmış olmalı
        assertEq(student1.balance, studentBalanceBefore + 2 * RATE_PER_SECOND);

        // Session state güncellenmiş olmalı
        SpeakStream.Session memory s = speakStream.getSession(sessionId);
        assertEq(s.releasedToTeacher, 28 * RATE_PER_SECOND);
        assertEq(s.refundedToStudent, 2 * RATE_PER_SECOND);
        assertEq(s.lastReleaseTime, 30);
    }

    function testReleaseElapsedRefundsFailedVerification() public {
        // Setup
        vm.prank(teacher1);
        speakStream.registerTeacher("Ayse", "Bio", "en,tr", RATE_PER_SECOND);

        uint256 deposit = RATE_PER_SECOND * SESSION_DURATION;
        vm.prank(student1);
        uint256 sessionId = speakStream.startSession{value: deposit}(teacher1, SESSION_DURATION);

        // 30 saniye geçti, 0 saniye doğrulandı (hepsi reddedildi — sessizlik)
        uint256 studentBalanceBefore = student1.balance;

        vm.prank(student1);
        speakStream.releaseElapsed(sessionId, 30, 0);

        // Öğretmene hiçbir şey gitmemeli
        SpeakStream.Teacher memory t = speakStream.getTeacher(teacher1);
        assertEq(t.withdrawable, 0);

        // Öğrenciye 30 saniyelik iade yapılmış olmalı
        assertEq(student1.balance, studentBalanceBefore + 30 * RATE_PER_SECOND);
    }

    // ============================================================
    //                  TEST: SEANS BİTİRME
    // ============================================================

    function testEndSessionRefundsRemainder() public {
        // Setup
        vm.prank(teacher1);
        speakStream.registerTeacher("Ayse", "Bio", "en,tr", RATE_PER_SECOND);

        uint256 deposit = RATE_PER_SECOND * SESSION_DURATION;
        vm.prank(student1);
        uint256 sessionId = speakStream.startSession{value: deposit}(teacher1, SESSION_DURATION);

        // 30 saniye release et (hepsi doğrulanmış)
        vm.prank(student1);
        speakStream.releaseElapsed(sessionId, 30, 30);

        // Seansı bitir — kalan 570 saniyelik bakiye iade olmalı
        uint256 studentBalanceBefore = student1.balance;

        vm.prank(student1);
        speakStream.endSession(sessionId);

        // Kalan bakiye = deposit - 30 * rate
        uint256 expectedRefund = deposit - (30 * RATE_PER_SECOND);
        assertEq(student1.balance, studentBalanceBefore + expectedRefund);

        // Seans durumu Ended olmalı
        SpeakStream.Session memory s = speakStream.getSession(sessionId);
        assertTrue(s.status == SpeakStream.SessionStatus.Ended);
    }

    // ============================================================
    //                    TEST: PARA ÇEKME
    // ============================================================

    function testWithdrawTransfersFunds() public {
        // Setup: öğretmen kaydet, seans başlat, release yap
        vm.prank(teacher1);
        speakStream.registerTeacher("Ayse", "Bio", "en,tr", RATE_PER_SECOND);

        uint256 deposit = RATE_PER_SECOND * SESSION_DURATION;
        vm.prank(student1);
        uint256 sessionId = speakStream.startSession{value: deposit}(teacher1, SESSION_DURATION);

        // 30 saniye release (hepsi doğrulanmış)
        vm.prank(student1);
        speakStream.releaseElapsed(sessionId, 30, 30);

        // Öğretmen para çeksin
        uint256 teacherBalanceBefore = teacher1.balance;
        uint256 expectedAmount = 30 * RATE_PER_SECOND;

        vm.prank(teacher1);
        speakStream.withdraw();

        assertEq(teacher1.balance, teacherBalanceBefore + expectedAmount);

        // Withdrawable sıfırlanmış olmalı
        SpeakStream.Teacher memory t = speakStream.getTeacher(teacher1);
        assertEq(t.withdrawable, 0);
        assertEq(t.totalEarned, expectedAmount);
    }

    function testCannotWithdrawWithZeroBalance() public {
        vm.prank(teacher1);
        speakStream.registerTeacher("Ayse", "Bio", "en,tr", RATE_PER_SECOND);

        vm.prank(teacher1);
        vm.expectRevert("Cekilecek bakiye yok");
        speakStream.withdraw();
    }

    // ============================================================
    //                  TEST: MULTI-CHUNK RELEASE
    // ============================================================

    function testMultipleReleaseChunks() public {
        // Setup
        vm.prank(teacher1);
        speakStream.registerTeacher("Ayse", "Bio", "en,tr", RATE_PER_SECOND);

        uint256 deposit = RATE_PER_SECOND * SESSION_DURATION;
        vm.prank(student1);
        uint256 sessionId = speakStream.startSession{value: deposit}(teacher1, SESSION_DURATION);

        // Chunk 1: 0-30 saniye, 28 doğrulanmış
        vm.prank(student1);
        speakStream.releaseElapsed(sessionId, 30, 28);

        // Chunk 2: 30-60 saniye, 30 doğrulanmış (hepsi)
        vm.prank(student1);
        speakStream.releaseElapsed(sessionId, 60, 30);

        // Toplam kontrol
        SpeakStream.Session memory s = speakStream.getSession(sessionId);
        assertEq(s.releasedToTeacher, (28 + 30) * RATE_PER_SECOND);
        assertEq(s.refundedToStudent, 2 * RATE_PER_SECOND);
        assertEq(s.lastReleaseTime, 60);
    }
}
