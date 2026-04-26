import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  SharedValue,
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  Easing, 
  interpolate, 
  Extrapolation,
  cancelAnimation,
  withSpring,
  interpolateColor,
  withSequence,
  withDelay,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, RoundedRect, RadialGradient, Shadow, vec, FractalNoise } from "@shopify/react-native-skia";
import { setOnboardingComplete } from '../lib/onboardingStorage'; 

const SCREEN_WIDTH = Dimensions.get('window').width;
const BACKGROUND_COLOR = 'rgba(37, 36, 34, 1)'; 
const TEXT_BUTTON_GAP = 32;
const TITLE_SUBTITLE_GAP = 12;

const ONBOARDING_DATA = [
  { 
    title: "It's a very noisy\nworld", 
    subtitle: "Everything feels urgent. It's hard\nto see what truly matters." 
  },
  { 
    title: "You need a silent\nspace", 
    subtitle: "A place to cultivate your intents\nand track your evolution." 
  },
  { 
    title: "Ill signals\nEvery single day", 
    subtitle: "Define your priorities. Stay\nconsistent. Visualize your\nmomentum." 
  },
  {
    title: "Your daily signal for\nwhat matters.",
    subtitle: "Three intents to clear the noise\nand build your track record."
  }
];

function PaginationDot({ index, stepProgress, flashAnim }: { index: number, stepProgress: SharedValue<number>, flashAnim: SharedValue<number> }) {
  const dotStyle = useAnimatedStyle(() => {
    const width = interpolate(stepProgress.value, [index - 1, index, index + 1], [9, 24, 9], Extrapolation.CLAMP);
    const opacity = interpolate(stepProgress.value, [index - 1, index, index + 1], [0.3, 1, 0.3], Extrapolation.CLAMP);
    
    const paginationOpacity = interpolate(stepProgress.value, [2, 2.1], [1, 0], Extrapolation.CLAMP);

    const bgColor = interpolateColor(stepProgress.value, [1, 2], ['#FFFFFF', 'transparent']);
    return { width, opacity: opacity * paginationOpacity, backgroundColor: bgColor };
  });

  const gradientOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(stepProgress.value, [1, 2], [1, 0], Extrapolation.CLAMP),
  }));

  const step3GradientOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(stepProgress.value, [1, 2], [0, 1], Extrapolation.CLAMP),
  }));

  const flashOverlayStyle = useAnimatedStyle(() => ({
    opacity: flashAnim.value,
    backgroundColor: 'rgba(255, 199, 0, 1)',
  }));

  return (
    <Animated.View style={[styles.dot, dotStyle, { overflow: 'visible' }]}>
      <Animated.View style={[StyleSheet.absoluteFill, gradientOpacityStyle, { borderRadius: 4, overflow: 'hidden' }]}>
        <LinearGradient colors={['rgba(242, 240, 245, 1)', 'rgba(100, 100, 100, 1)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, step3GradientOpacity, styles.step3DotShadow]}>
        <View style={{ flex: 1, borderRadius: 4, overflow: 'hidden' }}>
          <LinearGradient colors={['rgba(242, 240, 245, 1)', 'rgba(37, 36, 34, 1)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        </View>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, flashOverlayStyle, { borderRadius: 4, overflow: 'hidden' }]} />
    </Animated.View>
  );
}

function FlowingBar({ index, stepProgress, flowY, baseYOffset, flashAnim }: { index: number, stepProgress: SharedValue<number>, flowY: SharedValue<number>, baseYOffset: number, flashAnim: SharedValue<number> }) {
  
  const isCentralSignal = index === 3 || index === 4 || index === 5;

  const barWidth = useDerivedValue(() => {
    const w0 = 116; 
    const targetWidths = [80, 100, 100, 116, 116, 116, 100, 100, 80]; 
    const w1 = targetWidths[index];
    return interpolate(stepProgress.value, [0, 1, 2, 3], [w0, w1, w1, w1], Extrapolation.CLAMP);
  });

  const dynamicBorderRadius = useDerivedValue(() => {
    return interpolate(stepProgress.value, [0, 1, 2, 3], [8, 8, 8, 8], Extrapolation.CLAMP);
  });

  const barStyle = useAnimatedStyle(() => {
    const step1Opacities = [0, 0.2, 0.5, 1, 1, 1, 0.5, 0.2, 0]; 
    const step2Opacities = [0, 0, 0, 1, 1, 1, 0, 0, 0]; 
    const step4Opacities = [0, 0.05, 0.1, 1, 1, 1, 0.1, 0.05, 0]; 

    const opacity = interpolate(
      stepProgress.value,
      [0, 1, 2, 3],
      [1, step1Opacities[index], step2Opacities[index], step4Opacities[index]],
      Extrapolation.CLAMP
    );

    let hiddenOffset = 0;
    if (index < 3) hiddenOffset = (3 - index) * 38; 
    else if (index > 5) hiddenOffset = (5 - index) * 38; 

    const slideY = interpolate(stepProgress.value, [0, 1, 2, 3], [0, 0, hiddenOffset, 0], Extrapolation.CLAMP);

    let bgColor;
    if (isCentralSignal) {
      const baseBg = interpolateColor(
        stepProgress.value, 
        [0, 1, 2, 3], 
        [
          'rgba(122, 121, 120, 1)', 
          'rgba(122, 121, 120, 1)', 
          'rgba(122, 121, 120, 0)', 
          'rgba(122, 121, 120, 0)'
        ]
      );
      bgColor = interpolateColor(flashAnim.value, [0, 1], [baseBg, 'rgba(255, 199, 0, 1)']);
    } else {
      bgColor = interpolateColor(
        stepProgress.value, 
        [0, 1, 2, 3], 
        [
          'rgba(122, 121, 120, 1)', 
          'rgba(122, 121, 120, 1)', 
          'rgba(122, 121, 120, 0)', 
          'rgba(122, 121, 120, 1)' 
        ]
      );
    }

    return { 
      width: barWidth.value, 
      opacity: opacity, 
      backgroundColor: bgColor, 
      overflow: 'visible',
      borderRadius: dynamicBorderRadius.value,
      transform: [{ translateY: slideY }], 
    };
  });

  const shadowOverlayStyle = useAnimatedStyle(() => {
    const stepOffset = interpolate(stepProgress.value, [0, 1, 2, 3], [-19, 0, 0, 0], Extrapolation.CLAMP);
    const physicalY = -38 + stepOffset + flowY.value + baseYOffset + 10;
    const CONTAINER_HEIGHT = 350; 
    const TOP_SHADOW_LENGTH = 20;    
    const BOTTOM_SHADOW_LENGTH = 20; 

    const topShadow = interpolate(physicalY, [-20, 0, TOP_SHADOW_LENGTH], [1, 1, 0], Extrapolation.CLAMP);
    const bottomShadow = interpolate(physicalY, [CONTAINER_HEIGHT - BOTTOM_SHADOW_LENGTH, CONTAINER_HEIGHT], [0, 1], Extrapolation.CLAMP);
    
    const maxShadow = Math.max(topShadow, bottomShadow);
    const stepOpacity = interpolate(stepProgress.value, [0, 0.5, 2.5, 3], [1, 0, 0, 0], Extrapolation.CLAMP);

    return {
      backgroundColor: 'rgba(37,36,34,1)',
      opacity: maxShadow * stepOpacity,
      borderRadius: dynamicBorderRadius.value,
    };
  });

  const skiaOpacityStyle = useAnimatedStyle(() => {
    if (isCentralSignal) {
      return { opacity: interpolate(stepProgress.value, [1, 2], [0, 1], Extrapolation.CLAMP) };
    }
    return { opacity: 0 };
  });

  const gradientOpacity = useDerivedValue(() => {
    if (!isCentralSignal) return 1;
    return interpolate(flashAnim.value, [0, 1], [1, 0.4]);
  });

  const centerVec = useDerivedValue(() => vec((barWidth.value / 2)+3, 31));
  const radius = useDerivedValue(() => 140);

  const canvasAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: barWidth.value + 60,
      height: 72,
      position: 'absolute',
      left: -30,
      top: -26,
      zIndex: 5
    };
  });

  return (
    <Animated.View style={[styles.bar, barStyle]}>
      <Animated.View style={[canvasAnimatedStyle, skiaOpacityStyle]}>
        <Canvas style={{ flex: 1 }}>
          
          <RoundedRect x={30} y={26} width={barWidth} height={20} r={dynamicBorderRadius} opacity={gradientOpacity}>
            <Shadow dx={0} dy={4} blur={25} color="rgba(0,0,0,0.12)" />
            <RadialGradient
              c={centerVec}
              r={radius}
              colors={['#F2F1F6', 'rgba(37, 36, 34, 0.2)']}
              origin={centerVec}
              transform={[{ scaleX: 1.4 }, { scaleY: 0.2 }]}
            />
          </RoundedRect>
          
          <RoundedRect x={30} y={26} width={barWidth} height={20} r={dynamicBorderRadius} opacity={0.12}>
            <FractalNoise freqX={1.2} freqY={1.2} octaves={3} />
          </RoundedRect>

        </Canvas>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, shadowOverlayStyle]} pointerEvents="none" />
    </Animated.View>
  );
}

function FlowingStack({ stepProgress, flowY, flashAnim }: { stepProgress: SharedValue<number>, flowY: SharedValue<number>, flashAnim: SharedValue<number> }) {
  const stackStyle = useAnimatedStyle(() => {
    const stepOffset = interpolate(stepProgress.value, [0, 1, 2, 3], [-19, 0, 0, 0], Extrapolation.CLAMP);
    return {
      height: 342, 
      transform: [{ translateY: flowY.value + 9 + stepOffset }],
      alignItems: 'center',
    };
  });

  return (
    <Animated.View style={stackStyle}>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
        const baseYOffset = i * 38; 
        return (
          <FlowingBar key={i} index={i} stepProgress={stepProgress} flowY={flowY} baseYOffset={baseYOffset} flashAnim={flashAnim} />
        );
      })}
    </Animated.View>
  );
}

const AnimatedSafeArea = Animated.createAnimatedComponent(SafeAreaView);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity); 
const AnimatedText = Animated.createAnimatedComponent(Text);

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const stepProgress = useSharedValue(0); 
  const flowY = useSharedValue(0);        
  const flashAnim = useSharedValue(0); 
  const exitAnim = useSharedValue(1); 

  useEffect(() => {
    stepProgress.value = withTiming(step, { duration: 600, easing: Easing.out(Easing.exp) });

    if (step === 0) {
      flowY.value = withRepeat(
        withTiming(38, { duration: 800, easing: Easing.linear }),
        -1, 
        false 
      );
    } else {
      cancelAnimation(flowY);
      flowY.value = withSpring(0, { damping: 20, stiffness: 200 });
    }

    if (step === 2) {
      flashAnim.value = withDelay(
        600, 
        withSequence(
          withTiming(1, { duration: 600 }), 
          withTiming(0, { duration: 600 })  
        )
      );
    }
  }, [step]);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < 3) { 
      setStep(step + 1);
    } else {
      exitAnim.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
      setTimeout(() => {
        void setOnboardingComplete().then(() => router.replace('/'));
      }, 400);
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(step - 1);
    }
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((e) => {
      if (e.translationX < -50 && e.velocityX < 200) {
        runOnJS(handleNext)();
      } else if (e.translationX > 50 && e.velocityX > -200) {
        runOnJS(handlePrev)();
      }
    });

  const textContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -stepProgress.value * SCREEN_WIDTH }],
    flexDirection: 'row',
    width: SCREEN_WIDTH * 4,
  }));

  const boundingLineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(stepProgress.value, [0, 1, 2.9, 3], [1, 0, 0, 0], Extrapolation.CLAMP),
  }));

  const maskOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(stepProgress.value, [0, 0.85, 1], [1, 0, 0], Extrapolation.CLAMP),
  }));

  const animatedBgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(stepProgress.value, [0, 1, 2, 3], [BACKGROUND_COLOR, BACKGROUND_COLOR, 'rgba(244, 244, 244, 1)', 'rgba(244, 244, 244, 1)'])
  }));

  const animatedTitleStyle = useAnimatedStyle(() => ({
    color: interpolateColor(stepProgress.value, [1, 2, 3], ['#FFFFFF', '#111111', '#111111']), 
  }));

  const animatedSubtitleStyle = useAnimatedStyle(() => ({
    color: interpolateColor(stepProgress.value, [1, 2, 3], ['#A1A1A6', '#8E8E93', '#8E8E93']), 
  }));

  const animatedButtonStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(stepProgress.value, [1, 2, 3], ['#FFFFFF', '#111111', '#111111']), 
  }));

  const animatedButtonTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(stepProgress.value, [1, 2, 3], ['#111111', '#FFFFFF', '#FFFFFF']), 
  }));

  const getStartedBtn_BackgroundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(stepProgress.value, [2.5, 3], [0, 1], Extrapolation.CLAMP),
  }));

  const continueBtnNoiseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(stepProgress.value, [1.5, 2, 2.5], [0, 1, 0], Extrapolation.CLAMP),
  }));

  const textContinueOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(stepProgress.value, [2.5, 3], [1, 0], Extrapolation.CLAMP),
  }));
  const textGetStartedOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(stepProgress.value, [2.5, 3], [0, 1], Extrapolation.CLAMP),
  }));

  const exitScreenStyle = useAnimatedStyle(() => ({
    opacity: exitAnim.value,
    transform: [{ scale: interpolate(exitAnim.value, [0, 1], [0.95, 1]) }]
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <GestureDetector gesture={swipeGesture}>
    <AnimatedSafeArea style={[styles.container, animatedBgStyle, exitScreenStyle]}>
      
      <View style={styles.animationArea}>
        
        <View style={styles.barsMaskContainer}>
          
          <Animated.View style={[StyleSheet.absoluteFill, getStartedBtn_BackgroundStyle, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
            <View style={{ width: 175, height: 248, shadowColor: 'rgba(0,0,0,1)', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 5 }} />
          </Animated.View>
          
          <FlowingStack stepProgress={stepProgress} flowY={flowY} flashAnim={flashAnim} />

          <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, zIndex: 5 }, maskOpacityStyle]} pointerEvents="none">
            <LinearGradient colors={['rgba(37, 36, 34, 1)', 'rgba(37, 36, 34, 0)']} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, zIndex: 5 }, maskOpacityStyle]} pointerEvents="none">
            <LinearGradient colors={['rgba(37, 36, 34, 0)', 'rgba(37, 36, 34, 1)']} style={StyleSheet.absoluteFill} />
          </Animated.View>

          <Animated.View style={[styles.boundingLine, { top: 0 }, boundingLineStyle]}>
            <LinearGradient colors={['rgba(37, 36, 34, 1)', 'rgba(242, 240, 245, 1)', 'rgba(37, 36, 34, 1)']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Animated.View style={[styles.boundingLine, { bottom: 0 }, boundingLineStyle]}>
            <LinearGradient colors={['rgba(37, 36, 34, 1)', 'rgba(242, 240, 245, 1)', 'rgba(37, 36, 34, 1)']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={StyleSheet.absoluteFill} />
          </Animated.View>

        </View>
      </View>

      <View style={styles.bottomArea}>
        <View style={styles.paginationContainer}>
          {[0, 1, 2].map((_, i) => <PaginationDot key={i} index={i} stepProgress={stepProgress} flashAnim={flashAnim} />)}
        </View>

        <View style={styles.textSliderWrapper}>
          <Animated.View style={textContainerStyle}>
            {ONBOARDING_DATA.map((item, index) => (
              <View key={index} style={[
                styles.textPage, 
                index === 3 && styles.textPageScreen4
              ]}>
                
                <AnimatedText style={[
                  styles.title, 
                  animatedTitleStyle, 
                  index === 3 && styles.titleScreen4
                ]}>
                  {item.title}
                </AnimatedText>
                
                <AnimatedText style={[
                  styles.subtitle, 
                  animatedSubtitleStyle, 
                  index === 3 && styles.subtitleScreen4
                ]}>
                  {item.subtitle}
                </AnimatedText>
                
              </View>
            ))}
          </Animated.View>
        </View>

        <AnimatedTouchableOpacity style={[styles.button, animatedButtonStyle]} onPress={handleNext} activeOpacity={0.85}>
          
          <Animated.View style={[StyleSheet.absoluteFill, continueBtnNoiseStyle, { borderRadius: 12, overflow: 'hidden' }]} pointerEvents="none">
            <Canvas style={{ flex: 1 }}>
              <RoundedRect x={0} y={0} width={320} height={48} r={12} opacity={0.12}>
                <FractalNoise freqX={0.7} freqY={0.7} octaves={2} />
              </RoundedRect>
            </Canvas>
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, getStartedBtn_BackgroundStyle, { borderRadius: 12, overflow: 'hidden' }]} pointerEvents="none">
            <Canvas style={{ flex: 1 }}>
              <RoundedRect x={0} y={0} width={320} height={48} r={12} color="rgba(17, 17, 17, 1)" />
              
              <RoundedRect x={0} y={0} width={320} height={48} r={12}>
                <RadialGradient
                  c={vec(0, 150)} 
                  r={180} 
                  colors={['rgba(242, 241, 246, 1)', 'rgba(37, 36, 34, 0)']} 
                />
              </RoundedRect>

              <RoundedRect x={0} y={0} width={320} height={48} r={12}>
                <RadialGradient
                  c={vec(340, -50)} 
                  r={180} 
                  colors={['rgba(242, 241, 246, 1)', 'rgba(37, 36, 34, 0)']} 
                />
              </RoundedRect>
              
              <RoundedRect x={0} y={0} width={320} height={48} r={12} opacity={0.12}>
                <FractalNoise freqX={0.7} freqY={0.7} octaves={2} />
              </RoundedRect>
            </Canvas>
          </Animated.View>
          
          <AnimatedText style={[styles.buttonText, animatedButtonTextStyle, textContinueOpacity, { position: 'absolute' }]}>Continue</AnimatedText>
          <AnimatedText style={[styles.buttonText, animatedButtonTextStyle, textGetStartedOpacity, { position: 'absolute' }]}>Get Started</AnimatedText>
          
        </AnimatedTouchableOpacity>
      </View>
    </AnimatedSafeArea>
    </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  animationArea: { flex: 1.2, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  bottomArea: { flex: 1, justifyContent: 'flex-end', paddingBottom: Platform.OS === 'ios' ? 20 : 40 },
  
  barsMaskContainer: { height: 248, marginBottom: 40, width: 175, overflow: 'hidden', position: 'relative', justifyContent: 'center', marginTop: 190, alignItems: 'center' },
  
  bar: { height: 20, borderRadius: 8, marginBottom: 18 },
  boundingLine: { position: 'absolute', width: 175, height: 2, zIndex: 10, shadowColor: 'rgba(244, 244, 244, 1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 25, elevation: 3 },
  paginationContainer: { flexDirection: 'row', paddingHorizontal: 32, marginBottom: 24, gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  textSliderWrapper: { height: 160, marginBottom: TEXT_BUTTON_GAP },
  textPage: { width: SCREEN_WIDTH, paddingHorizontal: 32, justifyContent: 'flex-end' },
  
  title: { fontFamily: 'HostGrotesk_500Medium', fontSize: 32, marginBottom: TITLE_SUBTITLE_GAP, lineHeight: 32 },
  subtitle: { fontFamily: 'HostGrotesk_500Medium', fontSize: 21, lineHeight: 21 },
  
  button: { marginHorizontal: 32, width : 320, height: 48, borderRadius: 12,justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  buttonText: { fontFamily: 'HostGrotesk_500Medium', fontSize: 18 },
  
  step3DotShadow: {
    shadowColor: 'rgba(37, 36, 34, 1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 24, 
    elevation: 3,
  },

  textPageScreen4: { paddingHorizontal: 50 }, 
  titleScreen4: {
    fontSize: 32, 
    lineHeight: 32,
    marginBottom: TITLE_SUBTITLE_GAP,
    marginTop: 0,
    textAlign: 'center',
  },
  subtitleScreen4: {
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
  }
});