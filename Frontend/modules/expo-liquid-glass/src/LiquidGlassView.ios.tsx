import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

type LiquidGlassVariant = 'regular' | 'clear' | 'thick';

export interface LiquidGlassViewProps {
  variant?: LiquidGlassVariant;
  interactive?: boolean;
  cornerRadius?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

// Try to load native Liquid Glass (only available when built with Xcode 26)
let NativeLiquidGlassView: React.ComponentType<any> | null = null;
try {
  const { requireNativeViewManager } = require('expo-modules-core');
  NativeLiquidGlassView = requireNativeViewManager('ExpoLiquidGlassView');
} catch {
  // Not compiled yet — will use BlurView fallback below
}

export function LiquidGlassView({
  variant = 'regular',
  interactive = false,
  cornerRadius = 16,
  style,
  children,
}: LiquidGlassViewProps) {
  if (NativeLiquidGlassView) {
    const Native = NativeLiquidGlassView;
    return (
      <Native
        variant={variant}
        interactive={interactive}
        cornerRadius={cornerRadius}
        style={[{ overflow: 'hidden', borderRadius: cornerRadius }, style]}
      >
        {children}
      </Native>
    );
  }

  // BlurView fallback — approximates Liquid Glass before Xcode 26 build
  const blurIntensity = variant === 'thick' ? 90 : variant === 'clear' ? 50 : 70;
  return (
    <BlurView
      intensity={blurIntensity}
      tint="systemChromeMaterial"
      style={[{ overflow: 'hidden', borderRadius: cornerRadius }, style]}
    >
      {children}
    </BlurView>
  );
}
