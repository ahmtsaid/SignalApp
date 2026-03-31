# iOS TestFlight / App Store Readiness Checklist

Bu checklist, `Frontend` uygulamasini EAS Build + EAS Submit ile TestFlight/App Store'a gondermeden once son kontrolleri yapmak icindir.

## 1) Metadata ve App Store Connect Hazirligi

- [ ] App Store Connect'te uygulama kaydi olusturuldu (`SignalApp`, bundle id: `com.signalapp.app`).
- [ ] Primary language, category ve age rating secildi.
- [ ] App privacy (data collection) beyanlari eksiksiz dolduruldu.
- [ ] Privacy Policy URL ve gerekiyorsa Support URL eklendi.
- [ ] App name, subtitle, keywords, description ve promotional text guncel.
- [ ] Release notes ("What's New") mevcut surume gore yazildi.
- [ ] App icon (1024x1024) ve gerekli ekran goruntuleri yuklendi:
  - [ ] iPhone screenshot seti
  - [ ] iPad screenshot seti (`supportsTablet: true` oldugu icin zorunlu)

## 2) Expo/EAS Release Bilgileri

- [ ] `app.json` degerleri release ile uyumlu:
  - [ ] `expo.name`
  - [ ] `expo.slug`
  - [ ] `expo.scheme`
  - [ ] `expo.version`
  - [ ] `expo.ios.bundleIdentifier`
  - [ ] `expo.ios.buildNumber`
- [ ] `eas.json` profilleri dogrulandi:
  - [ ] `preview` (internal)
  - [ ] `production` (App Store)
  - [ ] iOS `autoIncrement: buildNumber`

## 3) Build ve Submit Komutlari

- [ ] Expo hesabina giris dogrulandi: `eas whoami`
- [ ] Apple team eslesmesi kontrol edildi: `eas build:configure`
- [ ] Preview build alindi:

```bash
eas build -p ios --profile preview
```

- [ ] Production build alindi:

```bash
eas build -p ios --profile production
```

- [ ] Build App Store Connect'e gonderildi:

```bash
eas submit -p ios --profile production
```

## 4) Smoke Test (TestFlight)

Yukleme sonrasi en az 1 iPhone ve 1 iPad cihazinda dogrulayin.

- [ ] Uygulama acilisi sorunsuz (splash -> ilk ekran gecisi normal).
- [ ] Onboarding ve ana navigation akislari calisiyor.
- [ ] Backend API cagrilari basarili (listeleme, olusturma, guncelleme gibi kritik endpointler).
- [ ] Beklenen hata durumlarinda kullaniciya anlasilir mesaj gosteriliyor.
- [ ] Coklu oturum/ac-kapa senaryosunda kritik veri bozulmasi yok.
- [ ] iPad layout ve etkileşimleri kullanilabilir durumda.

## 5) Release Sonrasi Kapanis

- [ ] TestFlight build numarasi ve surum notu kayit altina alindi.
- [ ] Sonraki release icin `version` / `buildNumber` politikasi not edildi.
- [ ] Gerekli ise phased release veya manuel yayin zamani planlandi.

