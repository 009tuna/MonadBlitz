// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract StreamingTutorEscrow is Ownable, ReentrancyGuard {
    enum SessionStatus {
        None,
        Active,
        Stopped
    }

    struct Tutor {
        address wallet;
        string name;
        string bio;
        string languages;
        uint256 ratePerSecond;
        bool active;
        uint256 totalEarned;
        uint256 totalClaimed;
    }

    struct Session {
        address student;
        address tutor;
        uint256 ratePerSecond;
        uint256 startTime;
        uint256 stopTime;
        uint256 maxDuration;
        uint256 depositAmount;
        uint256 earnedAmount;
        uint256 claimedAmount;
        uint256 refundedAmount;
        SessionStatus status;
    }

    mapping(address => Tutor) public tutors;
    mapping(address => uint256) public studentBalances;
    mapping(address => uint256) public activeSessionIds;
    mapping(uint256 => Session) public sessions;

    address[] public tutorList;
    uint256 public nextSessionId = 1;

    event Deposited(address indexed student, uint256 amount, uint256 newBalance);
    event BalanceWithdrawn(address indexed student, uint256 amount, uint256 newBalance);
    event TutorRegistered(address indexed tutor, string name, uint256 ratePerSecond);
    event TutorUpdated(address indexed tutor, string name, uint256 ratePerSecond, bool active);
    event SessionStarted(
        uint256 indexed sessionId,
        address indexed student,
        address indexed tutor,
        uint256 ratePerSecond,
        uint256 maxDuration,
        uint256 depositAmount
    );
    event SessionStopped(
        uint256 indexed sessionId,
        address indexed student,
        address indexed tutor,
        uint256 elapsedSeconds,
        uint256 earnedAmount,
        uint256 refundableAmount
    );
    event Claimed(uint256 indexed sessionId, address indexed tutor, uint256 amount);
    event Refunded(uint256 indexed sessionId, address indexed student, uint256 amount);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function deposit() external payable {
        require(msg.value > 0, "Deposit must be greater than zero");

        studentBalances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value, studentBalances[msg.sender]);
    }

    function withdrawBalance(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than zero");
        require(studentBalances[msg.sender] >= amount, "Insufficient balance");

        studentBalances[msg.sender] -= amount;
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "Balance withdrawal failed");

        emit BalanceWithdrawn(msg.sender, amount, studentBalances[msg.sender]);
    }

    function registerTutor(
        string calldata name,
        string calldata bio,
        string calldata languages,
        uint256 ratePerSecond
    ) external {
        require(tutors[msg.sender].wallet == address(0), "Tutor already registered");
        _setTutor(msg.sender, name, bio, languages, ratePerSecond, true, true);
        emit TutorRegistered(msg.sender, name, ratePerSecond);
    }

    function seedTutor(
        address tutor,
        string calldata name,
        string calldata bio,
        string calldata languages,
        uint256 ratePerSecond,
        bool active
    ) external onlyOwner {
        bool isNewTutor = tutors[tutor].wallet == address(0);
        _setTutor(tutor, name, bio, languages, ratePerSecond, active, isNewTutor);

        if (isNewTutor) {
            emit TutorRegistered(tutor, name, ratePerSecond);
        } else {
            emit TutorUpdated(tutor, name, ratePerSecond, active);
        }
    }

    function updateTutor(
        string calldata name,
        string calldata bio,
        string calldata languages,
        uint256 ratePerSecond
    ) external {
        Tutor storage tutor = tutors[msg.sender];
        require(tutor.wallet != address(0), "Tutor not registered");

        tutor.name = name;
        tutor.bio = bio;
        tutor.languages = languages;
        tutor.ratePerSecond = _validateRate(ratePerSecond);

        emit TutorUpdated(msg.sender, name, tutor.ratePerSecond, tutor.active);
    }

    function setTutorActive(bool active) external {
        Tutor storage tutor = tutors[msg.sender];
        require(tutor.wallet != address(0), "Tutor not registered");

        tutor.active = active;
        emit TutorUpdated(msg.sender, tutor.name, tutor.ratePerSecond, active);
    }

    function startSession(address tutorAddress, uint256 maxDuration) external returns (uint256 sessionId) {
        Tutor storage tutor = tutors[tutorAddress];
        require(tutor.wallet != address(0), "Tutor not found");
        require(tutor.active, "Tutor is inactive");
        require(maxDuration > 0, "Duration must be greater than zero");
        require(activeSessionIds[msg.sender] == 0, "Student already has an active session");

        uint256 requiredDeposit = tutor.ratePerSecond * maxDuration;
        require(requiredDeposit > 0, "Required deposit must be greater than zero");
        require(studentBalances[msg.sender] >= requiredDeposit, "Insufficient deposited balance");

        studentBalances[msg.sender] -= requiredDeposit;

        sessionId = nextSessionId++;
        sessions[sessionId] = Session({
            student: msg.sender,
            tutor: tutorAddress,
            ratePerSecond: tutor.ratePerSecond,
            startTime: block.timestamp,
            stopTime: 0,
            maxDuration: maxDuration,
            depositAmount: requiredDeposit,
            earnedAmount: 0,
            claimedAmount: 0,
            refundedAmount: 0,
            status: SessionStatus.Active
        });

        activeSessionIds[msg.sender] = sessionId;

        emit SessionStarted(sessionId, msg.sender, tutorAddress, tutor.ratePerSecond, maxDuration, requiredDeposit);
    }

    function stopSession(uint256 sessionId) external {
        Session storage session = sessions[sessionId];
        require(session.student == msg.sender, "Only the student can stop the session");
        require(session.status == SessionStatus.Active, "Session is not active");

        uint256 elapsedSeconds = block.timestamp > session.startTime ? block.timestamp - session.startTime : 0;
        if (elapsedSeconds > session.maxDuration) {
            elapsedSeconds = session.maxDuration;
        }

        uint256 earnedAmount = elapsedSeconds * session.ratePerSecond;
        if (earnedAmount > session.depositAmount) {
            earnedAmount = session.depositAmount;
        }

        session.stopTime = session.startTime + elapsedSeconds;
        session.earnedAmount = earnedAmount;
        session.status = SessionStatus.Stopped;
        activeSessionIds[session.student] = 0;

        tutors[session.tutor].totalEarned += earnedAmount;

        emit SessionStopped(
            sessionId,
            session.student,
            session.tutor,
            elapsedSeconds,
            earnedAmount,
            session.depositAmount - earnedAmount
        );
    }

    function claim(uint256 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        require(session.tutor == msg.sender, "Only the tutor can claim");
        require(session.status == SessionStatus.Stopped, "Session is not stopped");

        uint256 claimableAmount = session.earnedAmount - session.claimedAmount;
        require(claimableAmount > 0, "Nothing to claim");

        session.claimedAmount += claimableAmount;
        tutors[msg.sender].totalClaimed += claimableAmount;

        (bool success,) = msg.sender.call{value: claimableAmount}("");
        require(success, "Claim transfer failed");

        emit Claimed(sessionId, msg.sender, claimableAmount);
    }

    function refundUnused(uint256 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        require(session.student == msg.sender, "Only the student can refund");
        require(session.status == SessionStatus.Stopped, "Session is not stopped");

        uint256 refundableAmount = session.depositAmount - session.earnedAmount - session.refundedAmount;
        require(refundableAmount > 0, "Nothing to refund");

        session.refundedAmount += refundableAmount;

        (bool success,) = msg.sender.call{value: refundableAmount}("");
        require(success, "Refund transfer failed");

        emit Refunded(sessionId, msg.sender, refundableAmount);
    }

    function getTutor(address tutorAddress) external view returns (Tutor memory) {
        return tutors[tutorAddress];
    }

    function getSession(uint256 sessionId) external view returns (Session memory) {
        return sessions[sessionId];
    }

    function getAllTutors() external view returns (address[] memory) {
        return tutorList;
    }

    function getTutorCount() external view returns (uint256) {
        return tutorList.length;
    }

    function getTutorClaimable(address tutorAddress) external view returns (uint256) {
        Tutor memory tutor = tutors[tutorAddress];
        return tutor.totalEarned - tutor.totalClaimed;
    }

    receive() external payable {
        studentBalances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value, studentBalances[msg.sender]);
    }

    function _setTutor(
        address tutorAddress,
        string calldata name,
        string calldata bio,
        string calldata languages,
        uint256 ratePerSecond,
        bool active,
        bool isNewTutor
    ) internal {
        require(tutorAddress != address(0), "Tutor address cannot be zero");

        Tutor storage tutor = tutors[tutorAddress];
        tutor.wallet = tutorAddress;
        tutor.name = name;
        tutor.bio = bio;
        tutor.languages = languages;
        tutor.ratePerSecond = _validateRate(ratePerSecond);
        tutor.active = active;

        if (isNewTutor) {
            tutorList.push(tutorAddress);
        }
    }

    function _validateRate(uint256 ratePerSecond) internal pure returns (uint256) {
        require(ratePerSecond > 0, "Rate must be greater than zero");
        return ratePerSecond;
    }
}
