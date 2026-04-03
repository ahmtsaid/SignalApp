using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SignalApp.API.Data;
using SignalApp.API.Models;
using System.Security.Claims;

namespace SignalApp.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DailyLogsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DailyLogsController(AppDbContext context)
        {
            _context = context;
        }

        private string GetUserId() =>
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? throw new UnauthorizedAccessException();

        // POST /api/dailylogs
        [HttpPost]
        public async Task<ActionResult<DailyLog>> CreateLog([FromBody] DailyLog log)
        {
            var userId = GetUserId();

            var signalExists = await _context.Signals
                .AnyAsync(s => s.Id == log.SignalId && s.UserId == userId);

            if (!signalExists)
                return BadRequest("Böyle bir sinyal bulunamadı.");

            log.UserId  = userId;
            log.LogDate = DateTime.UtcNow;

            _context.DailyLogs.Add(log);
            await _context.SaveChangesAsync();
            return Ok(log);
        }

        // GET /api/dailylogs/history/{signalId}
        [HttpGet("history/{signalId:int}")]
        public async Task<ActionResult<List<DailyLog>>> GetLogHistory(int signalId)
        {
            var userId = GetUserId();
            var logs   = await _context.DailyLogs
                .Where(x => x.SignalId == signalId && x.UserId == userId)
                .OrderByDescending(x => x.LogDate)
                .ToListAsync();
            return logs;
        }

        // GET /api/dailylogs/weekly-stats
        [HttpGet("weekly-stats")]
        public async Task<ActionResult> GetWeeklyStats()
        {
            var userId       = GetUserId();
            var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);
            var logs         = await _context.DailyLogs
                .Where(x => x.UserId == userId && x.LogDate >= sevenDaysAgo)
                .Include(x => x.Signal)
                .ToListAsync();
            return Ok(logs);
        }

        // GET /api/dailylogs/monthly-stats
        [HttpGet("monthly-stats")]
        public async Task<ActionResult> GetMonthlyStats()
        {
            var userId      = GetUserId();
            var oneMonthAgo = DateTime.UtcNow.AddDays(-30);
            var logs        = await _context.DailyLogs
                .Where(x => x.UserId == userId && x.LogDate >= oneMonthAgo)
                .Include(x => x.Signal)
                .ToListAsync();
            return Ok(logs);
        }

        // GET /api/dailylogs/yearly-stats
        [HttpGet("yearly-stats")]
        public async Task<ActionResult> GetYearlyStats()
        {
            var userId     = GetUserId();
            var oneYearAgo = DateTime.UtcNow.AddDays(-365);
            var logs       = await _context.DailyLogs
                .Where(x => x.UserId == userId && x.LogDate >= oneYearAgo)
                .Include(x => x.Signal)
                .ToListAsync();
            return Ok(logs);
        }
    }
}
