using System.Globalization;

namespace SignalApp.API.Models
{
    public class Signal
    {
        // Her satırın eşsiz bir numarası olmasını sağlar(Primary Key)
        public int Id { get; set; }

        //Sinyalin adını giriyoruz
        public string Title { get; set; } = string.Empty;

        //Açıklama(İsteğe bağlı detay)
        public string Description { get; set; } = string.Empty;

        //Hedef puan veya sıklık ( mesela 100 üzerinden 80)
        public int TargetValue { get; set; }

        //Ne zaman oluşturuldu? (UTC saatiyle)
        public DateTime CreateAt { get; set; } = DateTime.UtcNow;
    }
}
