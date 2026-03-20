import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

export interface LiquidGlassViewProps {
  variant?: string;
  interactive?: boolean;
  cornerRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Android fallback - Liquid Glass is iOS 26 only. Uses semi-transparent background. */
export function LiquidGlassView({
  cornerRadius = 16,
  style,
}: LiquidGlassViewProps) {
  return (
    <View
      style={[
        {
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderRadius: cornerRadius,
        },
        style,
      ]}
    />
  );
}
