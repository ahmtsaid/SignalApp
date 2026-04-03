namespace SignalApp.API.Models
{
    public class DailyLog
    {
        public int Id { get; set; }

        // Supabase auth user UUID
        public string UserId { get; set; } = string.Empty;

        public int SignalId { get; set; }
        public virtual Signal? Signal { get; set; }

        // 0-100 yüzde tamamlanma
        public int CompletedValue { get; set; }

        public DateTime LogDate { get; set; } = DateTime.UtcNow;
    }
}
