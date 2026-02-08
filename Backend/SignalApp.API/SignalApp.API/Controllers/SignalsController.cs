using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SignalApp.API.Data;
using SignalApp.API.Models;

namespace SignalApp.API.Controllers
{
    // [ApiController]: Bu sınıfın bir API olduğunu belirtir (Garson kıyafeti giydirir).
    //[](Attribiutes) içine yazdığımız şeylere kimlik kazandırır, ancak kodun işleyişini etkilemez
    [ApiController]
    // [Route]: Bu adrese nasıl ulaşılacak? "api/signals" diyerek.
    [Route("api/[controller]")]
    public class SignalsController : ControllerBase
    {
        // Veritabanı ile konuşacak olan aracı (Context)
        private readonly AppDbContext _context;

        // Yapıcı Metot (Constructor): Uygulama başlarken Context'i buraya enjekte eder.
        //context kelimesi bize binevi tercümalık eder, SQL ile C# dili arasında köprü görevi görür
        public SignalsController(AppDbContext context)
        {
            _context = context;
        }

        // 1. TÜM SİNYALLERİ GETİR (GET: api/signals)
        [HttpGet]
        public async Task<ActionResult<List<Signal>>> GetSignals()
        {
            // Veritabanındaki Signals tablosuna git ve listeye çevirip getir.
            return await _context.Signals.ToListAsync();
        }

        // 2. YENİ SİNYAL EKLE (POST: api/signals)
        [HttpPost]
        public async Task<ActionResult<Signal>> CreateSignal(Signal newSignal)
        {
            // İŞ MANTIĞI: Kullanıcının kaç görevi var?
            // "3-5 tane arası görev isteyecek" demiştin.
            // Henüz kullanıcı ayrımı yapmadık ama toplam sayıya bakalım.
            var count = await _context.Signals.CountAsync();

            if (count >= 5)
            {
                return BadRequest("En fazla 5 adet sinyal (görev) oluşturabilirsin.");
            }

            // Veritabanına ekle
            _context.Signals.Add(newSignal);
            // Değişiklikleri kaydet
            await _context.SaveChangesAsync();

            // Başarılı (200 OK) ve oluşturulan veriyi döndür.
            return Ok(newSignal);
        }
        // 3. SİNYAL SİL (DELETE: api/signals/5)
        [HttpDelete("{id}")] // Bu metoda ulaşmak için ID verilmesi şart (örn: api/signals/5)
        public async Task<IActionResult> DeleteSignal(int id)
        {
            // Önce veritabanında bu ID'ye sahip sinyal var mı diye bakıyoruz.
            var signal = await _context.Signals.FindAsync(id);

            // Eğer yoksa "Bulunamadı" hatası dön.
            if (signal == null)
            {
                return NotFound("Böyle bir sinyal bulunamadı.");
            }

            // Varsa, EF Core'a "Bunu silinecekler listesine al" de.
            _context.Signals.Remove(signal);

            // Değişiklikleri veritabanına uygula.
            await _context.SaveChangesAsync();

            // Başarılı, içerik yok (204 No Content) dön. (Silme işleminde genelde veri dönülmez).
            return NoContent();
        }
    }
}
