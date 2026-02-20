import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring, 
  runOnJS, 
  Easing
} from 'react-native-reanimated';
import { useFonts, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Çubukların sayısı ve hangilerinin sarı olacağı
const PILL_COUNT = 15;
const YELLOW_INDICES = [6, 7, 8]; // Ortadaki 3 tanesi sarı

interface IntroScreenProps {
  onComplete: () => void;
}

// --- DÜZELTME: Çubukları Ayrı Bir Bileşen Yaptık ---
// Hook'ları (useAnimatedStyle) artık bu bileşenin içinde güvenle kullanabiliriz.
const PillItem = ({ index, isYellow, yellowY }: { index: number, isYellow: boolean, yellowY: Animated.SharedValue<number> }) => {
  const pillStyle = useAnimatedStyle(() => {
    if (!isYellow) return {};
    return {
      transform: [{ translateY: yellowY.value }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.pill,
        isYellow ? styles.yellowPill : styles.greyPill,
        pillStyle
      ]}
    />
  );
};

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  // Animasyon Değerleri
  const translateX = useSharedValue(0); 
  const yellowY = useSharedValue(0);    
  const containerScale = useSharedValue(1); 
  const containerOpacity = useSharedValue(1); 

  let [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    // 1. ADIM: Çubuklar sağdan sola kaysın
    translateX.value = withTiming(-SCREEN_WIDTH * 0.4, {
      duration: 1500, 
      easing: Easing.out(Easing.exp),
    }, (finished) => {
      if (finished) {
        // 2. ADIM: Sarı çubuklar yukarı çıksın (Yaylanarak)
        yellowY.value = withSpring(-30, {
          damping: 8,
          stiffness: 100,
        }, (finished) => {
           if (finished) {
             // 3. ADIM: Ekran büyüsün ve kaybolsun
             containerScale.value = withTiming(1.5, { duration: 800 });
             containerOpacity.value = withTiming(0, { duration: 600 }, () => {
               // 4. ADIM: Ana ekrana geç
               runOnJS(onComplete)();
             });
           }
        });
      }
    });
  }, []);

  const rowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: containerScale.value }],
      opacity: containerOpacity.value,
    };
  });

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, containerAnimatedStyle]}>
        
        {/* Üst Yazı */}
        <Text style={styles.title}>Focus on what{'\n'}matters.</Text>

        {/* Çubuklar (Pills) Satırı */}
        <View style={styles.pillsWrapper}>
          <Animated.View style={[styles.pillsRow, rowStyle]}>
            {Array.from({ length: PILL_COUNT }).map((_, index) => (
              <PillItem 
                key={index}
                index={index}
                isYellow={YELLOW_INDICES.includes(index)}
                yellowY={yellowY}
              />
            ))}
          </Animated.View>
        </View>

        {/* Alt Kısım (Tarih ve Buton) */}
        <View style={styles.footer}>
           <View style={styles.dateBadge}>
             <Text style={styles.dateText}>Friday</Text>
             <Text style={styles.subDateText}>12 October, 2026</Text>
           </View>
           <View style={styles.plusButton}>
             <Text style={{fontSize: 24, color: '#000'}}>+</Text>
           </View>
        </View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 32,
    textAlign: 'center',
    color: '#1A1A1A',
    marginBottom: 60,
    marginTop: -40, 
  },
  pillsWrapper: {
    height: 120, 
    width: '100%',
    justifyContent: 'center',
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SCREEN_WIDTH, 
    gap: 12, 
  },
  pill: {
    width: 16,
    height: 42,
    borderRadius: 12,
  },
  greyPill: {
    backgroundColor: '#E5E5E5',
  },
  yellowPill: {
    backgroundColor: '#EAB308', 
    height: 52, 
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  dateBadge: {
    backgroundColor: '#EBEBEB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  dateText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: '#000',
  },
  subDateText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 10,
    color: '#666',
  },
  plusButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EBEBEB',
    justifyContent: 'center',
    alignItems: 'center',
  }
});