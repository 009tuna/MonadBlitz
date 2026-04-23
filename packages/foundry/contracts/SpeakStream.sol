// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin ReentrancyGuard — withdraw ve endSession'da reentrancy saldırılarını önler
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SpeakStream
 * @notice Dil öğrenme seansları için saniyelik streaming ödeme kontratı.
 *         Öğrenci MON kilitler, konuştuğu saniye kadar öğretmene ödeme yapılır,
 *         AI doğrulaması başarısız olan saniyeler öğrenciye iade edilir.
 * @dev Monad Testnet üzerinde çalışmak üzere tasarlanmıştır.
 */
contract SpeakStream is ReentrancyGuard {

    // ============================================================
    //                        VERI YAPILARI
    // ============================================================

    /// @notice Seans durumu: Aktif, Bitmiş veya İade Edilmiş
    enum SessionStatus { Active, Ended, Refunded }

    /// @notice Öğretmen bilgilerini tutan yapı
    struct Teacher {
        address wallet;       // Öğretmenin cüzdan adresi
        string name;          // Öğretmenin adı
        string bio;           // Kısa biyografi
        string languages;     // Konuşabildiği diller, virgülle ayrılmış ("en,tr,de")
        uint256 ratePerSecond; // Saniye başına ücret (wei cinsinden)
        bool active;          // Aktif mi?
        uint256 totalEarned;  // Toplam kazanç (tüm zamanlar)
        uint256 withdrawable; // Çekilebilir bakiye
    }

    /// @notice Seans bilgilerini tutan yapı
    struct Session {
        address student;           // Öğrenci adresi
        address teacher;           // Öğretmen adresi
        uint256 ratePerSecond;     // Seans başladığındaki ücret (değişmez)
        uint256 startTime;         // Seans başlangıç zamanı
        uint256 maxDuration;       // Maksimum süre (saniye)
        uint256 totalDeposited;    // Toplam yatırılan MON
        uint256 releasedToTeacher; // AI onaylı saniyeler × rate toplamı
        uint256 refundedToStudent; // AI reddedilen saniyeler × rate toplamı
        uint256 lastReleaseTime;   // Son release zamanı (saniye cinsinden, startTime'dan itibaren)
        SessionStatus status;      // Seans durumu
    }

    // ============================================================
    //                        STATE DEĞİŞKENLERİ
    // ============================================================

    /// @notice Adres → Öğretmen eşleştirmesi
    mapping(address => Teacher) public teachers;

    /// @notice Session ID → Seans eşleştirmesi
    mapping(uint256 => Session) public sessions;

    /// @notice Bir sonraki seans ID'si
    uint256 public nextSessionId;

    /// @notice Kayıtlı öğretmenlerin listesi (frontend'de listelemek için)
    address[] public teacherList;

    // ============================================================
    //                          EVENT'LER
    // ============================================================

    /// @notice Yeni öğretmen kaydedildiğinde tetiklenir
    event TeacherRegistered(address indexed teacher, string name, uint256 ratePerSecond);

    /// @notice Öğretmen bilgileri güncellendiğinde tetiklenir
    event TeacherUpdated(address indexed teacher, string name, uint256 ratePerSecond);

    /// @notice Yeni seans başlatıldığında tetiklenir
    event SessionStarted(
        uint256 indexed sessionId,
        address indexed student,
        address indexed teacher,
        uint256 deposited
    );

    /// @notice Saniyeler serbest bırakıldığında (ödeme + iade) tetiklenir
    event SecondsReleased(
        uint256 indexed sessionId,
        uint256 verifiedSeconds,
        uint256 refundedSeconds,
        uint256 toTeacher,
        uint256 toStudent
    );

    /// @notice Seans bittiğinde tetiklenir
    event SessionEnded(
        uint256 indexed sessionId,
        uint256 totalReleased,
        uint256 totalRefunded
    );

    /// @notice Öğretmen para çektiğinde tetiklenir
    event Withdrawn(address indexed teacher, uint256 amount);

    // ============================================================
    //                        MODIFIER'LAR
    // ============================================================

    /// @notice Sadece seansın öğrencisi çağırabilir
    modifier onlyStudent(uint256 sessionId) {
        require(msg.sender == sessions[sessionId].student, "Sadece ogrenci cagirabilir");
        _;
    }

    /// @notice Sadece aktif seans üzerinde işlem yapılabilir
    modifier onlyActiveSession(uint256 sessionId) {
        require(sessions[sessionId].status == SessionStatus.Active, "Seans aktif degil");
        _;
    }

    // ============================================================
    //                    ÖĞRETMEN FONKSİYONLARI
    // ============================================================

    /**
     * @notice Yeni öğretmen kaydı oluşturur
     * @param _name Öğretmenin adı
     * @param _bio Kısa biyografi
     * @param _languages Konuşabildiği diller (virgülle ayrılmış)
     * @param _ratePerSecond Saniye başına ücret (wei)
     */
    function registerTeacher(
        string calldata _name,
        string calldata _bio,
        string calldata _languages,
        uint256 _ratePerSecond
    ) external {
        // Daha önce kayıt olmamış olmalı
        require(teachers[msg.sender].wallet == address(0), "Zaten kayitli");
        require(_ratePerSecond > 0, "Ucret sifir olamaz");

        teachers[msg.sender] = Teacher({
            wallet: msg.sender,
            name: _name,
            bio: _bio,
            languages: _languages,
            ratePerSecond: _ratePerSecond,
            active: true,
            totalEarned: 0,
            withdrawable: 0
        });

        teacherList.push(msg.sender);

        emit TeacherRegistered(msg.sender, _name, _ratePerSecond);
    }

    /**
     * @notice Öğretmen bilgilerini günceller
     */
    function updateTeacher(
        string calldata _name,
        string calldata _bio,
        string calldata _languages,
        uint256 _ratePerSecond
    ) external {
        require(teachers[msg.sender].wallet != address(0), "Kayitli degil");
        require(_ratePerSecond > 0, "Ucret sifir olamaz");

        Teacher storage t = teachers[msg.sender];
        t.name = _name;
        t.bio = _bio;
        t.languages = _languages;
        t.ratePerSecond = _ratePerSecond;

        emit TeacherUpdated(msg.sender, _name, _ratePerSecond);
    }

    /**
     * @notice Öğretmenin aktif/pasif durumunu değiştirir
     */
    function setTeacherActive(bool _active) external {
        require(teachers[msg.sender].wallet != address(0), "Kayitli degil");
        teachers[msg.sender].active = _active;
    }

    // ============================================================
    //                     SEANS FONKSİYONLARI
    // ============================================================

    /**
     * @notice Yeni bir konuşma seansı başlatır
     * @param _teacher Öğretmenin adresi
     * @param _maxDurationSeconds Maksimum seans süresi (saniye)
     * @return sessionId Oluşturulan seansın ID'si
     * @dev msg.value >= ratePerSecond * maxDurationSeconds olmalı
     */
    function startSession(
        address _teacher,
        uint256 _maxDurationSeconds
    ) external payable returns (uint256 sessionId) {
        Teacher storage t = teachers[_teacher];
        require(t.wallet != address(0), "Ogretmen bulunamadi");
        require(t.active, "Ogretmen aktif degil");
        require(_maxDurationSeconds > 0, "Sure sifir olamaz");

        // Yeterli MON yatırılmış mı kontrol et
        uint256 requiredDeposit = t.ratePerSecond * _maxDurationSeconds;
        require(msg.value >= requiredDeposit, "Yetersiz depozito");

        sessionId = nextSessionId++;

        sessions[sessionId] = Session({
            student: msg.sender,
            teacher: _teacher,
            ratePerSecond: t.ratePerSecond,
            startTime: block.timestamp,
            maxDuration: _maxDurationSeconds,
            totalDeposited: msg.value,
            releasedToTeacher: 0,
            refundedToStudent: 0,
            lastReleaseTime: 0,
            status: SessionStatus.Active
        });

        emit SessionStarted(sessionId, msg.sender, _teacher, msg.value);
    }

    /**
     * @notice Geçen saniyeler için ödeme serbest bırakır
     * @param _sessionId Seans ID'si
     * @param _elapsedSeconds Toplam geçen saniye (startTime'dan itibaren)
     * @param _verifiedSeconds AI tarafından doğrulanan saniye sayısı
     * @dev verifiedSeconds <= elapsedSeconds olmalı
     *      elapsedSeconds <= maxDuration olmalı
     *      Sadece öğrenci çağırabilir (MVP için)
     */
    function releaseElapsed(
        uint256 _sessionId,
        uint256 _elapsedSeconds,
        uint256 _verifiedSeconds
    ) external onlyStudent(_sessionId) onlyActiveSession(_sessionId) {
        Session storage s = sessions[_sessionId];

        // Temel kontroller
        require(_elapsedSeconds <= s.maxDuration, "Sure asimi");
        require(_verifiedSeconds <= _elapsedSeconds, "Dogrulanan > gecen olamaz");
        require(_elapsedSeconds > s.lastReleaseTime, "Zaten islendi");

        // Bu chunk'taki yeni saniyeler
        uint256 newSeconds = _elapsedSeconds - s.lastReleaseTime;
        // Bu chunk'taki doğrulanan saniyeler (lastReleaseTime'dan itibaren)
        uint256 newVerified = _verifiedSeconds;
        // Reddedilen saniyeler
        uint256 newRefunded = newSeconds - newVerified;

        require(newVerified <= newSeconds, "Dogrulanan yeni saniyelerden fazla olamaz");

        // Ödeme hesaplama
        uint256 toTeacher = newVerified * s.ratePerSecond;
        uint256 toStudent = newRefunded * s.ratePerSecond;

        // Toplam serbest bırakılan, depozito'yu aşmamalı
        require(
            s.releasedToTeacher + s.refundedToStudent + toTeacher + toStudent <= s.totalDeposited,
            "Depozito asimi"
        );

        // State güncelle
        s.releasedToTeacher += toTeacher;
        s.refundedToStudent += toStudent;
        s.lastReleaseTime = _elapsedSeconds;

        // Öğretmenin çekilebilir bakiyesine ekle
        teachers[s.teacher].withdrawable += toTeacher;
        teachers[s.teacher].totalEarned += toTeacher;

        // Reddedilen kısmı öğrenciye hemen iade et
        if (toStudent > 0) {
            (bool success, ) = s.student.call{value: toStudent}("");
            require(success, "Iade basarisiz");
        }

        emit SecondsReleased(_sessionId, newVerified, newRefunded, toTeacher, toStudent);
    }

    /**
     * @notice Seansı bitirir ve kalan bakiyeyi öğrenciye iade eder
     * @param _sessionId Seans ID'si
     * @dev Öğrenci veya süre dolduğunda herkes çağırabilir
     */
    function endSession(uint256 _sessionId) external nonReentrant onlyActiveSession(_sessionId) {
        Session storage s = sessions[_sessionId];

        // Sadece öğrenci veya süre dolmuşsa herkes çağırabilir
        require(
            msg.sender == s.student ||
            block.timestamp >= s.startTime + s.maxDuration,
            "Yetki yok"
        );

        s.status = SessionStatus.Ended;

        // Kalan bakiyeyi hesapla ve öğrenciye iade et
        uint256 remaining = s.totalDeposited - s.releasedToTeacher - s.refundedToStudent;
        if (remaining > 0) {
            s.refundedToStudent += remaining;
            (bool success, ) = s.student.call{value: remaining}("");
            require(success, "Iade basarisiz");
        }

        emit SessionEnded(_sessionId, s.releasedToTeacher, s.refundedToStudent);
    }

    // ============================================================
    //                    PARA ÇEKME FONKSİYONU
    // ============================================================

    /**
     * @notice Öğretmen biriken ücretini çeker
     * @dev ReentrancyGuard ile korunur
     */
    function withdraw() external nonReentrant {
        Teacher storage t = teachers[msg.sender];
        require(t.wallet != address(0), "Kayitli degil");
        require(t.withdrawable > 0, "Cekilecek bakiye yok");

        uint256 amount = t.withdrawable;
        t.withdrawable = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer basarisiz");

        emit Withdrawn(msg.sender, amount);
    }

    // ============================================================
    //                     VIEW FONKSİYONLARI
    // ============================================================

    /// @notice Kayıtlı öğretmen sayısını döner
    function getTeacherCount() external view returns (uint256) {
        return teacherList.length;
    }

    /// @notice Belirli bir öğretmenin bilgilerini döner
    function getTeacher(address _teacher) external view returns (Teacher memory) {
        return teachers[_teacher];
    }

    /// @notice Belirli bir seansın bilgilerini döner
    function getSession(uint256 _sessionId) external view returns (Session memory) {
        return sessions[_sessionId];
    }

    /// @notice Tüm öğretmen adreslerini döner
    function getAllTeachers() external view returns (address[] memory) {
        return teacherList;
    }

    /// @notice Kontrata ETH/MON gönderilmesine izin verir
    receive() external payable {}
}
