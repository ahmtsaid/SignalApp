# Apple Liquid Glass Setup Guide for SignalApp

This guide explains how to build and run SignalApp with Apple's **Liquid Glass** effect on your Mac. Liquid Glass is Apple's new design material in iOS 26, featuring real-time light bending, specular highlights, and adaptive shadows.

## Requirements

- **Mac** with macOS (required for iOS development)
- **Xcode 26** or later (includes iOS 26 SDK)
- **iOS 26** device or simulator
- **Node.js** and npm

## Quick Start (on your Mac)

### 1. Clone/Transfer the project

Copy the SignalApp project to your Mac (or pull from git).

### 2. Install dependencies

```bash
cd Frontend
npm install
```

### 3. Generate native iOS project (prebuild)

Expo's prebuild generates the `ios/` folder with Xcode project files:

```bash
npx expo prebuild --platform ios
```

This creates the `ios/` directory with the native project. The local `expo-liquid-glass` module will be automatically linked.

### 4. Open in Xcode and build

```bash
npx expo run:ios
```

Or open the project manually:

```bash
open ios/Frontend.xcworkspace
```

Then in Xcode:
- Select your target device/simulator (iOS 26+)
- Set **Deployment Target** to iOS 26 if you want the full Liquid Glass effect
- Build and run (⌘R)

## What Was Added

### 1. Local Expo module: `expo-liquid-glass`

Located at `Frontend/modules/expo-liquid-glass/`:

- **`ios/ExpoLiquidGlassModule.swift`** – Module definition and view props
- **`ios/ExpoLiquidGlassView.swift`** – SwiftUI view with `.glassEffect()` (iOS 26) and fallback blur (older iOS)
- **`src/index.ts`** – React Native component `LiquidGlassView`

### 2. Integration in the app

The **bottom navigation bar** and **FAB button** use Liquid Glass on iOS:

- `LiquidBottomNav` – Tab bar with Liquid Glass background
- FAB (add button) – Liquid Glass with interactive feedback

### 3. LiquidGlassView API

```tsx
import { LiquidGlassView } from 'expo-liquid-glass';

<LiquidGlassView
  variant="regular"   // 'regular' | 'clear' | 'thick'
  interactive        // Touch/pointer feedback
  cornerRadius={16}
  style={...}
/>
```

## Deployment target

- **iOS 26+**: Full Liquid Glass effect (real-time lensing, specular highlights)
- **iOS &lt; 26**: Fallback to `.ultraThinMaterial` blur

To target iOS 26 only, set in `app.json`:

```json
{
  "expo": {
    "ios": {
      "deploymentTarget": "26.0"
    }
  }
}
```

## Troubleshooting

### "Glass is undefined" or Swift compile errors

- Ensure you're using **Xcode 26** and the **iOS 26 SDK**
- Liquid Glass APIs are only available in the iOS 26 SDK

### Module not found: expo-liquid-glass

```bash
cd Frontend
npm install
```

The module is linked via `"expo-liquid-glass": "file:./modules/expo-liquid-glass"` in `package.json`.

### Prebuild fails or ios/ folder missing

Run prebuild on your Mac:

```bash
npx expo prebuild --platform ios --clean
```

### Liquid Glass not visible

- Run on an **iOS 26** device or simulator
- On older iOS, you'll see the blur fallback instead

## Opting out of Liquid Glass

To disable Liquid Glass and use the previous Skia-based UI:

1. Remove the `LiquidGlassView` import and usage from `app/index.tsx`
2. Restore the original `newNavContainer` and `glassFab` structure (see git history)

## References

- [Apple: Applying Liquid Glass to custom views](https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views)
- [Apple: Liquid Glass overview](https://developer.apple.com/documentation/technologyoverviews/liquid-glass)
