# SignalApp Frontend

Expo (SDK 54) tabanli mobil uygulama.

## Gelistirme

```bash
npm install
npx expo start
```

## iOS Release (EAS Build + EAS Submit)

Bu adimlar iOS icin TestFlight/App Store yukleme sirasini netlestirir.

### 1) Hesap ve ortam dogrulamasi

```bash
# Expo hesabini kontrol et
npx eas-cli whoami

# Giris yapman gerekiyorsa
npx eas-cli login

# Apple hesabina baglanti + iOS proje konfig kontrolu
npx eas-cli build:configure --platform ios
```

`build:configure` asamasinda:
- dogru Apple Team secilmis olmali,
- bundle identifier `com.signalapp.app` ile eslesmeli,
- sertifika/provisioning olusturma adimlari tamamlanmali.

### 2) Preview build (once dogrulama)

```bash
npx eas-cli build -p ios --profile preview
```

Bu build'i TestFlight ic test veya cihaz dogrulamasi icin kullan.

### 3) Production build

```bash
npx eas-cli build -p ios --profile production
```

Bu adim App Store'a gidecek release build'ini uretir.

### 4) App Store Connect'e submit

```bash
npx eas-cli submit -p ios --profile production
```

Submit sonrasi build'i App Store Connect > TestFlight altinda takip et.

## NPM script kisayollari

Ayni akisi script olarak da calistirabilirsin:

```bash
npm run eas:whoami
npm run eas:configure:ios
npm run release:ios:preview
npm run release:ios:production
npm run release:ios:submit
```

## TestFlight readiness checklist

Metadata ve smoke test kontrolleri icin:

- [`docs/ios-release-checklist.md`](docs/ios-release-checklist.md)
