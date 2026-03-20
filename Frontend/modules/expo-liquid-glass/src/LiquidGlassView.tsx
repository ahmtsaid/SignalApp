import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

export interface LiquidGlassViewProps {
  variant?: string;
  interactive?: boolean;
  cornerRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Default/web fallback - Liquid Glass is iOS 26 only. */
export function LiquidGlassView({
  cornerRadius = 16,
  style,
}: LiquidGlassViewProps) {
  return (
    <View
      style={[
        {
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          borderRadius: cornerRadius,
        },
        style,
      ]}
    />
  );
}
