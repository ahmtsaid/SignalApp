using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SignalApp.API.Data;
using SignalApp.API.Models;

namespace SignalApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DailyLogsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DailyLogsController(AppDbContext context)
        {
            _context = context;
        }

        // 1. GÜNLÜK KAYIT EKLE (POST: api/dailylogs)
        // Arkadaşın buraya şöyle bir veri atacak: { "signalId": 1, "completedValue": 80 }
        [HttpPost]
        public async Task<ActionResult<DailyLog>> CreateLog(DailyLog log)
        {
            // Kontrol: Böyle bir sinyal gerçekten var mı? (Olmayan göreve log girilmez)
            // Sinyal yoksa hata fırlatırız (Database bütünlüğünü korumak için).
            var signalExists = await _context.Signals.AnyAsync(s => s.Id == log.SignalId);
            if (!signalExists)
            {
                return BadRequest("Böyle bir sinyal (görev) bulunamadı. ID'yi kontrol et.");
            }

            // Tarihi sunucu saatiyle biz atayalım, telefondan gelen saate güvenmeyelim.
            log.LogDate = DateTime.UtcNow;

            _context.DailyLogs.Add(log);
            await _context.SaveChangesAsync();

            return Ok(log);
        }

        // 2. BELİRLİ BİR SİNYALİN GEÇMİŞİNİ GETİR (GET: api/dailylogs/history/1)
        // Grafik çizerken lazım olacak: "1 numaralı görevin tüm geçmişini ver"
        [HttpGet("history/{signalId}")]
        public async Task<ActionResult<List<DailyLog>>> GetLogHistory(int signalId)
        {
            var logs = await _context.DailyLogs
                                     .Where(x => x.SignalId == signalId) // Sadece o göreve ait olanları süz
                                     .OrderByDescending(x => x.LogDate)  // En yeniden en eskiye sırala
                                     .ToListAsync();

            return logs;
        }

        // 3. HAFTALIK VERİLERİ GETİR (Grafikler için özel endpoint)
        // Burası biraz matematik gerektirecek, şimdilik basit tutalım.
        [HttpGet("weekly-stats")]
        public async Task<ActionResult> GetWeeklyStats()
        {
            // Son 7 günün tarihini bul
            var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);

            // Veritabanından son 7 günün kayıtlarını çek
            var recentLogs = await _context.DailyLogs
                                           .Where(x => x.LogDate >= sevenDaysAgo)
                                           .Include(x => x.Signal) // Sinyal ismini de getir (Join işlemi)
                                           .ToListAsync();

            return Ok(recentLogs);
        }
        //4.AYLIK VERİLERİ GETİR
        [HttpGet("monthly-stats")]

        public async Task<ActionResult> GetMonthlyStats()
        {
            var oneMonthAgo = DateTime.UtcNow.AddDays(-30);

            var recentLogs = await _context.DailyLogs
                                           .Where(x => x.LogDate >= oneMonthAgo)
                                           .Include(x => x.Signal)
                                           .ToListAsync();
            return Ok(recentLogs);
        }
        //5.YILLIK VERİLERİ GETİR
        [HttpGet("yearly-stats")]
        public async Task<ActionResult> GetYearlyStats()
        {
            // Son 1 yıl (365 gün)
            var oneYearAgo = DateTime.UtcNow.AddDays(-365);

            var recentLogs = await _context.DailyLogs
                                           .Where(x => x.LogDate >= oneYearAgo)
                                           .Include(x => x.Signal)
                                           .ToListAsync();

            return Ok(recentLogs);
        }
    }
}
