namespace SignalApp.API.Models
{
    public class Signal
    {
        public int Id { get; set; }

        // Supabase auth user UUID — hangi kullanıcıya ait
        public string UserId { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public int TargetValue { get; set; }

        public DateTime CreateAt { get; set; } = DateTime.UtcNow;

        // Hangi güne ait? (YYYY-MM-DD)
        public string Date { get; set; } = string.Empty;

        // Günlük tamamlanma durumu: -1=girilmedi, 0-100=yüzde
        public int Status { get; set; } = -1;

        // Kullanıcının belirlediği sıralama
        public int SortOrder { get; set; } = 0;
    }
}
