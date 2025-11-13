# Hệ Thống Tính Điểm TOEIC - Hướng Dẫn Tích Hợp

## Tổng Quan
Hệ thống tính điểm động dựa trên trình độ TOEIC của người dùng, với thông báo động viên khi đạt mốc quan trọng.

## Frontend - ĐÃ HOÀN THÀNH ✅

### 1. DTOs và Interfaces (leaderboard.service.ts)
```typescript
// Thông tin xếp hạng (đã có sẵn)
export interface LeaderboardRankDTO {
  userId: number;
  fullName: string;
  score: number;
  rank: number;
  estimatedTOEICScore: number | null;  // Backend cần trả về
  toeicLevel: string;                   // Backend cần trả về
  avatarUrl: string | null;
}

// Thống kê người dùng trong season
export interface UserSeasonStatsDTO {
  userId: number;
  currentRank: number;
  currentScore: number;
  estimatedTOEICScore: number;
  toeicLevel: string;
  totalAttempts: number;
  correctAnswers: number;
  accuracyRate: number;
  isReadyForTOEIC: boolean;
}

// Tính toán điểm TOEIC chi tiết
export interface TOEICScoreCalculationDTO {
  userId: number;
  estimatedTOEICScore: number;
  toeicLevel: string;
  basePointsPerCorrect: number;
  timeBonus: number;
  accuracyBonus: number;
  difficultyMultiplier: number;
  totalSeasonScore: number;
}

// Thông báo
export interface NotificationDTO {
  notificationId: number;
  userId: number;
  title: string;
  message: string;
  type: 'Khuyến khích' | 'Thành tích' | 'Cảnh báo';
  isRead: boolean;
  createAt: string;
}
```

### 2. Helper Methods (leaderboard.service.ts)
```typescript
// Chuyển đổi level sang tiếng Việt
getTOEICLevelText(level: string): string {
  switch (level) {
    case 'Beginner': return 'Bắt đầu hành trình';
    case 'Elementary': return 'Đang tiến bộ';
    case 'Intermediate': return 'Trung bình';
    case 'Upper-Intermediate': return 'Khá tốt';
    case 'Advanced': return 'Sẵn sàng thi';
    case 'Proficient': return 'Xuất sắc';
    default: return level;
  }
}

// Lấy khoảng điểm TOEIC
getTOEICScoreRange(level: string): string {
  switch (level) {
    case 'Beginner': return '0-200';
    case 'Elementary': return '201-400';
    case 'Intermediate': return '401-600';
    case 'Upper-Intermediate': return '601-750';
    case 'Advanced': return '751-850';
    case 'Proficient': return '851-990';
    default: return 'N/A';
  }
}

// Màu sắc cho từng level
getTOEICLevelColor(level: string): string {
  switch (level) {
    case 'Beginner': return 'bg-gray-100 text-gray-700';
    case 'Elementary': return 'bg-blue-100 text-blue-700';
    case 'Intermediate': return 'bg-green-100 text-green-700';
    case 'Upper-Intermediate': return 'bg-yellow-100 text-yellow-700';
    case 'Advanced': return 'bg-orange-100 text-orange-700';
    case 'Proficient': return 'bg-purple-100 text-purple-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}
```

### 3. Giao Diện Đã Cập Nhật

#### User Leaderboard (Full Page)
- Hiển thị 5 cột: Hạng | Người chơi | TOEIC Ước Tính | Trình Độ | Điểm
- TOEIC Score hiển thị với range bên dưới
- Level hiển thị với màu sắc tương ứng

#### Leaderboard Preview (Homepage Top 3)
- Top 3 hiển thị TOEIC score và level badge
- Rank 1: Background vàng với crown icon
- Rank 2-3: Background trắng với border tương ứng

## Backend - CẦN THỰC HIỆN 🔧

### 1. Quy Tắc Tính Điểm TOEIC

#### Cấu Trúc Điểm
```csharp
public class TOEICLevelConfig
{
    public string Level { get; set; }
    public int MinScore { get; set; }
    public int MaxScore { get; set; }
    public int BasePointsPerCorrect { get; set; }
    public double TimeBonusPercent { get; set; }
    public double AccuracyBonusPercent { get; set; }
}

// Bảng cấu hình
private static readonly List<TOEICLevelConfig> LevelConfigs = new()
{
    new() { Level = "Beginner", MinScore = 0, MaxScore = 200, 
            BasePointsPerCorrect = 15, TimeBonusPercent = 0.30, AccuracyBonusPercent = 1.50 },
    new() { Level = "Elementary", MinScore = 201, MaxScore = 400, 
            BasePointsPerCorrect = 12, TimeBonusPercent = 0.25, AccuracyBonusPercent = 1.20 },
    new() { Level = "Intermediate", MinScore = 401, MaxScore = 600, 
            BasePointsPerCorrect = 8, TimeBonusPercent = 0.20, AccuracyBonusPercent = 0.80 },
    new() { Level = "Upper-Intermediate", MinScore = 601, MaxScore = 750, 
            BasePointsPerCorrect = 5, TimeBonusPercent = 0.15, AccuracyBonusPercent = 0.50 },
    new() { Level = "Advanced", MinScore = 751, MaxScore = 850, 
            BasePointsPerCorrect = 3, TimeBonusPercent = 0.10, AccuracyBonusPercent = 0.30 },
    new() { Level = "Proficient", MinScore = 851, MaxScore = 990, 
            BasePointsPerCorrect = 2, TimeBonusPercent = 0.10, AccuracyBonusPercent = 0.20 }
};
```

#### Công Thức Tính Điểm
```csharp
public int CalculateSeasonScore(
    int userId, 
    int correctAnswers, 
    int totalQuestions, 
    int timeSpentSeconds, 
    int expectedTimeSeconds,
    string questionDifficulty)
{
    // 1. Lấy estimated TOEIC score từ 10 lần thi gần nhất
    var estimatedTOEIC = GetEstimatedTOEICScore(userId);
    
    // 2. Xác định level dựa trên TOEIC score
    var levelConfig = LevelConfigs.First(c => 
        estimatedTOEIC >= c.MinScore && estimatedTOEIC <= c.MaxScore);
    
    // 3. Tính base points
    var basePoints = correctAnswers * levelConfig.BasePointsPerCorrect;
    
    // 4. Tính time bonus (nếu làm nhanh hơn expected time)
    var timeBonus = 0;
    if (timeSpentSeconds < expectedTimeSeconds)
    {
        var timeSavedPercent = (expectedTimeSeconds - timeSpentSeconds) / (double)expectedTimeSeconds;
        timeBonus = (int)(basePoints * levelConfig.TimeBonusPercent * timeSavedPercent);
    }
    
    // 5. Tính accuracy bonus
    var accuracyRate = correctAnswers / (double)totalQuestions;
    var accuracyBonus = 0;
    if (accuracyRate >= 0.8) // >= 80% mới có bonus
    {
        accuracyBonus = (int)(basePoints * levelConfig.AccuracyBonusPercent * (accuracyRate - 0.8) / 0.2);
    }
    
    // 6. Difficulty multiplier
    var difficultyMultiplier = questionDifficulty switch
    {
        "Beginner" => 0.8,
        "Elementary" => 1.0,
        "Intermediate" => 1.2,
        "Upper-Intermediate" => 1.4,
        "Advanced" => 1.6,
        _ => 1.0
    };
    
    // 7. Tổng điểm
    var totalScore = (int)((basePoints + timeBonus + accuracyBonus) * difficultyMultiplier);
    
    return totalScore;
}

private int GetEstimatedTOEICScore(int userId)
{
    // Lấy 10 lần thi Reading + Listening gần nhất
    var recentAttempts = _context.ExamAttempts
        .Where(ea => ea.UserId == userId && 
                     (ea.Exam.ExamPart.PartName == "Reading" || 
                      ea.Exam.ExamPart.PartName == "Listening"))
        .OrderByDescending(ea => ea.CompletedAt)
        .Take(10)
        .ToList();
    
    if (!recentAttempts.Any()) return 0;
    
    // Tính trung bình điểm Reading và Listening
    var avgReading = recentAttempts
        .Where(ea => ea.Exam.ExamPart.PartName == "Reading")
        .Average(ea => ea.Score ?? 0);
    
    var avgListening = recentAttempts
        .Where(ea => ea.Exam.ExamPart.PartName == "Listening")
        .Average(ea => ea.Score ?? 0);
    
    // TOEIC Score Estimation Formula
    // Reading: 0-100 score -> 0-495 TOEIC
    // Listening: 0-100 score -> 0-495 TOEIC
    var estimatedReading = (int)(avgReading * 4.95);
    var estimatedListening = (int)(avgListening * 4.95);
    
    return estimatedReading + estimatedListening;
}
```

### 2. API Endpoints Cần Tạo

#### LeaderboardController.cs

```csharp
// Cập nhật điểm sau khi hoàn thành bài thi
[HttpPost("calculate-score")]
[Authorize]
public async Task<IActionResult> CalculateAndAddScore([FromBody] CompleteExamRequest request)
{
    var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
    
    // 1. Tính điểm season
    var seasonScore = CalculateSeasonScore(
        userId,
        request.CorrectAnswers,
        request.TotalQuestions,
        request.TimeSpentSeconds,
        request.ExpectedTimeSeconds,
        request.QuestionDifficulty
    );
    
    // 2. Lấy estimated TOEIC và level
    var estimatedTOEIC = GetEstimatedTOEICScore(userId);
    var toeicLevel = GetTOEICLevel(estimatedTOEIC);
    var previousLevel = GetPreviousTOEICLevel(userId);
    
    // 3. Cập nhật leaderboard
    var currentSeason = await _context.Leaderboards
        .FirstOrDefaultAsync(l => l.IsActive);
    
    if (currentSeason != null)
    {
        var ranking = await _context.LeaderboardRankings
            .FirstOrDefaultAsync(lr => lr.LeaderboardId == currentSeason.LeaderboardId 
                                    && lr.UserId == userId);
        
        if (ranking == null)
        {
            ranking = new LeaderboardRanking
            {
                LeaderboardId = currentSeason.LeaderboardId,
                UserId = userId,
                Score = seasonScore,
                EstimatedTOEICScore = estimatedTOEIC,
                TOEICLevel = toeicLevel,
                UpdateAt = DateTime.UtcNow
            };
            _context.LeaderboardRankings.Add(ranking);
        }
        else
        {
            ranking.Score += seasonScore;
            ranking.EstimatedTOEICScore = estimatedTOEIC;
            ranking.TOEICLevel = toeicLevel;
            ranking.UpdateAt = DateTime.UtcNow;
        }
        
        await _context.SaveChangesAsync();
        
        // 4. Kiểm tra và gửi thông báo nếu lên level
        if (previousLevel != toeicLevel)
        {
            await CreateLevelUpNotification(userId, toeicLevel, estimatedTOEIC);
        }
        
        // 5. Kiểm tra milestone (200, 400, 600, 750, 850 điểm)
        await CheckAndNotifyMilestone(userId, estimatedTOEIC);
    }
    
    return Ok(new
    {
        SeasonScore = seasonScore,
        EstimatedTOEIC = estimatedTOEIC,
        TOEICLevel = toeicLevel,
        LevelUp = previousLevel != toeicLevel
    });
}

// Lấy thống kê người dùng
[HttpGet("user-stats")]
[Authorize]
public async Task<IActionResult> GetUserStats()
{
    var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
    
    var currentSeason = await _context.Leaderboards
        .FirstOrDefaultAsync(l => l.IsActive);
    
    if (currentSeason == null)
        return NotFound("Không có season nào đang hoạt động");
    
    var ranking = await _context.LeaderboardRankings
        .Include(lr => lr.User)
        .FirstOrDefaultAsync(lr => lr.LeaderboardId == currentSeason.LeaderboardId 
                                && lr.UserId == userId);
    
    if (ranking == null)
        return Ok(new UserSeasonStatsDTO
        {
            UserId = userId,
            CurrentRank = 0,
            CurrentScore = 0,
            EstimatedTOEICScore = GetEstimatedTOEICScore(userId),
            TOEICLevel = GetTOEICLevel(GetEstimatedTOEICScore(userId)),
            TotalAttempts = 0,
            CorrectAnswers = 0,
            AccuracyRate = 0,
            IsReadyForTOEIC = false
        });
    
    // Tính rank
    var rank = await _context.LeaderboardRankings
        .Where(lr => lr.LeaderboardId == currentSeason.LeaderboardId)
        .CountAsync(lr => lr.Score > ranking.Score) + 1;
    
    // Lấy stats từ exam attempts
    var attempts = await _context.ExamAttempts
        .Where(ea => ea.UserId == userId && ea.CompletedAt != null)
        .ToListAsync();
    
    var correctAnswers = attempts.Sum(ea => ea.CorrectAnswers ?? 0);
    var totalQuestions = attempts.Sum(ea => ea.TotalQuestions ?? 0);
    
    return Ok(new UserSeasonStatsDTO
    {
        UserId = userId,
        CurrentRank = rank,
        CurrentScore = ranking.Score,
        EstimatedTOEICScore = ranking.EstimatedTOEICScore ?? 0,
        TOEICLevel = ranking.TOEICLevel,
        TotalAttempts = attempts.Count,
        CorrectAnswers = correctAnswers,
        AccuracyRate = totalQuestions > 0 ? (double)correctAnswers / totalQuestions : 0,
        IsReadyForTOEIC = ranking.EstimatedTOEICScore >= 400
    });
}
```

### 3. Notification System

#### NotificationController.cs

```csharp
[ApiController]
[Route("api/[controller]")]
public class NotificationController : ControllerBase
{
    private readonly LuminaSystemContext _context;
    
    public NotificationController(LuminaSystemContext context)
    {
        _context = context;
    }
    
    // Lấy thông báo của user
    [HttpGet("user")]
    [Authorize]
    public async Task<IActionResult> GetUserNotifications(
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 10)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        
        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreateAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationDTO
            {
                NotificationId = n.NotificationId,
                UserId = n.UserId,
                Title = n.Title,
                Message = n.Message,
                Type = n.Type,
                IsRead = n.IsRead,
                CreateAt = n.CreateAt.ToString("dd/MM/yyyy HH:mm")
            })
            .ToListAsync();
        
        var unreadCount = await _context.Notifications
            .CountAsync(n => n.UserId == userId && !n.IsRead);
        
        return Ok(new
        {
            Notifications = notifications,
            UnreadCount = unreadCount,
            TotalPages = (int)Math.Ceiling(await _context.Notifications
                .CountAsync(n => n.UserId == userId) / (double)pageSize)
        });
    }
    
    // Đánh dấu đã đọc
    [HttpPut("{id}/mark-read")]
    [Authorize]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.NotificationId == id && n.UserId == userId);
        
        if (notification == null)
            return NotFound();
        
        notification.IsRead = true;
        await _context.SaveChangesAsync();
        
        return Ok();
    }
    
    // Đánh dấu tất cả đã đọc
    [HttpPut("mark-all-read")]
    [Authorize]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        
        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();
        
        foreach (var notification in notifications)
        {
            notification.IsRead = true;
        }
        
        await _context.SaveChangesAsync();
        
        return Ok();
    }
}
```

#### Helper Methods for Notifications

```csharp
private async Task CreateLevelUpNotification(int userId, string newLevel, int newScore)
{
    var messages = new Dictionary<string, (string Title, string Message)>
    {
        ["Elementary"] = (
            "🎉 Chúc mừng! Bạn đã lên cấp Elementary",
            $"Bạn đã đạt {newScore} điểm TOEIC ước tính! Hãy tiếp tục cố gắng để đạt mốc 400 điểm nhé!"
        ),
        ["Intermediate"] = (
            "🌟 Tuyệt vời! Trình độ Intermediate",
            $"Bạn đã đạt {newScore} điểm! Đây là mốc quan trọng. Hãy luyện tập thêm để đạt 600 điểm!"
        ),
        ["Upper-Intermediate"] = (
            "🏆 Xuất sắc! Upper-Intermediate",
            $"Bạn đã đạt {newScore} điểm! Chỉ còn 150 điểm nữa là đạt trình độ Advanced!"
        ),
        ["Advanced"] = (
            "🔥 Tuyệt vời! Trình độ Advanced",
            $"Bạn đã đạt {newScore} điểm! Bạn đã sẵn sàng để thi TOEIC thật rồi!"
        ),
        ["Proficient"] = (
            "💎 Xuất sắc nhất! Trình độ Proficient",
            $"Bạn đã đạt {newScore} điểm! Đây là trình độ cao nhất. Chúc mừng bạn!"
        )
    };
    
    if (messages.TryGetValue(newLevel, out var content))
    {
        var notification = new Notification
        {
            UserId = userId,
            Title = content.Title,
            Message = content.Message,
            Type = "Thành tích",
            IsRead = false,
            CreateAt = DateTime.UtcNow
        };
        
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();
    }
}

private async Task CheckAndNotifyMilestone(int userId, int toeicScore)
{
    var milestones = new[] { 200, 400, 600, 750, 850 };
    
    // Kiểm tra xem user đã nhận thông báo milestone này chưa
    var lastNotification = await _context.Notifications
        .Where(n => n.UserId == userId && n.Type == "Thành tích")
        .OrderByDescending(n => n.CreateAt)
        .FirstOrDefaultAsync();
    
    foreach (var milestone in milestones)
    {
        if (toeicScore >= milestone && 
            (lastNotification == null || !lastNotification.Message.Contains($"{milestone} điểm")))
        {
            var notification = new Notification
            {
                UserId = userId,
                Title = $"🎯 Mốc {milestone} điểm!",
                Message = GetMilestoneMessage(milestone),
                Type = "Thành tích",
                IsRead = false,
                CreateAt = DateTime.UtcNow
            };
            
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();
            break; // Chỉ gửi 1 notification mới nhất
        }
    }
}

private string GetMilestoneMessage(int milestone)
{
    return milestone switch
    {
        200 => "Chúc mừng! Bạn đã vượt qua mốc 200 điểm. Hãy tiếp tục cố gắng!",
        400 => "Tuyệt vời! Bạn đã đạt 400 điểm. Bạn đã có nền tảng tiếng Anh cơ bản tốt!",
        600 => "Xuất sắc! Bạn đã đạt 600 điểm. Trình độ giao tiếp của bạn rất tốt!",
        750 => "Tuyệt vời! Bạn đã đạt 750 điểm. Bạn đã sẵn sàng cho môi trường làm việc quốc tế!",
        850 => "Xuất sắc nhất! Bạn đã đạt 850 điểm. Đây là trình độ rất cao!",
        _ => $"Chúc mừng bạn đã đạt {milestone} điểm!"
    };
}
```

### 4. Database Schema

#### Notification Table

```sql
CREATE TABLE Notifications (
    NotificationId INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Message NVARCHAR(1000) NOT NULL,
    Type NVARCHAR(50) NOT NULL, -- 'Khuyến khích', 'Thành tích', 'Cảnh báo'
    IsRead BIT NOT NULL DEFAULT 0,
    CreateAt DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (UserId) REFERENCES Users(UserId)
);

CREATE INDEX IX_Notifications_UserId ON Notifications(UserId);
CREATE INDEX IX_Notifications_IsRead ON Notifications(IsRead);
```

#### Update LeaderboardRanking Table

```sql
-- Thêm cột EstimatedTOEICScore và TOEICLevel
ALTER TABLE LeaderboardRankings
ADD EstimatedTOEICScore INT NULL,
    TOEICLevel NVARCHAR(50) NULL;
```

## Testing Checklist

### Frontend ✅
- [x] User leaderboard hiển thị TOEIC score và level
- [x] Leaderboard preview (top 3) hiển thị TOEIC info
- [x] Colors và styling cho từng level
- [x] Helper methods hoạt động đúng

### Backend (Cần test)
- [ ] Tính estimated TOEIC score từ 10 lần thi gần nhất
- [ ] Xác định level dựa trên TOEIC score
- [ ] Tính điểm season với base points + bonuses
- [ ] Difficulty multiplier được áp dụng đúng
- [ ] Thông báo được tạo khi lên level
- [ ] Thông báo milestone được gửi đúng
- [ ] API /calculate-score hoạt động
- [ ] API /user-stats trả về đúng dữ liệu
- [ ] API notification CRUD hoạt động

## Ví Dụ Request/Response

### Calculate Score After Exam
```json
POST /api/leaderboard/calculate-score
Authorization: Bearer {token}

Request:
{
  "correctAnswers": 35,
  "totalQuestions": 40,
  "timeSpentSeconds": 1200,
  "expectedTimeSeconds": 1800,
  "questionDifficulty": "Intermediate"
}

Response:
{
  "seasonScore": 450,
  "estimatedTOEIC": 550,
  "toeicLevel": "Intermediate",
  "levelUp": false
}
```

### Get User Stats
```json
GET /api/leaderboard/user-stats
Authorization: Bearer {token}

Response:
{
  "userId": 123,
  "currentRank": 15,
  "currentScore": 2850,
  "estimatedTOEICScore": 650,
  "toeicLevel": "Upper-Intermediate",
  "totalAttempts": 45,
  "correctAnswers": 1200,
  "accuracyRate": 0.82,
  "isReadyForTOEIC": true
}
```

## Lưu Ý Quan Trọng

1. **Security**: Tất cả tính toán điểm phải ở backend, không tin tưởng dữ liệu từ frontend
2. **Performance**: Cache estimated TOEIC score, không tính lại mỗi request
3. **Accuracy**: Cần tối thiểu 5 lần thi để estimated TOEIC đáng tin cậy
4. **Notification Spam**: Chỉ gửi thông báo khi thực sự lên level hoặc đạt milestone mới
5. **Time Bonus**: Chỉ áp dụng khi làm nhanh hơn expected time
6. **Accuracy Bonus**: Chỉ áp dụng khi accuracy >= 80%
