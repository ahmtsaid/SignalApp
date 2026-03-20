import { requireNativeViewManager } from 'expo-modules-core';
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

type LiquidGlassVariant = 'regular' | 'clear' | 'thick';

export interface LiquidGlassViewProps {
  variant?: LiquidGlassVariant;
  interactive?: boolean;
  cornerRadius?: number;
  style?: StyleProp<ViewStyle>;
}

const NativeLiquidGlassView = requireNativeViewManager('ExpoLiquidGlassView');

export function LiquidGlassView({
  variant = 'regular',
  interactive = false,
  cornerRadius = 16,
  style,
}: LiquidGlassViewProps) {
  return (
    <NativeLiquidGlassView
      variant={variant}
      interactive={interactive}
      cornerRadius={cornerRadius}
      style={[{ overflow: 'hidden' }, style]}
    />
  );
}
