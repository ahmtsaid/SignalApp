using Microsoft.EntityFrameworkCore;
using SignalApp.API.Models;

namespace SignalApp.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Signal> Signals { get; set; }
        public DbSet<DailyLog> DailyLogs { get; set; }
    }
}