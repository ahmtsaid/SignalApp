using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using SignalApp.API.Data;

var builder = WebApplication.CreateBuilder(args);

// ─── Database (Supabase PostgreSQL) ─────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ─── Supabase JWT Authentication ─────────────────────────────────────────────
var jwtSecret    = builder.Configuration["Supabase:JwtSecret"]    ?? throw new Exception("Supabase:JwtSecret is required");
var projectUrl   = builder.Configuration["Supabase:ProjectUrl"]   ?? throw new Exception("Supabase:ProjectUrl is required");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey        = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer          = true,
            ValidIssuer             = $"{projectUrl}/auth/v1",
            ValidateAudience        = true,
            ValidAudience           = "authenticated",
            ValidateLifetime        = true,
            ClockSkew               = TimeSpan.FromSeconds(30),
        };
    });

// ─── CORS (React Native can call from any origin) ────────────────────────────
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

// ─── Controllers + Swagger (with Bearer auth) ────────────────────────────────
// React Native / axios camelCase JSON gönderir; model bağlama için açık seçenekler
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy   = JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name        = "Authorization",
        Type        = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme      = "Bearer",
        BearerFormat = "JWT",
        In          = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Supabase JWT token: Bearer <token>",
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
