# Backend Kurulum Kılavuzu

## 1. Supabase Projesi Oluştur

1. https://supabase.com → New Project
2. Proje oluşturulduktan sonra şu bilgileri kopyala:

**Project Settings → API:**
- `Project URL` → `Supabase:ProjectUrl`
- `anon / public` key → Frontend'de kullanılacak

**Project Settings → API → JWT Settings:**
- `JWT Secret` → `Supabase:JwtSecret`

**Project Settings → Database → Connection string (URI, Transaction mode):**
```
postgresql://postgres.[ref]:[password]@aws-0-xx.pooler.supabase.com:6543/postgres
```
Bu URL → `ConnectionStrings:DefaultConnection`

**Mobil uygulama (kayıt ekranı yok, anonim oturum):**

Supabase Dashboard → **Authentication** → **Providers** → **Anonymous** → **Enable** (açık olmalı; yoksa uygulama JWT alamaz ve API çağrıları başarısız olur).

---

## 2. EF Core Migration (yeni alanlar için)

Terminalden Backend klasöründe:

```bash
cd SignalApp.API/SignalApp.API
dotnet ef migrations add AddUserIdDateStatusToSignal
dotnet ef database update
```

> **NOT:** Önce `appsettings.Development.json` içine gerçek Supabase DB URL'ini yazmalısın.

---

## 3. Local Geliştirme

`appsettings.Development.json` dosyasına Supabase bilgilerini gir:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=aws-0-xx.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.[ref];Password=YOUR_DB_PASSWORD;SSL Mode=Require"
  },
  "Supabase": {
    "ProjectUrl": "https://YOURPROJECT.supabase.co",
    "JwtSecret": "YOUR_JWT_SECRET"
  }
}
```

---

## 4. Railway'e Deploy

1. https://railway.app → New Project → Deploy from GitHub repo
2. Root Directory: `Backend`
3. Environment Variables olarak şunları ekle:
   ```
   ConnectionStrings__DefaultConnection=postgresql://...
   Supabase__ProjectUrl=https://xxx.supabase.co
   Supabase__JwtSecret=your-secret
   ASPNETCORE_ENVIRONMENT=Production
   ```
4. Deploy sonrası aldığın URL'i (örn. `https://signalapp-api.up.railway.app`) Frontend'deki `EXPO_PUBLIC_API_URL`'ye yaz.

---

## 5. Render'a Deploy (Railway alternatifi)

1. https://render.com → New → Web Service → GitHub repo
2. Root Directory: `Backend`
3. Build Command: (Dockerfile otomatik algılanır)
4. Environment Variables'a aynı değerleri gir.
