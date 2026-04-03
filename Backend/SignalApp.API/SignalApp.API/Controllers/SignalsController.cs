using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SignalApp.API.Data;
using SignalApp.API.Models;
using SignalApp.API.Models.Dtos;
using System.Security.Claims;

namespace SignalApp.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class SignalsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SignalsController(AppDbContext context)
        {
            _context = context;
        }

        // JWT'den kullanıcı ID'sini al (Supabase "sub" claim'i)
        private string GetUserId() =>
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? throw new UnauthorizedAccessException("User ID bulunamadı.");

        // ──────────────────────────────────────────────────────────────────────
        // GET /api/signals?date=2026-03-21
        // Kullanıcının sinyallerini döndürür (isteğe bağlı tarih filtresi).
        // ──────────────────────────────────────────────────────────────────────
        [HttpGet]
        public async Task<ActionResult<List<Signal>>> GetSignals([FromQuery] string? date = null)
        {
            var userId = GetUserId();
            var query  = _context.Signals.Where(s => s.UserId == userId);

            if (!string.IsNullOrWhiteSpace(date))
                query = query.Where(s => s.Date == date);

            return await query.OrderBy(s => s.SortOrder).ThenBy(s => s.CreateAt).ToListAsync();
        }

        // ──────────────────────────────────────────────────────────────────────
        // POST /api/signals
        // ──────────────────────────────────────────────────────────────────────
        [HttpPost]
        public async Task<ActionResult<Signal>> CreateSignal([FromBody] Signal newSignal)
        {
            var userId = GetUserId();

            // Aynı günde en fazla 3 sinyal
            var count = await _context.Signals
                .CountAsync(s => s.UserId == userId && s.Date == newSignal.Date);

            if (count >= 3)
                return BadRequest("Günde en fazla 3 sinyal oluşturabilirsin.");

            newSignal.UserId    = userId;
            newSignal.CreateAt  = DateTime.UtcNow;
            newSignal.SortOrder = count; // en sona ekle

            _context.Signals.Add(newSignal);
            await _context.SaveChangesAsync();

            return Ok(newSignal);
        }

        // ──────────────────────────────────────────────────────────────────────
        // PATCH /api/signals/{id}
        // Başlık, not veya status güncelle.
        // ──────────────────────────────────────────────────────────────────────
        [HttpPatch("{id:int}")]
        public async Task<ActionResult<Signal>> UpdateSignal(int id, [FromBody] UpdateSignalDto dto)
        {
            var userId = GetUserId();
            var signal = await _context.Signals
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (signal == null) return NotFound();

            if (dto.Title       != null) signal.Title       = dto.Title;
            if (dto.Description != null) signal.Description = dto.Description;
            if (dto.Status.HasValue)
            {
                signal.Status = dto.Status.Value;
                // Geçmiş takibi için DailyLog'a da yaz
                await UpsertDailyLog(userId, signal.Id, dto.Status.Value);
            }
            if (dto.SortOrder.HasValue) signal.SortOrder = dto.SortOrder.Value;

            await _context.SaveChangesAsync();
            return Ok(signal);
        }

        // ──────────────────────────────────────────────────────────────────────
        // POST /api/signals/reorder
        // Birden fazla sinyalin SortOrder değerini toplu güncelle.
        // ──────────────────────────────────────────────────────────────────────
        [HttpPost("reorder")]
        public async Task<IActionResult> Reorder([FromBody] List<ReorderSignalDto> items)
        {
            var userId = GetUserId();
            var ids    = items.Select(x => x.Id).ToList();
            var signals = await _context.Signals
                .Where(s => s.UserId == userId && ids.Contains(s.Id))
                .ToListAsync();

            foreach (var item in items)
            {
                var signal = signals.FirstOrDefault(s => s.Id == item.Id);
                if (signal != null) signal.SortOrder = item.SortOrder;
            }

            await _context.SaveChangesAsync();
            return Ok();
        }

        // ──────────────────────────────────────────────────────────────────────
        // DELETE /api/signals/{id}
        // ──────────────────────────────────────────────────────────────────────
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteSignal(int id)
        {
            var userId = GetUserId();
            var signal = await _context.Signals
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (signal == null) return NotFound("Sinyal bulunamadı.");

            _context.Signals.Remove(signal);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ──────────────────────────────────────────────────────────────────────
        // Yardımcı: bugünün DailyLog kaydını oluştur veya güncelle
        // ──────────────────────────────────────────────────────────────────────
        private async Task UpsertDailyLog(string userId, int signalId, int completedValue)
        {
            var today = DateTime.UtcNow.Date;
            var log   = await _context.DailyLogs
                .FirstOrDefaultAsync(l => l.UserId == userId
                                       && l.SignalId == signalId
                                       && l.LogDate.Date == today);

            if (log == null)
            {
                _context.DailyLogs.Add(new DailyLog
                {
                    UserId         = userId,
                    SignalId       = signalId,
                    CompletedValue = completedValue,
                    LogDate        = DateTime.UtcNow,
                });
            }
            else
            {
                log.CompletedValue = completedValue;
                log.LogDate        = DateTime.UtcNow;
            }
        }
    }
}
