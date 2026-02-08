namespace SignalApp.API.Models
{
    public class DailyLog
    {
        public int Id { get; set; }

        //-----İLİŞKİ KURMA (ÖNEMLİ KISIM)-----
        //Bu kayıt hangi sinyale ait?(Örn : "Kitap Okuma" sinyalinin kaydı)
        public int SignalId { get; set; }

        //Bu satır sayesinde kod yazarken log.Signal.Title diyebiliyoruz
        //Veritabanında sütun olmaz, kod içinde kolaylık sağlar
        public virtual Signal? Signal { get; set; }

        public int CompletedValue { get; set; }//Örn: 80 (Yüzde 80)

        //Hangi günün kaydı?
        public DateTime LogDate { get; set; } = DateTime.Now;
    }
}
