namespace SignalApp.API.Models.Dtos
{
    public class UpdateSignalDto
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public int? Status { get; set; }
        public int? SortOrder { get; set; }
    }

    public class ReorderSignalDto
    {
        public int Id { get; set; }
        public int SortOrder { get; set; }
    }
}
