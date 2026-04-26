import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Redirect } from 'expo-router';
import { Animated as RNAnimated, StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, StatusBar, TextInput, Keyboard, UIManager, Pressable, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { getOnboardingComplete, getOnboardingCompleteThisSession } from '../lib/onboardingStorage';
import { useFonts, HostGrotesk_500Medium, HostGrotesk_400Regular, HostGrotesk_700Bold } from '@expo-google-fonts/host-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView, Swipeable, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Colors from '../src/constants/Colors';
import * as Haptics from 'expo-haptics';
import Animated, { SharedValue, useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation, runOnJS, withTiming, withSpring, clamp, LinearTransition, withDelay, interpolateColor } from 'react-native-reanimated';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

// SİHİRLİ SİLAH: SHOPIFY SKIA & SVG
import { Canvas, center, RoundedRect } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, LinearGradient as SvgLinearGradient, Rect, Stop, Circle } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { GlassView, GlassContainer } from 'expo-glass-effect';

/**
 * =============================================================================
 * app/index.tsx — ANA UYGULAMA (DOSYA HARİTASI)
 * =============================================================================
 * Expo Router bu dosyayı "/" rotası olarak yükler (`export default App`).
 *
 * Ctrl+F ile şu başlıkları arayarak bölümler arasında gezinebilirsin:
 *   "1. SABİTLER" … "12. APP" veya "CONTEXT", "CUSTOM DRAG"
 *
 * | Bölüm | İçerik |
 * |-------|--------|
 * | Context | EditMode + ApiContext — sürükleme modu ve API (create/delete/…) |
 * | 1–2 | Ekran ölçüleri, sekmeler, `TaskItem` tipi, `StyleSheet` |
 * | 3 | Tarih/durum string yardımcıları |
 * | 4 | Boş durum, progress bar, gün noktaları (dots), gradient metin |
 * | 5 | Yeni sinyal input’u, satır bileşenleri (Track/Archive) |
 * | 6 | Takvim ızgarası (Track), yıl kartı, dekoratif bubble’lar |
 * | 7 | Alt sekme ikonları + LiquidBottomNav (kayan balon, FAB) |
 * | 8 | Modal sheet’ler: sinyal detayı, mevcut sinyal seçme |
 * | 9 | Track ve Signals tam ekranları |
 * | 10 | Sürükle-sırala: SortableList / SortableTaskItem |
 * | 11 | FlowHomeScreen — Dün/Bugün/Yarın yatay kaydırma |
 * | 12 | App — onboarding, Supabase oturum, üç ana sekme |
 * =============================================================================
 */

SplashScreen.preventAutoHideAsync();

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

/** Sürükle-sıralama modunda mıyız? (alt çubuk ikonları vs.) */
const EditModeContext = React.createContext<boolean>(false);
/** `setIsEditMode` — alt listede düzenleme modunu aç/kapa */
const EditModeSetterContext = React.createContext<(v: boolean) => void>(() => {});

/**
 * API çağrıları (create/delete/update/reorder) FlowHomeScreen'den App'e taşınmadan
 * erişmek için. `App` içinde gerçek `api.*` ile doldurulur.
 */
interface ApiContextType {
  createSignal:   (task: Partial<TaskItem>) => Promise<void>;
  deleteSignal:   (id: string) => Promise<void>;
  updateSignal:   (id: string, updates: Partial<TaskItem>) => Promise<void>;
  reorderSignals: (orderedIds: string[]) => Promise<void>;
}
const ApiContext = React.createContext<ApiContextType>({
  createSignal:   async () => {},
  deleteSignal:   async () => {},
  updateSignal:   async () => {},
  reorderSignals: async () => {},
});


// =====================================================================
// 1. SABİTLER & TİPLER
// =====================================================================
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const BACKGROUND_ALT = '#F2F1F6';

const TAB_FLOW = 0;
const TAB_TRACK = 1;
const TAB_SIGNALS = 2;
const TAB_COUNT = 3;

const NEW_NAV_WIDTH = 290;
const NEW_NAV_HEIGHT = 64;
const BUBBLE_SIZE = 56;
const CONTAINER_PADDING_H = 8;
const TAB_WIDTH = (NEW_NAV_WIDTH - (CONTAINER_PADDING_H * 2)) / TAB_COUNT;
/** Aktif sekme balonu — FAB benzeri oval uçlar (yüksekliğin yarısı = kapsül) */
const NAV_ACTIVE_BUBBLE_HEIGHT = NEW_NAV_HEIGHT - 8;
const NAV_ACTIVE_BUBBLE_RADIUS = NAV_ACTIVE_BUBBLE_HEIGHT / 2;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Tek bir “sinyal” satırı — UI ve backend `Signal` ile eşlenir (lib/api.ts). */
export interface TaskItem {
  id: string;
  text: string;
  note: string;
  /** -1 = henüz işaretlenmedi; 0–1 arası oran (0.25=%25); 1 = Done */
  status: number;
  /** Yerel gün: `YYYY-MM-DD` */
  date: string;
}

// =====================================================================
// 2. STİLLER
// =====================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_ALT, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  header: { paddingHorizontal: 16, paddingTop: 32, backgroundColor: BACKGROUND_ALT, zIndex: 1 },
  pageHeader: { paddingHorizontal: 16 },
  dotsContainer: { flexDirection: 'row', marginBottom: 24, gap: 10, height: 8, alignItems: 'center', justifyContent: 'center', width: '100%' },
  dot: { height: 8, borderRadius: 6, overflow: 'hidden' }, 
  title: { fontFamily: 'HostGrotesk_500Medium', fontSize: 32, color: Colors.primary, marginBottom: 0, lineHeight: 38 },
  date: { fontFamily: 'HostGrotesk_500Medium', fontSize: 24, color: '#8E8E93', marginBottom: 18 },
  
  progressSection: { width: '100%' }, 
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  progressLabelText: { fontFamily: 'HostGrotesk_500Medium', fontSize: 16, color: '#252422' },
  progressValueText: { fontFamily: 'HostGrotesk_500Medium', fontSize: 16, color: '#252422' },
  progressBarRow: { flexDirection: 'row', height: 6, gap: 6 },
  progressSegmentBg: { flex: 1, backgroundColor: '#E5E5E5', borderRadius: 3, overflow: 'hidden' },
  progressSegmentFill: { height: '100%', backgroundColor: '#252422', borderRadius: 3 },
  
  inputSection: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }, 
  listContent: { flex: 1 },
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 28, paddingVertical: 24, height: 150 },
  emptyStateTitle: { fontFamily: 'HostGrotesk_500Medium', fontSize: 18, color: Colors.primary, marginBottom: 8 },
  emptyStateSubtitle: { fontFamily: 'HostGrotesk_400Regular', fontSize: 15, color: '#8E8E93', textAlign: 'center', lineHeight: 22 },
  activeTaskShadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 10 },
  
  taskWrapper: { paddingHorizontal: 16, width: '100%', backgroundColor: 'transparent' },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, paddingVertical: 14 },
  leftContent: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rightContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', width: 50, height: 24 },
  taskText: { fontFamily: 'HostGrotesk_400Regular', fontSize: 15, color: Colors.primary, flex: 1 },
  statusLabel: { fontFamily: 'HostGrotesk_400Regular', fontSize: 13, color: Colors.secondaryText },
  dragHandle: { justifyContent: 'center', alignItems: 'center', paddingLeft: 10, height: '100%', width: 40 },
  
  rightActionContainer: { width: 80, justifyContent: 'center', alignItems: 'center', height: '100%', paddingLeft: 10 },
  deleteCircleButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', marginBottom: -2 },
  deleteActionText: { fontFamily: 'HostGrotesk_500Medium', fontSize: 12, color: '#888' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 52, height: 52 },
  input: { flex: 1, fontFamily: 'HostGrotesk_400Regular', fontSize: 15, color: Colors.primary, padding: 0, textAlignVertical: 'center', height: '100%' },
  itemDivider: { position: 'absolute', bottom: 0, left: 16, right: 16, height: StyleSheet.hairlineWidth, backgroundColor: '#E5E5E5' },
  
  bottomBarWrapper: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center', zIndex: 999 },
  glassContainerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  // Nav pill
  navShadowWrapper: {
    width: NEW_NAV_WIDTH,
    height: NEW_NAV_HEIGHT,
    borderRadius: NEW_NAV_HEIGHT / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  navActiveBubble: {
    position: 'absolute',
    top: 4,
    left: CONTAINER_PADDING_H,
    width: TAB_WIDTH,
    height: NAV_ACTIVE_BUBBLE_HEIGHT,
    borderRadius: NAV_ACTIVE_BUBBLE_RADIUS,
    overflow: 'hidden',
    // SVG drop shadow: dy=8, blur=20, opacity=0.12
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
  },
  navActiveBubbleHighlight: {
    position: 'absolute',
    top: 1,
    left: 12,
    right: 12,
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  navTabsRow: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CONTAINER_PADDING_H,
  },

  // FAB
  fabShadowWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  fabIconWrapper: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  navItem: { width: TAB_WIDTH, alignItems: 'center', justifyContent: 'center', height: '100%', zIndex: 2 },
  navItemContent: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  navLabel: { fontFamily: 'HostGrotesk_500Medium', fontSize: 10, color: Colors.secondaryText },
  flowLines: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 20 },
  disabledButton: { opacity: 0.4 },
  
  sheetOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 9999 },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  fullScreenSheetContainer: { backgroundColor: BACKGROUND_ALT, height: SCREEN_HEIGHT, width: SCREEN_WIDTH, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 40 : 50 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 30, paddingTop: 14},
  sheetHeaderBtnText: { fontFamily: 'HostGrotesk_500Medium', fontSize: 16, color: Colors.primary },
  sheetTitle: { fontFamily: 'HostGrotesk_500Medium', fontSize: 16, color: Colors.secondaryText },
  sheetContentPadding: { paddingHorizontal: 18, paddingTop: 15 },
  sheetTitleContainer: { backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20, minHeight: 60, justifyContent: 'center' },
  sheetTitleInput: { fontFamily: 'HostGrotesk_500Medium', fontSize: 18, color: Colors.primary, padding: 0 },
  sheetNoteLabel: { fontFamily: 'HostGrotesk_500Medium', fontSize: 13, color: '#999', marginBottom: 8, marginLeft: 4 },
  sheetNoteContainer: { backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 24, height: 130 },
  sheetNoteInput: { flex: 1, fontFamily: 'HostGrotesk_400Regular', fontSize: 15, color: Colors.primary, textAlignVertical: 'top' },
  sheetStateLabel: { fontFamily: 'HostGrotesk_500Medium', fontSize: 13, color: '#999', marginBottom: 8, marginLeft: 4 },
  sheetStateWrapper: { backgroundColor: '#fff', borderRadius: 18, padding: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stateButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 },
  stateSeparator: { width: 1.5, height: 16, backgroundColor: '#EBEBEB', marginHorizontal: 2 }, 
  stateButtonActive: { backgroundColor: '#F2F1F6' },
  stateButtonText: { fontFamily: 'HostGrotesk_500Medium', fontSize: 13, color: '#999' },
  stateButtonTextActive: { color: 'black' },
  halfSheetContainer: { backgroundColor: BACKGROUND_ALT, height: SCREEN_HEIGHT * 0.85, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10 }, android: { elevation: 10 } }) },
  sheetItemContainer: { backgroundColor: '#fff', marginHorizontal: 24, marginBottom: 12, borderRadius: 18, borderWidth: 1.5, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 3 }, android: { elevation: 1 } }) },
  sheetItemBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 },
  sheetItemText: { fontFamily: 'HostGrotesk_500Medium', fontSize: 16, color: Colors.primary, flex: 1 },
  sheetCheckbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E5E5', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  sheetCheckboxSelected: { backgroundColor: '#EAB308', borderColor: '#EAB308' },
  searchContainerSheet: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5E5EA', marginHorizontal: 24, borderRadius: 18, paddingHorizontal: 16, height: 40, marginBottom: 24 },
  searchInput: { flex: 1, marginLeft: 10, fontFamily: 'HostGrotesk_400Regular', fontSize: 16, color: Colors.primary },
  dateGroupHeader: { fontFamily: 'HostGrotesk_500Medium', fontSize: 14, color: '#999', marginHorizontal: 16, marginBottom: 12, marginTop: 12 },
  calendarWeekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  
  archiveTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, marginBottom: 24 },
  topBarBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 }, android: { elevation: 2 } }) },
  topBarBtnText: { fontFamily: 'HostGrotesk_500Medium', fontSize: 14, color: Colors.primary },
  archiveListCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 18, paddingVertical: 8, marginBottom: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 }, android: { elevation: 1 } }) },
  archiveItemDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#EBEBEB', marginHorizontal: 16 },
  archiveTaskTitle: { fontFamily: 'HostGrotesk_500Medium', fontSize: 15, color:Colors.primary },
  archiveTaskNote: { fontFamily: 'HostGrotesk_400Regular', fontSize: 13, color: '#A1A1A6', marginTop: 2 },
  archiveTaskStatusText: { fontFamily: 'HostGrotesk_500Medium', fontSize: 13, color:Colors.primary, marginRight: 6 },
  archiveTaskCheckbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#E5E5E5', justifyContent: 'center', alignItems: 'center' },

  // SİNYALLER KARTI
  signalsWrapper: { flex: 1 },
  yearCardContainer: { marginHorizontal: 16, height: 85, borderRadius: 20, overflow: 'hidden', marginBottom: 16, backgroundColor: '#fff', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 }, android: { elevation: 3 } }) },
  yearCardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, position: 'relative' },
  yearCardLeft: { flex: 1, justifyContent: 'center', zIndex: 3 }, 
  yearCardTitle: { fontFamily: 'HostGrotesk_700Bold', fontSize: 24, color: '#1A1A1A', marginBottom: 2 },
  monthSelectorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  yearCardMonth: { fontFamily: 'HostGrotesk_400Regular', fontSize: 12, color: '#666', marginHorizontal: 4 },
  yearCardStats: { fontFamily: 'HostGrotesk_400Regular', fontSize: 10, color: '#999', marginBottom:6 , marginTop : -2},
  bubblesWrapper: { position: 'absolute', right: 0, left: 0, top: 0, bottom: 0, zIndex: 2 },
  bubbleShadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 25, elevation: 8 },
  detailHeaderYear: { fontFamily: 'HostGrotesk_700Bold', fontSize: 16, color: Colors.primary },
  detailHeaderMonth: { fontFamily: 'HostGrotesk_400Regular', fontSize: 13, color: '#8E8E93' },

  // TRACK / ARŞİV EKRANI STİLLERİ
  trackHeaderContainer: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingBottom: 16, paddingTop: Platform.OS === 'android' ? 40 : 50 },
  trackMonthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  trackMonthText: { fontFamily: 'HostGrotesk_500Medium', fontSize: 18, color: '#1A1A1A', marginTop : 14, marginHorizontal: 10 },
  trackDaysHeaderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  trackDayLabel: { fontFamily: 'HostGrotesk_400Regular', fontSize: 12, color: '#A1A1A6', width: 30, textAlign: 'center' },
  trackWeekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  trackDayCell: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center', borderRadius: 0 },
  trackDayCellSelected: { }, 
  trackDayCellToday: { },    
  trackDayText: { fontFamily: 'HostGrotesk_400Regular', fontSize: 16, color: '#1A1A1A' },
  trackDayTextToday: { color: '#FFFFFF', fontFamily: 'HostGrotesk_500Medium' },
  trackContentContainer: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 150 },
  trackDateTitle: { fontFamily: 'HostGrotesk_500Medium', fontSize: 24, color: '#1A1A1A', marginBottom: 0 },

  trackListCard: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 16, marginBottom: 32 },
  trackTaskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  trackTaskTitle: { fontFamily: 'HostGrotesk_400Regular', fontSize: 16, color: '#1A1A1A' },
  trackTaskStatus: { fontFamily: 'HostGrotesk_400Regular', fontSize: 14, color: '#A1A1A6' },
  trackTaskStatusDone: { color: '#EAB308', fontFamily: 'HostGrotesk_500Medium' },
  trackTaskDivider: { height: 1, backgroundColor: '#F2F1F6' },
  activityTitle: { fontFamily: 'HostGrotesk_500Medium', fontSize: 24, color: '#1A1A1A', marginBottom: 12 },
  activityCard: { backgroundColor: 'rgba(255, 255, 255, 1)', borderRadius: 18, padding: 16, flexDirection: 'row' },
});

// =====================================================================
// 3. YARDIMCI FONKSİYONLAR (saf fonksiyonlar — React yok)
// =====================================================================

/** Verilen güne `offset` gün ekleyip `YYYY-MM-DD` döndürür (yerel saat). */
function getLocalIsoDate(offset: number = 0, baseDate = new Date()) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Bugünden `offset` gün sonrasının uzun tarih metni (ör. "Friday, April 3"). */
function getFormattedDateDisplay(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', weekday: 'long' });
}

/** Tek bir `Date` için hafta günü + ay + gün metni. */
function getFormattedArchiveDate(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** `YYYY-MM-DD` string → kısa liste tarihi (ör. "Apr 5, Monday"). */
function getGroupDateDisplay(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getDate()}, ${d.toLocaleDateString('en-US', { weekday: 'long' })}`;
}

/** Liste hücresinde gösterilecek kısa durum yazısı (%25, Done, …). */
function getStatusText(status: number): string {
  if (status === 0) return '';
  if (status === 0.25) return '%25';
  if (status === 0.5) return '%50';
  if (status === 0.75) return '%75';
  if (status === 1) return 'Done';
  return '';
}

// =====================================================================
// 4. KÜÇÜK ORTAK BİLEŞENLER (Flow sayfası üstü, progress, noktalar)
// =====================================================================

/** O gün hiç sinyal yoksa “Create a signal” + alt metin gösterir. */
function EmptyState({ isVisible, onAddTrigger }: { isVisible: boolean, onAddTrigger: () => void }) {
  if (!isVisible) return null;
  
  return (
    <View style={styles.emptyStateContainer}>
      <TouchableOpacity 
         activeOpacity={0.7} 
         onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAddTrigger();
         }}
         style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: 32, // 🌟 Figma: Height 32px
            paddingHorizontal: 12, // 🌟 Figma: Left 12px, Right 12px
            borderWidth: 1, // 🌟 Figma: Border 1px
            borderColor: '#E5E5E5', 
            borderRadius: 9, // 🌟 Figma: Radius 9px
            marginBottom: 6,
            marginTop : 200
         }}
      >
         {/* 🌟 Figma: Gap 4px (marginRight ile sağlandı) */}
         <Ionicons name="add" size={16} color="#1A1A1A" style={{ marginRight: 4 }} />
         <Text style={{ fontFamily: 'HostGrotesk_500Medium', fontSize: 15, color: '#1A1A1A' }}>Create a signal</Text>
      </TouchableOpacity>
      
      <Text style={styles.emptyStateSubtitle}>Getting harder to see what{'\n'}truly matters</Text>
    </View>
  );
}

/** Progress bar’daki tek segment; `fillAmount` 0–1 arası doluluk. */
function ProgressBarSegment({ fillAmount }: { fillAmount: number }) {
  const widthVal = useSharedValue(0);
  useEffect(() => { widthVal.value = withTiming(fillAmount, { duration: 450 }); }, [fillAmount]);
  const fillAnimStyle = useAnimatedStyle(() => ({ width: `${widthVal.value * 100}%` }));
  return (
    <Animated.View style={styles.progressSegmentBg} layout={LinearTransition}>
      <Animated.View style={[styles.progressSegmentFill, fillAnimStyle]} />
    </Animated.View>
  );
}

/**
 * “Signal ratio progress bar” başlığı + yüzde + segmentli bar.
 * Metin ve bar sırayla (hafif gecikmeyle) aşağı kayarak görünür.
 */
function AnimatedProgressSection({ srValue, totalStatus, length }: any) {
  const show = length > 0;
  const contH  = useSharedValue(show ? 60 : 0);
  const contMB = useSharedValue(show ? 24 : 0);
  const textTY = useSharedValue(show ? 0 : -10);
  const textOp = useSharedValue(show ? 1 : 0);
  const barTY  = useSharedValue(show ? 0 : -10);
  const barOp  = useSharedValue(show ? 1 : 0);

  useEffect(() => {
    if (show) {
      contH.value  = withTiming(60, { duration: 320 });
      contMB.value = withTiming(24, { duration: 320 });
      // Text slides down first
      textTY.value = withTiming(0, { duration: 260 });
      textOp.value = withTiming(1, { duration: 260 });
      // Bar slides down 120ms after text
      barTY.value  = withDelay(120, withTiming(0, { duration: 260 }));
      barOp.value  = withDelay(120, withTiming(1, { duration: 260 }));
    } else {
      contH.value  = withTiming(0, { duration: 260 });
      contMB.value = withTiming(0, { duration: 260 });
      textOp.value = withTiming(0, { duration: 180 });
      barOp.value  = withTiming(0, { duration: 180 });
    }
  }, [show]);

  const contStyle = useAnimatedStyle(() => ({
    height: contH.value,
    marginBottom: contMB.value,
    overflow: 'hidden',
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOp.value,
    transform: [{ translateY: textTY.value }],
  }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: barOp.value,
    transform: [{ translateY: barTY.value }],
  }));

  return (
    <Animated.View style={[styles.progressSection, contStyle]}>
      <Animated.View style={[styles.progressHeaderRow, textStyle]}>
        <Text style={styles.progressLabelText}>Signal ratio progress bar</Text>
        <Text style={styles.progressValueText}>%{srValue.toString()}</Text>
      </Animated.View>
      <Animated.View style={[styles.progressBarRow, barStyle]}>
        {Array.from({ length: Math.max(1, length) }).map((_, i) => (
          <ProgressBarSegment key={`seg-${i}`} fillAmount={Math.min(1, Math.max(0, totalStatus - i))} />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

/** Dün/Bugün/Yarın yatay kaydırmada üstteki üç noktadan biri — aktif sayfa genişler. */
function AnimatedDot({ index, scrollX, dotsOpacitySV }: { index: number; scrollX: SharedValue<number>; dotsOpacitySV: SharedValue<number> }) {
  const animatedDotStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
    const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP) * dotsOpacitySV.value;
    const width = interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP);
    return { opacity, width };
  });

  let dotColors = index === 0 ? ['#F2F0F5', '#252422'] : index === 2 ? ['#252422', '#F2F0F5'] : ['rgba(37, 36, 34, 0.8)', 'rgba(37, 36, 34, 0.4)', 'rgba(37, 36, 34, 0.8)'];
  
  return (
    <Animated.View style={[styles.dot, animatedDotStyle]}>
      <LinearGradient colors={dotColors as any} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} />
    </Animated.View>
  );
}

/** Başlık/tarih satırında çok renkli gradient metin (MaskedView + LinearGradient). */
function GradientText({ text, style, alignmentText, colors }: any) {
  if (colors.length === 1) return <Text style={[style, alignmentText, { color: colors[0] }]}>{text}</Text>;
  return (
    <MaskedView maskElement={<Text style={[style, alignmentText, { backgroundColor: 'transparent' }]}>{text}</Text>}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}>
        <Text style={[style, alignmentText, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

// =====================================================================
// 5. GÖREV SATIRLARI — input, swipe, Track/Archive satırları
// =====================================================================

/** “Yeni sinyal” metin kutusu; sadece o gün ekleme modu açıkken görünür. */
function InputHeader({ isAddingThisDay, taskText, setTaskText, handleSubmitTask, hasItems }: any) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isAddingThisDay) setTimeout(() => inputRef.current?.focus(), 150); 
  }, [isAddingThisDay]);

  if (!isAddingThisDay) return null; 

  return (
    <View style={{ backgroundColor: '#FFFFFF', marginHorizontal: 16, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: hasItems ? 0 : 18, borderBottomRightRadius: hasItems ? 0 : 18 }}>
      <View style={styles.inputContainer}>
        <TextInput ref={inputRef} style={styles.input} placeholder="Create a new signal" placeholderTextColor={Colors.pillText} value={taskText} onChangeText={setTaskText} blurOnSubmit={true} onSubmitEditing={handleSubmitTask} />
      </View>
    </View>
  );
}

/** Eski DraggableFlatList satırı — artık kullanılmıyor; referans / silme sonrası lint için tutuldu. */
function _TaskItemRow_unused({ item, drag, isActive, isAddingTask, actualDelete, isFirst, isLast, onSwipeStart, swiperRef, onOpenDetail }: any) {
  const heightMultiplier = useSharedValue(1);
  const translateX = useSharedValue(0);
  const topR = useSharedValue(isFirst ? 18 : 0);
  const bottomR = useSharedValue(isLast ? 18 : 0);
  const editModeSV = useSharedValue(0);
  const isEditMode = React.useContext(EditModeContext);
  const setIsEditMode = React.useContext(EditModeSetterContext);
  const [isSwiped, setIsSwiped] = useState(false);

  useEffect(() => {
    const inEditOrActive = isEditMode || isActive || isSwiped;
    topR.value = withTiming(inEditOrActive ? 18 : (isFirst ? 18 : 0), { duration: 300 });
    bottomR.value = withTiming(inEditOrActive ? 18 : (isLast ? 18 : 0), { duration: 300 });
    editModeSV.value = withTiming(isEditMode ? 1 : 0, { duration: 300 });
  }, [isEditMode, isActive, isFirst, isLast, isSwiped]);

  const handleDelete = () => {
    translateX.value = withTiming(-SCREEN_WIDTH, { duration: 250 }, () => {
      heightMultiplier.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(actualDelete)(item.id);
          runOnJS(setIsEditMode)(false);
        }
      });
    });
  };

  const animatedRowStyle = useAnimatedStyle(() => ({
    height: heightMultiplier.value < 1 ? 52 * heightMultiplier.value : undefined,
    marginHorizontal: 16,
    marginBottom: editModeSV.value * 8,
    overflow: heightMultiplier.value < 1 ? 'hidden' : 'visible',
    zIndex: isActive ? 999 : 1,
  }));

  const animatedBgStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(isActive ? '#FDFDFD' : '#FFFFFF', { duration: 200 }),
    transform: [{ translateX: translateX.value }],
    opacity: withTiming(isAddingTask && !isActive ? 0.3 : 1, { duration: 200 }),
    borderTopLeftRadius: topR.value,
    borderTopRightRadius: topR.value,
    borderBottomLeftRadius: bottomR.value,
    borderBottomRightRadius: bottomR.value,
  }));

  const renderRightActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0.4], extrapolate: 'clamp' });
    const actionOpacity = dragX.interpolate({ inputRange: [-80, -20, 0], outputRange: [1, 0, 0], extrapolate: 'clamp' });
    return (
      <Animated.View style={styles.rightActionContainer}>
        <RNAnimated.View style={{ transform: [{ scale }], opacity: actionOpacity, alignItems: 'center' }}>
          <TouchableOpacity style={styles.deleteCircleButton} onPress={handleDelete} activeOpacity={0.7}><Ionicons name="trash" size={16} color="white" /></TouchableOpacity>
          <RNAnimated.Text style={[styles.deleteActionText, { opacity: actionOpacity }]}>Sil</RNAnimated.Text>
        </RNAnimated.View>
      </Animated.View>
    );
  };

  return (
    <Animated.View style={animatedRowStyle}>
      <View>
        <Swipeable ref={swiperRef} onSwipeableWillOpen={() => { runOnJS(onSwipeStart)(item.id); setIsSwiped(true); }} onSwipeableWillClose={() => setIsSwiped(false)} renderRightActions={renderRightActions} friction={1.5} overshootFriction={8} enabled={!isActive && !isEditMode && !isAddingTask} containerStyle={{ overflow: 'visible' }}>
          <Animated.View style={[animatedBgStyle, isActive ? styles.activeTaskShadow : null]}>
            <TouchableOpacity
              onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onSwipeStart(""); }}
              onPress={() => { if (!isEditMode && !isAddingTask) runOnJS(onOpenDetail)(item, false); }}
              delayLongPress={150}
              activeOpacity={0.7}
              style={{ width: '100%' }}
            >
              <View style={styles.taskWrapper}>
                <View style={styles.headerContent}>
                  <View style={styles.leftContent}>
                    <Text style={styles.taskText} numberOfLines={1} ellipsizeMode="tail">{item.text}</Text>
                  </View>
                  <View style={styles.rightContent}>
                    {!isEditMode && !isActive ? (
                      <Text style={[styles.statusLabel, item.status === 1 ? { color: '#EAB308' } : null]}>{getStatusText(item.status)}</Text>
                    ) : (
                      <Ionicons name="reorder-two-outline" size={24} color={Colors.secondaryText} />
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
            {!isLast && !isSwiped && !isEditMode ? <View style={styles.itemDivider} /> : null}
          </Animated.View>
        </Swipeable>
      </View>
    </Animated.View>
  );
}

/** Signals ekranı gruplarında kompakt sinyal satırı. */
function ArchiveTaskItemRow({ item, onOpenDetail, isLast }: any) {
  const isDone = item.status === 1;
  const statusText = isDone ? 'Done' : item.status === -1 ? '' : `%${item.status * 100}`;
  
  return (
    <View style={{ width: '100%' }}>
      <TouchableOpacity onPress={() => onOpenDetail(item, true)} activeOpacity={0.7} style={{ width: '100%' }}>
        <View style={styles.taskWrapper}>
          <View style={styles.headerContent}>
            <View style={styles.leftContent}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.archiveTaskTitle, { fontSize: 16 }]} numberOfLines={1} ellipsizeMode="tail">{item.text}</Text>
                {item.note ? <Text style={styles.archiveTaskNote} numberOfLines={1} ellipsizeMode="tail">{item.note}</Text> : null}
              </View>
            </View>
            <View style={styles.rightContent}>
              {statusText ? (
                 <Text style={[
                    styles.archiveTaskStatusText, 
                    { fontSize: 14, marginRight: 0 }, 
                    isDone ? { color: '#EAB308', fontFamily: 'HostGrotesk_500Medium' } : { color: '#A1A1A6', fontFamily: 'HostGrotesk_400Regular' }
                 ]}>{statusText}</Text>
              ) : null}
            </View>
          </View>
        </View>
        {!isLast ? <View style={styles.archiveItemDivider} /> : null}
      </TouchableOpacity>
    </View>
  );
}

/** Track sekmesinde seçilen günün kartında büyük sinyal satırı. */
function TrackLargeItemRow({ item, onOpenDetail, isFirst, isLast }: any) {
  const tr = isFirst ? 18 : 0;
  const br = isLast ? 18 : 0;
  const statusText = getStatusText(item.status);

  return (
    <View style={{ marginHorizontal: 0, backgroundColor: '#FFFFFF', borderTopLeftRadius: tr, borderTopRightRadius: tr, borderBottomLeftRadius: br, borderBottomRightRadius: br }}>
      <TouchableOpacity onPress={() => onOpenDetail(item, true)} activeOpacity={0.7} style={{ width: '100%' }}>
        <View style={styles.taskWrapper}>
          <View style={styles.headerContent}>
            <View style={styles.leftContent}>
              <Text style={styles.taskText} numberOfLines={1} ellipsizeMode="tail">{item.text}</Text>
            </View>
            <View style={styles.rightContent}>
               {statusText ? <Text style={[styles.statusLabel, item.status === 1 ? { color: '#EAB308' } : null]}>{statusText}</Text> : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
      {!isLast ? <View style={styles.itemDivider} /> : null}
    </View>
  );
}

// =====================================================================
// 6. TRACK — yıllık aktivite ızgarası + yıl kartı (bubble dekor)
// =====================================================================

/** Seçilen yıl için ay ay takvim kareleri; hangi günde sinyal var renklendirilir. */
function ActivityGrid({ baseDate, allTasks }: { baseDate: Date, allTasks: TaskItem[] }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIso = getLocalIsoDate(0);
  const year = baseDate.getFullYear();
  const currentMonthIndex = baseDate.getMonth();

  const scrollViewRef = useRef<ScrollView>(null);
  
  const monthPositions = useRef<number[]>(new Array(12).fill(-1)); 
  const [snapOffsets, setSnapOffsets] = useState<number[]>([]);

  const yearMonthsData = useMemo(() => {
    const data = [];
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      const rows = Array.from({length: 7}, () => [] as string[]);
      for (let d = 1; d <= daysInMonth; d++) {
         const dow = (new Date(year, m, d).getDay() + 6) % 7; 
         const dateStr = `${year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
         rows[dow].push(dateStr);
      }
      data.push({ name: MONTH_NAMES[m], rows }); 
    }
    return data;
  }, [year, allTasks]);

  useEffect(() => {
      setTimeout(() => {
          if (scrollViewRef.current && monthPositions.current[currentMonthIndex] !== -1) {
              scrollViewRef.current.scrollTo({
                  x: monthPositions.current[currentMonthIndex],
                  y: 0,
                  animated: true,
              });
          }
      }, 150);
  }, [currentMonthIndex, year]); 

  return (
     <View style={styles.activityCard}>
        <View style={{ marginRight: 16, marginTop: 20 }}>
           <Text style={{ fontSize: 10, color: 'rgba(37, 36, 34, 0.4)', fontFamily: 'HostGrotesk_500Medium', position: 'absolute', top: -20, width: 40 }}>{year.toString()}</Text>
           <View style={{ marginTop: -2 }}>
               {days.map((d) => (
                  <Text key={d} style={{ fontSize: 10, color: '#A1A1A6', fontFamily: 'HostGrotesk_500Medium', height: 18, lineHeight: 14 }}>{d}</Text>
               ))}
           </View>
        </View>

        <ScrollView 
           ref={scrollViewRef} 
           horizontal 
           showsHorizontalScrollIndicator={false}
           snapToOffsets={snapOffsets.length > 0 ? snapOffsets : undefined}
           snapToAlignment="start"
           decelerationRate="fast"
        >
           <View style={{ flexDirection: 'row' }}>
              {yearMonthsData.map((mData, mIndex) => (
                 <View 
                    key={mIndex.toString()} 
                    style={{ marginRight: 24 }} 
                    onLayout={(event) => { 
                       monthPositions.current[mIndex] = event.nativeEvent.layout.x; 
                       if (monthPositions.current.every(pos => pos !== -1) && snapOffsets.length === 0) {
                           setSnapOffsets([...monthPositions.current]);
                       }
                    }}
                 > 
                    <Text style={{ fontSize: 10, color: '#A1A1A6', fontFamily: 'HostGrotesk_500Medium', marginBottom: 12, textAlign: 'left' }}>{mData.name}</Text>
                    <View style={{ flexDirection: 'column' }}>
                       {mData.rows.map((rowDates, rIdx) => (
                          <View key={rIdx.toString()} style={{ flexDirection: 'row' }}>
                             {rowDates.map((dateStr, cIdx) => {
                                const boxStyle = { width: 14, height: 14, borderRadius: 2, marginRight: 4, marginBottom: 4, overflow: 'hidden' as const };
                                if (!dateStr) return <View key={cIdx.toString()} style={[boxStyle, { backgroundColor: 'transparent' }]} />; 
                                const isToday = dateStr === todayIso;
                                const hasSignals = allTasks.some(t => t.date === dateStr);
                                if (isToday) {
                                    return <View key={cIdx.toString()} style={[boxStyle, { backgroundColor: '#000000' }]} />;
                                }
                                if (hasSignals) {
                                    return (
                                        <View key={cIdx.toString()} style={boxStyle}>
                                            <Svg height="100%" width="100%">
                                                <Defs>
                                                    <RadialGradient id={`gridGrad-${dateStr}`} cx="50%" cy="50%" rx="80%" ry="80%" fx="80%" fy="80%">
                                                        <Stop offset="0%" stopColor="rgb(130, 129, 133)" stopOpacity="1" />
                                                        <Stop offset="100%" stopColor="#1A1A1A" stopOpacity="1" />
                                                    </RadialGradient>
                                                </Defs>
                                                <Rect x="0" y="0" width="100%" height="100%" fill={`url(#gridGrad-${dateStr})`} />
                                            </Svg>
                                        </View>
                                    );
                                }
                                return <View key={cIdx.toString()} style={[boxStyle, { backgroundColor: '#EBEBEB' }]} />;
                             })}
                          </View>
                       ))}
                    </View>
                 </View>
              ))}
           </View>
        </ScrollView>
     </View>
  )
}

/** Seçili ay + carousel `step` → baloncuk indeksinin gösterdiği takvim ayı (0–11). */
function monthIndexForBubble(bubbleIndex: number, selectedMonth: number, step: number): number {
  const norm = ((step % 6) + 6) % 6;
  return (selectedMonth + bubbleIndex - norm + 12) % 12;
}

function frontBubbleIndexFromStep(step: number): number {
  return ((step % 6) + 6) % 6;
}

/** Yıl kartındaki tek “baloncuk” — `stepSV` ile aylık geçişte konum/ölçek animasyonu. */
function BubbleItem({
  index,
  stepSV,
  onBubbleTap,
  onSwipeMonth,
}: {
  index: number;
  stepSV: SharedValue<number>;
  onBubbleTap: (bubbleIndex: number) => void;
  onSwipeMonth: (direction: number) => void;
}) {
  const gesture = useMemo(
    () =>
      Gesture.Exclusive(
        Gesture.Pan()
          .minDistance(12)
          .activeOffsetX([-10, 10])
          .failOffsetY([-28, 28])
          .onEnd((e) => {
            const tx = e.translationX;
            if (Math.abs(tx) > 22) {
              runOnJS(onSwipeMonth)(tx < 0 ? 1 : -1);
            }
          }),
        Gesture.Tap().onEnd(() => {
          runOnJS(onBubbleTap)(index);
        })
      ),
    [index, onBubbleTap, onSwipeMonth]
  );

  const style = useAnimatedStyle(() => {
    let rawDiff = index - stepSV.value;
    let diff = ((rawDiff % 6) + 6) % 6; 
    if (diff > 3.5) { diff -= 6; }
    const rightVal = interpolate(diff, [-2, -1, 0, 1, 2, 3], [346, 246, 160, 10, -50, -134], Extrapolation.CLAMP);
    const scaleVal = interpolate(diff, [-2, -1, 0, 1, 2, 3], [1, 1, 1, 0.2692, 0.1538, 0], Extrapolation.CLAMP);
    const opacityVal = interpolate(diff, [-2, -1, 0, 1, 2, 3], [0, 0, 1, 1, 1, 0], Extrapolation.CLAMP);
    const zIndexVal = Math.round(interpolate(diff, [-2, -1, 0, 1, 2, 3], [0, 0, 0, 1, 2, 3], Extrapolation.CLAMP));
    return { position: 'absolute', right: rightVal, width: 208, height: 208, opacity: opacityVal, zIndex: zIndexVal, top: -63.5, transform: [{ scale: scaleVal }] };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[style, styles.bubbleShadow]} collapsable={false}>
        <Svg height="100%" width="100%" pointerEvents="none">
          <Defs>
            <RadialGradient id={`sphereGradient-${index}`} cx="30%" cy="50%" rx="60%" ry="60%" fx="30%" fy="20%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="5%" stopColor="rgba(242, 241, 246, 1)" stopOpacity="1" />
              <Stop offset="100%" stopColor="rgb(181, 181, 187)" stopOpacity="1" />
            </RadialGradient>
            <SvgLinearGradient id={`diffuseLight-${index}`} x1="60%" y1="100%" x2="20%" y2="20%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
              <Stop offset="45%" stopColor="#FFFFFF" stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>
          <Circle cx="50%" cy="50%" r="50%" fill={`url(#sphereGradient-${index})`} />
          <Circle cx="50%" cy="50%" r="50%" fill={`url(#diffuseLight-${index})`} />
        </Svg>
      </Animated.View>
    </GestureDetector>
  );
}

/** Alt alta 6 bubble — YearCard arka planında sürekli döngüsel animasyon. */
function BubbleCarousel({
  stepSV,
  onBubbleTap,
  onSwipeMonth,
}: {
  stepSV: SharedValue<number>;
  onBubbleTap: (bubbleIndex: number) => void;
  onSwipeMonth: (direction: number) => void;
}) {
  const items = useMemo(() => Array.from({ length: 6 }).map((_, i) => i), []);
  return (
    <View style={styles.bubblesWrapper} pointerEvents="box-none">
      {items.map((i) => (
        <BubbleItem
          key={i}
          index={i}
          stepSV={stepSV}
          onBubbleTap={onBubbleTap}
          onSwipeMonth={onSwipeMonth}
        />
      ))}
    </View>
  );
}

/** Signals → Yearly: tek yıl satırı; ay seçici + istatistik + BubbleCarousel. */
function YearCard({ year, tasksForYear, onOpenMonthDetail }: any) {
  const currentMonthIndex = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthIndex);
  const [step, setStep] = useState(0);
  const stepSV = useSharedValue(0); 

  useEffect(() => { stepSV.value = withTiming(step, { duration: 350 }); }, [step]);

  const changeMonth = (direction: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let newMonth = selectedMonth + direction;
    if (newMonth > 11) newMonth = 0; if (newMonth < 0) newMonth = 11;
    setSelectedMonth(newMonth);
    setStep(prev => prev + direction);
  };

  const tasksForMonth = useMemo(() => {
    return tasksForYear.filter((t: TaskItem) => {
      const parts = t.date.split('-');
      return parseInt(parts[1], 10) - 1 === selectedMonth;
    });
  }, [tasksForYear, selectedMonth]);

  const total = tasksForMonth.length;
  const completed = tasksForMonth.reduce((sum: number, t: TaskItem) => sum + (t.status === -1 ? 0 : t.status), 0);
  const ratio = total > 0 ? Math.round((completed / total) * 100) : 0;

  const changeMonthBy = useCallback((direction: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMonth((m) => {
      let nm = m + direction;
      if (nm > 11) nm = 0;
      if (nm < 0) nm = 11;
      return nm;
    });
    setStep((prev) => prev + direction);
  }, []);

  /** Ön (en büyük) baloncuk: ay detayı; diğerleri: öne getir (carousel döner) */
  const handleBubbleTap = useCallback(
    (bubbleIndex: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const norm = frontBubbleIndexFromStep(step);
      if (bubbleIndex === norm) {
        const month = monthIndexForBubble(bubbleIndex, selectedMonth, step);
        const monthTasks = tasksForYear.filter((t: TaskItem) => {
          const parts = t.date.split('-');
          return parseInt(parts[1], 10) - 1 === month;
        });
        onOpenMonthDetail(year, month, monthTasks);
        return;
      }
      let delta = bubbleIndex - norm;
      if (delta > 3) delta -= 6;
      if (delta < -3) delta += 6;
      setStep((s) => s + delta);
      setSelectedMonth((m) => {
        let nm = m + delta;
        while (nm > 11) nm -= 12;
        while (nm < 0) nm += 12;
        return nm;
      });
    },
    [year, selectedMonth, step, tasksForYear, onOpenMonthDetail]
  );

  return (
    <View style={styles.yearCardContainer}>
      <LinearGradient colors={['#F2F1F6', '#FFFFFF']} start={{ x: 0, y: 0.5 }} end={{ x: 0.8, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <View style={styles.yearCardContent}>
        <BubbleCarousel stepSV={stepSV} onBubbleTap={handleBubbleTap} onSwipeMonth={changeMonthBy} />
        <View style={styles.yearCardLeft} pointerEvents="box-none">
          <Text style={styles.yearCardTitle}>{year.toString()}</Text>
          <View style={styles.monthSelectorRow}>
            <TouchableOpacity onPress={() => changeMonth(-1)} hitSlop={{top:10, bottom:10, left:10, right:10}}>
              <Ionicons name="chevron-back" size={14} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onOpenMonthDetail(year, selectedMonth, tasksForMonth)} activeOpacity={0.6}>
              <Text style={styles.yearCardMonth}>{MONTH_NAMES[selectedMonth]}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeMonth(1)} hitSlop={{top:10, bottom:10, left:10, right:10}}>
              <Ionicons name="chevron-forward" size={14} color="#888" />
            </TouchableOpacity>
          </View>
          <Text style={styles.yearCardStats}>Total {total.toString()} signal   <Text style={{color:'#999'}}>%{ratio.toString()}</Text></Text>
        </View>
      </View>
    </View>
  );
}

// =====================================================================
// 7. ALT SEKME — Flow/Track/Signals ikonları + LiquidBottomNav + FAB
// =====================================================================

/** Flow sekmesi ikonundaki tek dikey çizgi; yatay gün kaydırmasına göre boyanıp uzar. */
function FlowLine({ index, homeScrollX, isActive }: { index: number, homeScrollX: SharedValue<number>, isActive: boolean }) {
  const lineStyle = useAnimatedStyle(() => {
    const targetX = index * SCREEN_WIDTH;
    const height = interpolate(homeScrollX.value, [targetX - SCREEN_WIDTH, targetX, targetX + SCREEN_WIDTH], [12, 16, 12], Extrapolation.CLAMP);
    const bgColor = interpolateColor(homeScrollX.value, [targetX - SCREEN_WIDTH, targetX, targetX + SCREEN_WIDTH], ['#A1A1A6', '#000000', '#A1A1A6']);
    return { width: 2, height, borderRadius: 0, backgroundColor: isActive ? bgColor : '#A1A1A6' };
  });
  return <Animated.View style={lineStyle} />;
}

function FlowIndicator({ homeScrollX, isActive }: { homeScrollX: SharedValue<number>, isActive: boolean }) {
  return (
    <View style={styles.flowLines}>
      <FlowLine index={0} homeScrollX={homeScrollX} isActive={isActive} />
      <FlowLine index={1} homeScrollX={homeScrollX} isActive={isActive} />
      <FlowLine index={2} homeScrollX={homeScrollX} isActive={isActive} />
    </View>
  );
}

function TrackIndicator({ isActive }: { isActive: boolean }) {
  const iconColor1 = isActive ? '#rgba(0, 0, 0, 0.6)' : '#999999';
  const iconColor2 = isActive ? '#rgba(0, 0, 0, 0.8)' : '#999999';
  const iconColor3= isActive ? '#rgba(0, 0, 0, 0.4)' : '#999999';
  const iconColor4 = isActive ? '#rgba(0, 0, 0, 1)' : '#999999';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 18 }}>
      <View style={{ width: 2, height: 10, backgroundColor: iconColor1, borderRadius: 0 }} />
      <View style={{ width: 2, height: 14, backgroundColor: iconColor2, borderRadius: 0 }} />
      <View style={{ width: 2, height: 8, backgroundColor: iconColor3, borderRadius: 0 }} />
      <View style={{ width: 2, height: 16, backgroundColor: iconColor4, borderRadius: 0 }} />
    </View>
  );
}

function SignalsIndicator({ isActive }: { isActive: boolean }) {
  const iconColor = isActive ? '#000000' : '#999999'; 
  return (
    <View style={{ justifyContent: 'center', alignItems: 'center', gap: 3, height: 18, width: 18 }}>
      <View style={{ width: 18, height: 2, backgroundColor: iconColor, borderRadius: 0}} />
      <View style={{ width: 18, height: 2, backgroundColor: iconColor, borderRadius: 0 }} />
      <View style={{ width: 18, height: 2, backgroundColor: iconColor, borderRadius: 0 }} />
    </View>
  );
}

/**
 * Alt cam/pill bar: aktif sekme balonu, uzun basılı sürükleme ile sekme değiştirme,
 * sağda + FAB.
 * iOS: expo-glass-effect (Liquid Glass); Android ve diğerleri: güçlü BlurView fallback.
 */
function LiquidBottomNav({ currentTab, isFabDisabled, onChangeTab, onAddTrigger, onSheetTrigger, homeScrollX }: any) {
  const activeBubbleX   = useSharedValue(0);
  const bubbleScale     = useSharedValue(1);
  const bubbleFillOp    = useSharedValue(1);   // 1 = normal, 0 = fully transparent
  const currentTabSV    = useSharedValue(currentTab);
  const fabScale        = useSharedValue(1);

  // Apple spring config — snappy with subtle natural bounce
  const SPRING = { damping: 26, stiffness: 340, mass: 0.75 };
  const FAB_ELASTIC_SPRING = { damping: 14, stiffness: 240, mass: 0.55 };

  useEffect(() => {
    activeBubbleX.value = withSpring(currentTab * TAB_WIDTH, SPRING);
    currentTabSV.value  = currentTab;
  }, [currentTab]);

  const FAB_PRESS_IN_SPRING = { damping: 18, stiffness: 440 };

  const bubbleAnimStyle = useAnimatedStyle(() => ({
    opacity: bubbleFillOp.value,
    /* + FAB gibi yalnızca scale — ekstra rotasyon yok */
    transform: [{ translateX: activeBubbleX.value }, { scale: bubbleScale.value }],
  }));

  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  /** Uzun basış — + ile aynı ölçek / yay (1.28 + FAB_ELASTIC_SPRING) */
  const bubbleLiquidHoldGesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(210)
        .maxDistance(14)
        .onStart(() => {
          bubbleScale.value = withSpring(1.28, FAB_ELASTIC_SPRING);
          bubbleFillOp.value = withTiming(0.22, { duration: 220 });
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
        }),
    []
  );

  /** Kaydırma — + onPressIn (1.08) ile aynı yay; sürüklerken hafif büyüme */
  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(2)
        .activeOffsetX([-10, 10])
        .failOffsetY([-22, 22])
        .onBegin(() => {
          bubbleScale.value = withSpring(1.08, FAB_PRESS_IN_SPRING);
          bubbleFillOp.value = withTiming(0.28, { duration: 160 });
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        })
        .onUpdate((e) => {
          const startX = currentTabSV.value * TAB_WIDTH;
          activeBubbleX.value = clamp(startX + e.translationX, 0, (TAB_COUNT - 1) * TAB_WIDTH);
          const dragAmt = Math.abs(e.translationX);
          bubbleScale.value = 1.08 + Math.min(dragAmt / 260, 0.055);
        })
        .onEnd(() => {
          const snapped = Math.round(clamp(activeBubbleX.value / TAB_WIDTH, 0, TAB_COUNT - 1));
          activeBubbleX.value = withSpring(snapped * TAB_WIDTH, SPRING);
          bubbleScale.value = withSpring(1.0, SPRING);
          bubbleFillOp.value = withTiming(1.0, { duration: 240 });
          runOnJS(onChangeTab)(snapped);
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        })
        .onFinalize(() => {
          bubbleScale.value = withSpring(1.0, SPRING);
          bubbleFillOp.value = withTiming(1.0, { duration: 220 });
        }),
    [onChangeTab]
  );

  const navBubbleGesture = useMemo(
    () => Gesture.Simultaneous(bubbleLiquidHoldGesture, dragGesture),
    [bubbleLiquidHoldGesture, dragGesture]
  );

  const renderTab = (tabIndex: number, label: string, iconName: any, customIcon?: React.ReactNode) => {
    const isActive = currentTab === tabIndex;
    return (
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChangeTab(tabIndex); }}
        activeOpacity={0.85}
      >
        <View style={styles.navItemContent}>
          {customIcon ?? <Ionicons name={iconName} size={18} color={isActive ? '#1a1a1a' : Colors.secondaryText} />}
          <Text style={[styles.navLabel, isActive && { color: '#1a1a1a' }]}>{label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const navBlurMain = Platform.OS === 'ios' ? 92 : 56;
  const navBlurDeep = Platform.OS === 'ios' ? 42 : 28;

  const useLiquidGlassNav = Platform.OS === 'ios';

  const navGlassBubbleOnly = (
    <Animated.View style={[styles.navActiveBubble, bubbleAnimStyle]} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(175,175,185,0.92)', borderRadius: NAV_ACTIVE_BUBBLE_RADIUS }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(120,120,132,0.28)', borderRadius: NAV_ACTIVE_BUBBLE_RADIUS }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: NAV_ACTIVE_BUBBLE_RADIUS }]} />
      <View style={[styles.navActiveBubbleHighlight, { left: 14, right: 14 }]} />
    </Animated.View>
  );

  return (
    <View style={styles.bottomBarWrapper} pointerEvents="box-none">
      {useLiquidGlassNav ? (
        <GlassContainer spacing={12} style={styles.glassContainerRow}>
          <GlassView style={styles.navShadowWrapper} glassEffectStyle="regular" colorScheme="light">
            {navGlassBubbleOnly}
            <GestureDetector gesture={navBubbleGesture}>
              <View style={styles.navTabsRow}>
                {renderTab(TAB_FLOW, "Flow", null, <FlowIndicator homeScrollX={homeScrollX} isActive={currentTab === TAB_FLOW} />)}
                {renderTab(TAB_TRACK, "Track", null, <TrackIndicator isActive={currentTab === TAB_TRACK} />)}
                {renderTab(TAB_SIGNALS, "Signals", null, <SignalsIndicator isActive={currentTab === TAB_SIGNALS} />)}
              </View>
            </GestureDetector>
          </GlassView>
          <Animated.View style={fabAnimStyle}>
            <TouchableOpacity
              activeOpacity={1}
              disabled={isFabDisabled}
              delayLongPress={260}
              onPress={() => {
                fabScale.value = withSpring(1, SPRING);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                runOnJS(onAddTrigger)();
              }}
              onPressIn={() => {
                if (!isFabDisabled) fabScale.value = withSpring(1.08, { damping: 18, stiffness: 440 });
              }}
              onPressOut={() => {
                fabScale.value = withSpring(1, SPRING);
              }}
              onLongPress={() => {
                fabScale.value = withSpring(1.28, FAB_ELASTIC_SPRING);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                runOnJS(onSheetTrigger)();
              }}
            >
              <GlassView
                style={[styles.fabShadowWrapper, isFabDisabled && styles.disabledButton]}
                glassEffectStyle="regular"
                isInteractive
                colorScheme="light"
              >
                <View style={styles.fabIconWrapper}>
                  <Ionicons name="add" size={30} color={isFabDisabled ? '#999' : '#1a1a1a'} />
                </View>
              </GlassView>
            </TouchableOpacity>
          </Animated.View>
        </GlassContainer>
      ) : (
      <View style={styles.glassContainerRow}>
        {/* Nav pill — çift blur + üst parlama + ince çerçeve (Liquid Glass API yokken) */}
        <View style={[styles.navShadowWrapper, { overflow: 'hidden', borderRadius: NEW_NAV_HEIGHT / 2 }]}>
          <BlurView
            intensity={navBlurMain}
            tint="light"
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            style={StyleSheet.absoluteFill}
          />
          <BlurView
            intensity={navBlurDeep}
            tint="light"
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            style={[StyleSheet.absoluteFill, { opacity: Platform.OS === 'ios' ? 0.78 : 1 }]}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.62)', 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0.38)']}
            locations={[0, 0.45, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: NEW_NAV_HEIGHT / 2 }]}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.22 }}
            style={[StyleSheet.absoluteFill, { borderRadius: NEW_NAV_HEIGHT / 2 }]}
            pointerEvents="none"
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: NEW_NAV_HEIGHT / 2,
                borderWidth: StyleSheet.hairlineWidth * 1.5,
                borderColor: 'rgba(255,255,255,0.72)',
              },
            ]}
          />
          <Animated.View style={[styles.navActiveBubble, bubbleAnimStyle]} pointerEvents="none">
            <BlurView
              intensity={Platform.OS === 'ios' ? 36 : 22}
              tint="light"
              style={[StyleSheet.absoluteFill, { borderRadius: NAV_ACTIVE_BUBBLE_RADIUS, overflow: 'hidden' }]}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(175,175,185,0.88)', borderRadius: NAV_ACTIVE_BUBBLE_RADIUS }]} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(95,95,110,0.22)', borderRadius: NAV_ACTIVE_BUBBLE_RADIUS }]} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: NAV_ACTIVE_BUBBLE_RADIUS }]} />
            <View style={[StyleSheet.absoluteFill, { borderRadius: NAV_ACTIVE_BUBBLE_RADIUS, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.75)' }]} />
            <View style={styles.navActiveBubbleHighlight} />
          </Animated.View>
          <GestureDetector gesture={navBubbleGesture}>
            <View style={styles.navTabsRow}>
              {renderTab(TAB_FLOW, "Flow", null, <FlowIndicator homeScrollX={homeScrollX} isActive={currentTab === TAB_FLOW} />)}
              {renderTab(TAB_TRACK, "Track", null, <TrackIndicator isActive={currentTab === TAB_TRACK} />)}
              {renderTab(TAB_SIGNALS, "Signals", null, <SignalsIndicator isActive={currentTab === TAB_SIGNALS} />)}
            </View>
          </GestureDetector>
        </View>

        <Animated.View style={fabAnimStyle}>
          <TouchableOpacity
            activeOpacity={1}
            disabled={isFabDisabled}
            delayLongPress={260}
            style={[styles.fabShadowWrapper, isFabDisabled && styles.disabledButton, { overflow: 'hidden', borderRadius: 25 }]}
            onPress={() => {
              fabScale.value = withSpring(1, SPRING);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              runOnJS(onAddTrigger)();
            }}
            onPressIn={() => {
              if (!isFabDisabled) fabScale.value = withSpring(1.08, { damping: 18, stiffness: 440 });
            }}
            onPressOut={() => {
              fabScale.value = withSpring(1, SPRING);
            }}
            onLongPress={() => {
              fabScale.value = withSpring(1.28, FAB_ELASTIC_SPRING);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              runOnJS(onSheetTrigger)();
            }}
          >
          <BlurView
            intensity={Platform.OS === 'ios' ? 88 : 52}
            tint="light"
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            style={StyleSheet.absoluteFill}
          />
          <BlurView
            intensity={Platform.OS === 'ios' ? 38 : 24}
            tint="light"
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            style={[StyleSheet.absoluteFill, { opacity: 0.8 }]}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.58)', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.4)']}
            locations={[0, 0.5, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 25 }]}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.35 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 25 }]}
            pointerEvents="none"
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 25,
                borderWidth: StyleSheet.hairlineWidth * 1.5,
                borderColor: 'rgba(255,255,255,0.75)',
              },
            ]}
          />
          <View style={styles.fabIconWrapper}>
            <Ionicons name="add" size={30} color={isFabDisabled ? '#999' : '#1a1a1a'} />
          </View>
        </TouchableOpacity>
        </Animated.View>
      </View>
      )}
    </View>
  );
}

// =====================================================================
// 8. SHEET / MODAL — sinyal detayı, mevcut sinyal ekleme listesi
// =====================================================================

/** Sinyale dokununca: not, durum slider’ı, kaydet → `onUpdateTask` ile üst state + API. */
function SignalDetailSheet({ visible, onClose, task, onUpdateTask, isReadOnly }: { visible: boolean, onClose: () => void, task: TaskItem | null, onUpdateTask: (id: string, updates: Partial<TaskItem>) => void, isReadOnly?: boolean }) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const sliderX = useSharedValue(0);
  const stateOptions = [0, 0.25, 0.5, 0.75, 1];
  const buttonWidth = (SCREEN_WIDTH - 36 - 12) / 5; 

  const [localTask, setLocalTask] = useState<TaskItem | null>(null);

  useEffect(() => {
    if (visible && task) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      translateY.value = withSpring(0, { damping: 26, stiffness: 240, mass: 1 });
      
      setLocalTask({ ...task });
      
      const selectedIndex = stateOptions.indexOf(task.status);
      if (selectedIndex !== -1) {
        sliderX.value = selectedIndex * buttonWidth;
      } else {
        sliderX.value = 0;
      }
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
    }
  }, [visible, task]);

  const safeStatus = localTask ? localTask.status : -1;

  const panGesture = Gesture.Pan()
    .enabled(!isReadOnly) 
    .onUpdate((e) => {
      const currentIndex = stateOptions.indexOf(safeStatus) === -1 ? 0 : stateOptions.indexOf(safeStatus);
      const startX = currentIndex * buttonWidth;
      sliderX.value = clamp(startX + e.translationX, 0, buttonWidth * 4);
    })
    .onEnd((e) => {
      const snappedIndex = Math.round(sliderX.value / buttonWidth);
      sliderX.value = withSpring(snappedIndex * buttonWidth, { damping: 20, stiffness: 200 });
      if (localTask) {
        runOnJS(setLocalTask)({ ...localTask, status: stateOptions[snappedIndex] });
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    });

  const sheetAnimStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const animatedSliderStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sliderX.value }] }));

  if (!localTask) return null;

  const updateStatus = (v: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newIndex = stateOptions.indexOf(v);
    
    if (localTask.status === -1) {
       sliderX.value = newIndex * buttonWidth; 
    } else {
       sliderX.value = withSpring(newIndex * buttonWidth, { damping: 40, stiffness: 250 }); 
    }
    
    setLocalTask({ ...localTask, status: v });
  };

  const handleDone = () => {
    Keyboard.dismiss();
    if (localTask && task) {
       onUpdateTask(task.id, localTask);
    }
    onClose();
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Animated.View style={[styles.sheetOverlay, { pointerEvents: visible ? 'auto' : 'none' }]}>
      <Animated.View style={[styles.fullScreenSheetContainer, sheetAnimStyle]}>
        
        <View style={styles.sheetHeader}>
          {!isReadOnly ? (
             <TouchableOpacity onPress={handleCancel} hitSlop={{top:15, bottom:15, left:15, right:15}}>
                <Text style={[styles.sheetHeaderBtnText, { color: '#000000' }]}>Cancel</Text>
             </TouchableOpacity>
          ) : <View style={{width: 50}} />}
          
          <Text style={[styles.sheetTitle, { color: '#1A1A1A', fontFamily: 'HostGrotesk_700Bold' }]} numberOfLines={1} ellipsizeMode="tail">Signal Details</Text>
          
          <TouchableOpacity onPress={isReadOnly ? handleCancel : handleDone} hitSlop={{top:15, bottom:15, left:15, right:15}}>
             <Text style={[styles.sheetHeaderBtnText, { fontWeight: 'bold', color: '#1A1A1A' }]}>{isReadOnly ? 'Close' : 'Done'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={[styles.sheetContentPadding, { paddingBottom: 150 }]} 
            keyboardShouldPersistTaps="handled"
            pointerEvents={isReadOnly ? 'none' : 'auto'} 
        >
          <View style={styles.sheetTitleContainer}>
            <TextInput 
              style={styles.sheetTitleInput} value={localTask.text} 
              onChangeText={(t) => setLocalTask({ ...localTask, text: t })} 
              multiline={true} blurOnSubmit={true} onSubmitEditing={() => Keyboard.dismiss()} 
              placeholder="Signal name..." placeholderTextColor="#BBBBBB" 
              editable={!isReadOnly}
            />
          </View>
          
          <Text style={styles.sheetNoteLabel}>Note</Text>
          <View style={styles.sheetNoteContainer}>
            <TextInput 
              style={styles.sheetNoteInput} multiline 
              placeholder={isReadOnly ? "No note attached." : "Add a detailed note..."} 
              placeholderTextColor="#999" value={localTask.note} 
              onChangeText={(t) => setLocalTask({ ...localTask, note: t })} 
              blurOnSubmit={true} onSubmitEditing={() => Keyboard.dismiss()} 
              editable={!isReadOnly}
            />
          </View>
          
            <Text style={styles.sheetStateLabel}>State</Text>
            <GestureDetector gesture={panGesture}>
              <View style={styles.sheetStateWrapper}>
                {localTask.status !== -1 ? (
                  <Animated.View style={[animatedSliderStyle, { position: 'absolute', left: 6, top: 6, bottom: 6, width: buttonWidth, borderRadius: 29, overflow: 'hidden', backgroundColor: 'rgba(0, 0, 0, 1)' }]}>
                    <Svg height="100%" width="100%" style={{ position: 'absolute' }}>
                      <Defs><RadialGradient id="stateSliderLight" cx="80%" cy="100%" rx="100%" ry="80%" fx="100%" fy="100%"><Stop offset="0%" stopColor="rgb(146, 145, 150)" /><Stop offset="100%" stopColor="rgba(37, 36, 34, 1)" /></RadialGradient></Defs>
                      <Rect x="0" y="0" width="100%" height="100%" fill="url(#stateSliderLight)" />
                    </Svg>
                  </Animated.View>
                ) : null}
                {stateOptions.map((v, i) => (
                  <React.Fragment key={v.toString()}>
                    <TouchableOpacity 
                       style={{ flex: 1, alignItems: 'center', paddingVertical: 10, zIndex: 2 }} 
                       onPress={() => updateStatus(v)}
                       disabled={isReadOnly}
                    >
                       <Text style={{ fontFamily: 'HostGrotesk_500Medium', fontSize: 13, color: localTask.status === v ? '#FFFFFF' : '#999' }}>{v === 1 ? 'Done' : v === 0 ? 'Void' : getStatusText(v)}</Text>
                    </TouchableOpacity>
                    {i < stateOptions.length - 1 ? <View style={[styles.stateSeparator, localTask.status !== -1 && { opacity: 0 }]} /> : null}
                  </React.Fragment>
                ))}
              </View>
            </GestureDetector>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

/** + sheet içinde tek satır — seçim modunda checkbox, normalde tıkla ekle. */
function ExistingSignalRowSheet({ text, isSelectionMode, isSelected, isDisabled, isLast, onPress }: any) {
  const opacity = useSharedValue(1);
  const modeAnim = useSharedValue(isSelectionMode ? 1 : 0); 

  useEffect(() => { opacity.value = withTiming(isDisabled ? 0.35 : 1, { duration: 200 }); }, [isDisabled]);
  useEffect(() => { modeAnim.value = withTiming(isSelectionMode ? 1 : 0, { duration: 250 }); }, [isSelectionMode]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const textStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(modeAnim.value, [0, 1], [0, 36]) }],
    flex: 1,
    justifyContent: 'center'
  }));

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(modeAnim.value, [0, 1], [-20, 0]) }],
    opacity: modeAnim.value,
    position: 'absolute',
    left: 16,
  }));

  const safeId = text ? text.replace(/[^a-zA-Z0-9]/g, '') : Math.random().toString();

  return (
    <Animated.View style={[
       styles.sheetItemContainer, 
       animStyle, 
       { 
         borderColor: 'transparent', 
         borderWidth: 0, 
         height: 52, 
         marginHorizontal: 0, 
         marginBottom: 0, 
         borderRadius: 0, 
         paddingVertical: 0,
         elevation: 0, 
         shadowOpacity: 0
       }
    ]}>
      <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }} onPress={onPress} disabled={isDisabled && !isSelected} activeOpacity={0.7}>
        
        <Animated.View style={[circleStyle, { zIndex: 2, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }]}>
           {isSelected ? (
              <View style={{ width: 24, height: 24, borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                <Svg height="100%" width="100%" style={{ position: 'absolute' }}>
                   <Defs>
                      <RadialGradient id={`selectedGrad-${safeId}`} cx="20%" cy="20%" rx="80%" ry="80%" fx="50%" fy="50%">
                         <Stop offset="0%" stopColor="#858282" stopOpacity="1" />
                         <Stop offset="100%" stopColor="#1A1A1A" stopOpacity="1" />
                      </RadialGradient>
                   </Defs>
                   <Rect x="0" y="0" width="100%" height="100%" fill={`url(#selectedGrad-${safeId})`} />
                </Svg>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
           ) : (
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E5E5' }} />
           )}
        </Animated.View>

        <Animated.View style={textStyle}>
           <Text style={{ fontFamily: 'HostGrotesk_400Regular', fontSize: 16, color: '#1A1A1A' }} numberOfLines={1} ellipsizeMode="tail">
              {text}
           </Text>
        </Animated.View>

      </TouchableOpacity>
      
      {!isLast ? <View style={styles.itemDivider} /> : null}
    </Animated.View>
  );
}

/** FAB uzun bas → bugüne daha önce kullanılmış sinyal metinlerinden seç. */
function AddExistingSignalSheet({ visible, onClose, allTasks, currentDayCount, onAdd }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 24, stiffness: 240, mass: 0.8 });
      backdropOpacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
      backdropOpacity.value = withTiming(0, { duration: 250 });
      setTimeout(() => { setIsSelectionMode(false); setSelectedSignals([]); setSearchQuery(''); }, 300);
    }
  }, [visible]);

  const uniqueSignals = useMemo(() => { return Array.from(new Set(allTasks.map((t: TaskItem) => t.text))).sort((a: any, b: any) => a.localeCompare(b)); }, [allTasks]);
  const filteredSignals = useMemo(() => { return uniqueSignals.filter((s: any) => s.toLowerCase().includes(searchQuery.toLowerCase())); }, [uniqueSignals, searchQuery]);
  const maxSelectable = Math.max(0, 3 - currentDayCount);

  const toggleSelection = (text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedSignals.includes(text)) setSelectedSignals(prev => prev.filter(s => s !== text));
    else if (selectedSignals.length < maxSelectable) setSelectedSignals(prev => [...prev, text]);
  };

  const backdropAnimStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetAnimStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <Animated.View style={[styles.sheetOverlay, { pointerEvents: visible ? 'auto' : 'none' }]}>
      <Animated.View style={[styles.sheetBackdrop, backdropAnimStyle]}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /></Animated.View>
      <Animated.View style={[styles.halfSheetContainer, sheetAnimStyle, { backgroundColor: BACKGROUND_ALT }]}>
        <View style={styles.sheetHeader}>
          {isSelectionMode ? (<TouchableOpacity onPress={() => { if (selectedSignals.length > 0) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onAdd(selectedSignals); onClose(); } }} disabled={selectedSignals.length === 0}><Text style={[styles.sheetHeaderBtnText, selectedSignals.length === 0 ? { opacity: 0.4 } : null]}>Use</Text></TouchableOpacity>) : (<TouchableOpacity onPress={onClose}><Text style={styles.sheetHeaderBtnText}>Close</Text></TouchableOpacity>)}
          <Text style={[styles.sheetTitle, { color: Colors.primary }]}>Add an Existing Signal</Text>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); if (isSelectionMode) { setIsSelectionMode(false); setSelectedSignals([]); } else { setIsSelectionMode(true); } }}><Text style={styles.sheetHeaderBtnText}>{isSelectionMode ? 'Cancel' : 'Select'}</Text></TouchableOpacity>
        </View>
        <View style={[styles.searchContainerSheet, { marginHorizontal: 16 }]}><Ionicons name="search" size={20} color="#999" /><TextInput style={styles.searchInput} placeholder="Search existing signals..." placeholderTextColor="#999" value={searchQuery} onChangeText={setSearchQuery} blurOnSubmit={true} onSubmitEditing={() => Keyboard.dismiss()} /></View>
        
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
          
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden' }}>
             {filteredSignals.map((text: any, index: number) => {
               const isSelected = selectedSignals.includes(text); 
               const isLimitReached = selectedSignals.length >= maxSelectable; 
               const isDisabled = isSelectionMode && isLimitReached && !isSelected;
               const isLast = index === filteredSignals.length - 1; 
               
               return (
                 <ExistingSignalRowSheet 
                    key={text} 
                    text={text} 
                    isSelectionMode={isSelectionMode} 
                    isSelected={isSelected} 
                    isDisabled={isDisabled} 
                    isLast={isLast} 
                    onPress={() => { if (isSelectionMode) { toggleSelection(text); } else { if (maxSelectable > 0) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onAdd([text]); onClose(); } } }} 
                 />
               );
             })}
          </View>

        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

/** Signals yıllık karttan aya tıklanınca tam ekran ay özeti. */
function MonthlyDetailOverlay({ visible, onClose, year, monthIndex, tasks, onOpenDetail }: any) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible) {
       translateY.value = withSpring(0, { damping: 26, stiffness: 260, mass: 1 });
    } else {
       translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
       setTimeout(() => setSearchQuery(''), 300);
    }
  }, [visible]);

  const groupedTasks = useMemo(() => {
    const filteredTasks = tasks.filter((t: TaskItem) => 
       t.text.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sorted = [...filteredTasks].sort((a: TaskItem, b: TaskItem) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const groups: { date: string, tasks: TaskItem[] }[] = [];
    sorted.forEach((t: TaskItem) => { 
       const last = groups[groups.length - 1]; 
       if (last && last.date === t.date) last.tasks.push(t); 
       else groups.push({ date: t.date, tasks: [t] }); 
    });
    return groups;
  }, [tasks, searchQuery]);

  const overlayAnimStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: BACKGROUND_ALT, zIndex: 1000 }, overlayAnimStyle]}>
      <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? 40 : 0 }}>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, marginBottom: 16 }}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', width: 90 }} onPress={() => { Keyboard.dismiss(); onClose(); }}>
            <Ionicons name="chevron-back" size={20} color="#1A1A1A" />
            <Text style={{ fontFamily: 'HostGrotesk_500Medium', fontSize: 16, color: '#1A1A1A', marginLeft: 4, fontWeight: 'bold' }}>Archive</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'HostGrotesk_700Bold', fontSize: 16, color: '#1A1A1A' }}>{year.toString()}</Text>
            <Text style={{ fontFamily: 'HostGrotesk_400Regular', fontSize: 13, color: '#8E8E93', marginTop: 2 }}>{MONTH_NAMES[monthIndex]}</Text>
          </View>
          <View style={{ width: 90 }} />
        </View>

        <View style={[styles.searchContainerSheet, { marginHorizontal: 16, marginBottom: 24 }]}>
           <Ionicons name="search" size={20} color="#999" />
           <TextInput 
              style={styles.searchInput} 
              placeholder="Search signals..." 
              placeholderTextColor="#999" 
              value={searchQuery} 
              onChangeText={setSearchQuery} 
              blurOnSubmit={true} 
              onSubmitEditing={() => Keyboard.dismiss()} 
           />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
          {groupedTasks.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#999', marginTop: 40, fontFamily: 'HostGrotesk_400Regular' }}>
               {searchQuery.length > 0 ? "No matching signals found." : "No signals found for this month."}
            </Text>
          ) : (
            groupedTasks.map(group => (
              <View key={group.date} style={{ marginBottom: 24 }}>
                <Text style={[styles.dateGroupHeader, { color: '#A1A1A6', fontSize: 13 }]}>{getGroupDateDisplay(group.date)}</Text>
                
                <View style={{ marginHorizontal: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 }, android: { elevation: 1 } }) }}>
                  {group.tasks.map((task: TaskItem, index: number) => (
                    <TrackLargeItemRow 
                      key={task.id} 
                      item={task} 
                      isFirst={index === 0}
                      isLast={index === group.tasks.length - 1} 
                      onOpenDetail={onOpenDetail} 
                    />
                  ))}
                </View>

              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

// =====================================================================
// 9. ANA EKRANLAR — Signals (yıllık) + Track (haftalık arşiv)
// =====================================================================

/** Alt sekme “Signals”: yıllara göre gruplu liste + ay detay overlay. */
function YearSignalsScreen({ allTasks, onOpenDetail }: { allTasks: TaskItem[], onOpenDetail: (task: TaskItem) => void }) {
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState({ year: '', monthIndex: 0, tasks: [] as TaskItem[] });
  
  const groupedByYear = useMemo(() => {
    const groups: Record<string, TaskItem[]> = {};
    allTasks.forEach((task: TaskItem) => {
      const yearStr = task.date.split('-')[0];
      if (!groups[yearStr]) groups[yearStr] = [];
      groups[yearStr].push(task);
    });
    
    const currentYear = new Date().getFullYear().toString();
    if (Object.keys(groups).length === 0) groups[currentYear] = [];
    return Object.keys(groups).sort((a, b) => parseInt(b) - parseInt(a)).map(year => ({ year, tasks: groups[year] }));
  }, [allTasks]);

  const handleOpenMonthDetail = (year: string, monthIndex: number, tasks: TaskItem[]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDetailData({ year, monthIndex, tasks });
    setDetailVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={{ alignItems: 'center', paddingTop: 19, paddingBottom: 28 }}>
         <Text style={{ fontFamily: 'HostGrotesk_500Medium', fontSize: 18, color: '#1A1A1A' }}>Signals</Text>
      </View>

      <View style={[styles.header, { paddingTop: 16 }]}>
        <View style={styles.pageHeader}><Text style={[styles.title, {fontSize : 24}]}>Yearly Signals</Text></View>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 150, paddingTop: 12 }} showsVerticalScrollIndicator={false}>
        {groupedByYear.map(group => (
          <YearCard key={group.year} year={group.year} tasksForYear={group.tasks} onOpenMonthDetail={handleOpenMonthDetail} />
        ))}
      </ScrollView>

      <MonthlyDetailOverlay visible={detailVisible} onClose={() => setDetailVisible(false)} year={detailData.year} monthIndex={detailData.monthIndex} tasks={detailData.tasks} onOpenDetail={onOpenDetail} />
    </SafeAreaView>
  );
}

/** Alt sekme “Track”: haftalık takvim şeridi + seçilen günün sinyalleri + ActivityGrid. */
function MainArchiveScreen({ allTasks, onOpenDetail }: { allTasks: TaskItem[], onOpenDetail: (task: TaskItem, readOnly?: boolean) => void }) {
  
  const [baseDate, setBaseDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1); 
    return d;
  });

  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(getLocalIsoDate(0, baseDate));

  const executeWeekChange = (dir: number) => { 
      const newDate = new Date(baseDate);
      newDate.setDate(newDate.getDate() + dir * 7);
      setBaseDate(newDate);
  };

  const activeWeek = useMemo(() => {
    const current = new Date(baseDate);
    const dayOfWeek = current.getDay();
    const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));
    
    const week = [];
    for (let i = 0; i < 7; i++) {
       const temp = new Date(monday);
       temp.setDate(monday.getDate() + i);
       week.push(temp);
    }
    return week;
  }, [baseDate]);

  const displayMonthYear = activeWeek[3].toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const handleDayPress = (date: Date) => { const iso = getLocalIsoDate(0, date); setSelectedDateIso(iso); };

  const selectedTasks = selectedDateIso ? allTasks.filter((t: TaskItem) => t.date === selectedDateIso) : [];
  const totalStatus = selectedTasks.reduce((sum: number, task: TaskItem) => sum + (task.status === -1 ? 0 : task.status), 0);
  const srValue = selectedTasks.length === 0 ? 0 : Math.round((totalStatus / selectedTasks.length) * 100);
  
  let selectedDateObj: Date | null = null; 
  if (selectedDateIso) { 
      const parts = selectedDateIso.split('-'); 
      selectedDateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)); 
  }

  const formattedFullDate = selectedDateObj ? selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '';

  return (
    <View style={{ flex: 1, backgroundColor: BACKGROUND_ALT }}>
      <View style={styles.trackHeaderContainer}>
        
        <View style={styles.trackMonthRow}>
           <TouchableOpacity onPress={() => executeWeekChange(-1)} hitSlop={{top:10, bottom:10, left:10, right:10}}>
              <Ionicons name="chevron-back" size={20} color="#999" style={{marginTop: 14}} />
           </TouchableOpacity>
           <Text style={styles.trackMonthText}>{displayMonthYear}</Text>
           <TouchableOpacity onPress={() => executeWeekChange(1)} hitSlop={{top:10, bottom:10, left:10, right:10}}>
              <Ionicons name="chevron-forward" size={20} color="#999" style={{marginTop: 14}} />
           </TouchableOpacity>
        </View>

        <View style={styles.trackDaysHeaderRow}>
           {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (<Text key={i.toString()} style={styles.trackDayLabel}>{d}</Text>))}
        </View>
        <View style={styles.trackWeekRow}>
           {activeWeek.map((dayObj: any, dIndex: number) => {
              if (!dayObj) return <View key={`empty-${dIndex}`} style={styles.trackDayCell} />;
              const cellIso = getLocalIsoDate(0, dayObj); 
              const isSelected = cellIso === selectedDateIso; 
              const isToday = cellIso === getLocalIsoDate(0); 

              const isYesterday = cellIso === getLocalIsoDate(-1);
              const isTomorrow = cellIso === getLocalIsoDate(1);
              const isGrayDay = !isSelected && !isToday && !isYesterday && !isTomorrow; 
              
              return (
                 <TouchableOpacity 
                    key={dIndex.toString()} 
                    style={[styles.trackDayCell, isSelected && !isToday ? styles.trackDayCellSelected : null, isToday ? styles.trackDayCellToday : null, { overflow: 'hidden', position: 'relative' }]}
                    onPress={() => handleDayPress(dayObj)}
                 >
                    {isToday ? (
                      <View style={StyleSheet.absoluteFill}>
                        <Svg height="100%" width="100%">
                          <Defs>
                            <RadialGradient id={`todayGradient-v3-${dIndex}`} cx="70%" cy="70%" rx="100%" ry="100%" fx="100%" fy="100%">
                              <Stop offset="5%" stopColor="rgb(195, 191, 201)" stopOpacity="1" />
                              <Stop offset="100%" stopColor="rgba(0, 0, 0, 1)" stopOpacity="0.8" />
                            </RadialGradient>
                          </Defs>
                          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#todayGradient-v3-${dIndex})`} />
                        </Svg>
                      </View>
                    ) : null}

                    {isSelected && !isToday ? (
                      <View style={StyleSheet.absoluteFill}>
                        <Svg height="100%" width="100%">
                          <Defs>
                            <RadialGradient id={`selectedGradient-v3-${dIndex}`} cx="0%" cy="0%" rx="60%" ry="60%" fx="0%" fy="0%">
                              <Stop offset="0%" stopColor="rgba(242, 241, 246, 1)" stopOpacity="1" />
                              <Stop offset="100%" stopColor="#d1d1d6" stopOpacity="1" />
                            </RadialGradient>
                          </Defs>
                          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#selectedGradient-v3-${dIndex})`} />
                        </Svg>
                      </View>
                    ) : null}

                    <Text style={[
                        styles.trackDayText, 
                        isToday ? styles.trackDayTextToday : null, 
                        isGrayDay ? { color: 'rgba(37, 36, 34, 0.4)' } : null,
                        { zIndex: 1 }
                    ]}> 
                      {dayObj.getDate().toString()}
                    </Text>
                 </TouchableOpacity>
              );
           })}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.trackContentContainer}>
        {selectedDateIso && selectedDateObj ? (
          <>
            <Text style={styles.trackDateTitle}>{formattedFullDate}</Text>
            
            {selectedTasks.length > 0 ? (
               <>
                 <AnimatedProgressSection srValue={srValue} totalStatus={totalStatus} length={selectedTasks.length} />
                 
                 <View style={{ marginBottom: 32, marginTop: 8 }}>
                    {selectedTasks.map((item: TaskItem, index: number) => (
                       <TrackLargeItemRow 
                          key={item.id} 
                          item={item} 
                          onOpenDetail={onOpenDetail} 
                          isFirst={index === 0}
                          isLast={index === selectedTasks.length - 1} 
                        />
                    ))}
                 </View>
               </>
            ) : (
               <Text style={{ textAlign: 'center', color: '#999', marginTop: 20, marginBottom: 40, fontFamily: 'HostGrotesk_400Regular' }}>No signals found for this date.</Text>
            )}

            <Text style={styles.activityTitle}>Activity</Text>
            <ActivityGrid baseDate={baseDate} allTasks={allTasks} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

// =====================================================================
// 10. SÜRÜKLE-SIRALA — özel liste (DraggableFlatList yerine Reanimated + Gesture)
// =====================================================================

const SORT_H = 52;

/**
 * Bir günün `tasks` listesini mutlak konumlu satırlar olarak çizer.
 * Ortak `dragFrom` / `dragTo` / `dragDy` ile hangi satırın sürüklendiğini koordine eder.
 */
function SortableList({ tasks, onReorder, isEditMode, isAddingTask, actualDelete, onSwipeStart, rowRefs, onOpenDetail }: any) {
  const setIsEditMode = React.useContext(EditModeSetterContext);
  const n = tasks.length;
  const dragFrom = useSharedValue(-1);
  const dragTo   = useSharedValue(-1);
  const dragDy   = useSharedValue(0);

  // Stable refs so the memoized gesture always sees fresh data
  const tasksRef    = useRef<TaskItem[]>(tasks);
  tasksRef.current  = tasks;
  const reorderRef  = useRef(onReorder);
  reorderRef.current = onReorder;

  // Reset drag state after tasks update (triggered by reorder → setAllTasks → re-render)
  const prevTasksKey = useRef(tasks.map((t: TaskItem) => t.id).join(','));
  useEffect(() => {
    const key = tasks.map((t: TaskItem) => t.id).join(',');
    if (prevTasksKey.current !== key) {
      prevTasksKey.current = key;
      dragFrom.value = -1;
      dragTo.value   = -1;
      dragDy.value   = 0;
    }
  }, [tasks]);

  const onDragStart = React.useCallback(() => {
    setIsEditMode(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const onDragEnd = React.useCallback((from: number, to: number) => {
    if (from >= 0 && to >= 0 && from !== to) {
      const next = [...tasksRef.current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      reorderRef.current(next);
    }
    setIsEditMode(true);
  }, []);

  return (
    <View style={{ position: 'relative', height: n * SORT_H }}>
      {tasks.map((task: TaskItem, idx: number) => (
        <SortableTaskItem
          key={task.id}
          item={task}
          index={idx}
          n={n}
          dragFrom={dragFrom}
          dragTo={dragTo}
          dragDy={dragDy}
          isEditMode={isEditMode}
          isAddingTask={isAddingTask}
          isFirst={idx === 0}
          isLast={idx === n - 1}
          swiperRef={(el: any) => rowRefs.current.set(task.id, el)}
          onSwipeStart={onSwipeStart}
          actualDelete={actualDelete}
          onOpenDetail={onOpenDetail}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ))}
    </View>
  );
}

/**
 * Tek sinyal satırı: swipe sil, uzun basınca sürükle, düzenleme modunda sıra ikonu.
 * `posStyle` ile aktif satır parmağı takip eder; diğerleri `dragTo`’ya göre kayar.
 */
function SortableTaskItem({ item, index, n, dragFrom, dragTo, dragDy, isEditMode, isAddingTask, isFirst, isLast, swiperRef, onSwipeStart, actualDelete, onOpenDetail, onDragStart, onDragEnd }: any) {
  const setIsEditMode = React.useContext(EditModeSetterContext);
  const [isSwiped, setIsSwiped] = useState(false);
  const heightMul = useSharedValue(1);
  const translateX = useSharedValue(0);
  const topR    = useSharedValue(isFirst ? 18 : 0);
  const bottomR = useSharedValue(isLast  ? 18 : 0);

  // itemY tracks the natural (non-drag) vertical position of this item.
  // Animated only when index decreases due to deletion (slides up smoothly).
  const itemY        = useSharedValue(index * SORT_H);
  const prevIndexRef = useRef(index);
  useEffect(() => {
    const prev = prevIndexRef.current;
    prevIndexRef.current = index;
    if (index < prev && dragFrom.value < 0) {
      // Index decreased with no active drag → item above was deleted, slide up
      itemY.value = withTiming(index * SORT_H, { duration: 200 });
    } else {
      itemY.value = index * SORT_H; // instant for add / drag-reorder
    }
  }, [index]);

  useEffect(() => {
    const allRound = isEditMode || isSwiped;
    topR.value    = withTiming(allRound ? 18 : (isFirst ? 18 : 0), { duration: 300 });
    bottomR.value = withTiming(allRound ? 18 : (isLast  ? 18 : 0), { duration: 300 });
  }, [isEditMode, isFirst, isLast, isSwiped]);

  const gesture = useMemo(() =>
    Gesture.Pan()
      .activateAfterLongPress(isEditMode ? 1 : 150)
      .failOffsetX([-20, 20])
      .onStart(() => {
        dragFrom.value = index;
        dragTo.value   = index;
        dragDy.value   = 0;
        runOnJS(onDragStart)();
      })
      .onUpdate((e) => {
        const minY = -index * SORT_H;
        const maxY = (n - 1 - index) * SORT_H;
        dragDy.value = Math.max(minY, Math.min(maxY, e.translationY));
        // Hysteresis: require 60% into next slot to swap (prevents boundary oscillation)
        const draggingY = index * SORT_H + dragDy.value;
        const cur = dragTo.value;
        if (draggingY > (cur + 0.6) * SORT_H && cur < n - 1) {
          dragTo.value = cur + 1;
        } else if (draggingY < (cur - 0.6) * SORT_H && cur > 0) {
          dragTo.value = cur - 1;
        }
      })
      .onEnd(() => {
        const from = dragFrom.value;
        const to   = dragTo.value;
        // Only reset dy — keep from/to until React re-renders with new task order
        dragDy.value = 0;
        runOnJS(onDragEnd)(from, to);
      })
      .onFinalize(() => {
        // Only fires for cancellation (dragDy still nonzero = not a normal onEnd)
        if (dragFrom.value === index && dragDy.value !== 0) {
          dragFrom.value = -1;
          dragTo.value   = -1;
          dragDy.value   = 0;
        }
      }),
    [index, n, isEditMode]
  );

  const posStyle = useAnimatedStyle(() => {
    const from     = dragFrom.value;
    const to       = dragTo.value;
    const isActive = from === index;

    if (isActive) {
      // While dragging: follow finger. After release (dragDy=0): sit at final slot
      // until React re-renders with the new task order.
      const top = dragDy.value !== 0
        ? index * SORT_H + dragDy.value
        : to * SORT_H;
      return {
        position: 'absolute', left: 16, right: 16,
        top,
        zIndex: 100,
        shadowColor: '#000', shadowOpacity: 0.12,
        shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      };
    }

    let targetY = index * SORT_H;
    if (from >= 0) {
      if (from < to && index > from && index <= to) targetY = (index - 1) * SORT_H;
      else if (from > to && index >= to && index < from) targetY = (index + 1) * SORT_H;
    }

    return {
      position: 'absolute', left: 16, right: 16,
      // During drag: smooth swap animation.
      // Otherwise: use itemY which handles deletion slide-up via its own withTiming.
      top: from >= 0 ? withTiming(targetY, { duration: 180 }) : itemY.value,
      zIndex: 1, shadowOpacity: 0, elevation: 0,
    };
  });

  const handleDelete = () => {
    translateX.value = withTiming(-SCREEN_WIDTH, { duration: 250 }, () => {
      heightMul.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(actualDelete)(item.id);
          runOnJS(setIsEditMode)(false);
        }
      });
    });
  };

  const deleteContainerStyle = useAnimatedStyle(() => ({
    height: heightMul.value < 1 ? SORT_H * heightMul.value : undefined,
    overflow: heightMul.value < 1 ? 'hidden' : 'visible',
  }));

  const bgStyle = useAnimatedStyle(() => {
    const isActive = dragFrom.value === index;
    return {
      backgroundColor: withTiming(isActive ? '#FDFDFD' : '#FFFFFF', { duration: 200 }),
      transform: [
        { translateX: translateX.value },
        { scale: withTiming(isActive ? 1.03 : 1, { duration: 150 }) },
      ],
      opacity: withTiming(isAddingTask && !isActive ? 0.3 : 1, { duration: 200 }),
      borderTopLeftRadius:    topR.value,
      borderTopRightRadius:   topR.value,
      borderBottomLeftRadius:  bottomR.value,
      borderBottomRightRadius: bottomR.value,
    };
  });

  const renderRightActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0.4], extrapolate: 'clamp' });
    const actionOpacity = dragX.interpolate({ inputRange: [-80, -20, 0], outputRange: [1, 0, 0], extrapolate: 'clamp' });
    return (
      <Animated.View style={styles.rightActionContainer}>
        <RNAnimated.View style={{ transform: [{ scale }], opacity: actionOpacity, alignItems: 'center' }}>
          <TouchableOpacity style={styles.deleteCircleButton} onPress={handleDelete} activeOpacity={0.7}>
            <Ionicons name="trash" size={16} color="white" />
          </TouchableOpacity>
          <RNAnimated.Text style={[styles.deleteActionText, { opacity: actionOpacity }]}>Sil</RNAnimated.Text>
        </RNAnimated.View>
      </Animated.View>
    );
  };

  return (
    <Animated.View style={posStyle}>
      <Animated.View style={deleteContainerStyle}>
        <GestureDetector gesture={gesture}>
          <Swipeable
            ref={swiperRef}
            onSwipeableWillOpen={() => { runOnJS(onSwipeStart)(item.id); setIsSwiped(true); }}
            onSwipeableWillClose={() => setIsSwiped(false)}
            renderRightActions={renderRightActions}
            friction={1.5} overshootFriction={8}
            enabled={!isEditMode && !isAddingTask}
            containerStyle={{ overflow: 'visible' }}
          >
            <Animated.View style={bgStyle}>
              <TouchableOpacity
                onPress={() => { if (!isEditMode && !isAddingTask) onOpenDetail(item, false); }}
                activeOpacity={0.7}
                style={{ width: '100%' }}
              >
                <View style={styles.taskWrapper}>
                  <View style={styles.headerContent}>
                    <View style={styles.leftContent}>
                      <Text style={styles.taskText} numberOfLines={1} ellipsizeMode="tail">{item.text}</Text>
                    </View>
                    <View style={styles.rightContent}>
                      {!isEditMode
                        ? <Text style={[styles.statusLabel, item.status === 1 ? { color: '#EAB308' } : null]}>{getStatusText(item.status)}</Text>
                        : <Ionicons name="reorder-two-outline" size={24} color={Colors.secondaryText} />
                      }
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
              {!isLast && !isSwiped && !isEditMode ? <View style={styles.itemDivider} /> : null}
            </Animated.View>
          </Swipeable>
        </GestureDetector>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Flow sekmesinin gövdesi: yatay FlatList ile Dün / Bugün / Yarın sayfaları.
 * Her sayfada o güne ait `SortableList`, üstte progress ve gün başlığı.
 */
const FlowHomeScreen = React.memo(function FlowHomeScreen({ allTasks, setAllTasks, isAddingGlobal, setIsAddingGlobal, currentDayOffset, setCurrentDayOffset, homeScrollX, onOpenDetail }: any) {
  const [taskText, setTaskText] = useState('');
  const isEditMode = React.useContext(EditModeContext);
  const setIsEditMode = React.useContext(EditModeSetterContext);
  
  const rowRefs = useRef<Map<string, any>>(new Map());

  const dotsOpacitySV = useSharedValue(1);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWakeTime = useRef(0);

  const wakeUpDots = () => {
    const now = Date.now();
    if (now - lastWakeTime.current > 100) { 
      lastWakeTime.current = now;
      dotsOpacitySV.value = withTiming(1, { duration: 150 });
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => { dotsOpacitySV.value = withTiming(0.35, { duration: 800 }); }, 1500) as any;
    }
  };

  useEffect(() => { wakeUpDots(); return () => { if (idleTimer.current) clearTimeout(idleTimer.current); }; }, []);
  
  const flatListRef = useRef<any>(null);
  const lastHapticIndex = useSharedValue(1);
  const onScroll = useAnimatedScrollHandler((event: any) => {
    homeScrollX.value = event.contentOffset.x;
    runOnJS(wakeUpDots)();
    const activeIndex = Math.round(event.contentOffset.x / SCREEN_WIDTH);
    if (activeIndex !== lastHapticIndex.value) {
      lastHapticIndex.value = activeIndex;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    }
  });

  const closeAllSwipeables = () => {
    rowRefs.current.forEach((ref) => {
      if (ref) ref.close();
    });
  };

  const handlePageChange = (index: number) => {
    const daysData = [-1, 0, 1]; const newOffset = daysData[index];
    setCurrentDayOffset(newOffset);
    setIsAddingGlobal(false); 
    setIsEditMode(false); Keyboard.dismiss();
    closeAllSwipeables();
  };

  useEffect(() => { setTimeout(() => { homeScrollX.value = SCREEN_WIDTH; flatListRef.current?.scrollToIndex({ index: 1, animated: false }); }, 50); }, []);
  useEffect(() => { const listener = Keyboard.addListener('keyboardDidHide', () => { if (taskText.trim() === '') { setIsAddingGlobal(false); } }); return () => listener.remove(); }, [taskText]);
  
  useEffect(() => { 
     if (isAddingGlobal) {
        setIsEditMode(false); 
        closeAllSwipeables();
     }
  }, [isAddingGlobal]);

  const { createSignal: apiCreate, deleteSignal: apiDelete, reorderSignals: apiReorder } = React.useContext(ApiContext);

  const handleSubmitTask = () => {
    const textToSave = taskText.trim();
    if (textToSave.length > 0) {
      const tempId  = 'tmp_' + Date.now().toString() + Math.random().toString(36).substr(2, 5);
      const dateStr = getLocalIsoDate(currentDayOffset);
      const newTask: TaskItem = { id: tempId, text: textToSave, note: '', status: -1, date: dateStr };
      // Optimistik ekleme
      setAllTasks((prev: TaskItem[]) => [newTask, ...prev]);
      // API çağrısı — gerçek ID ile temp ID'yi değiştir
      apiCreate({ text: textToSave, note: '', status: -1, date: dateStr })
        .then((created: any) => {
          if (created?.id) {
            setAllTasks((prev: TaskItem[]) =>
              prev.map(t => t.id === tempId ? created as TaskItem : t)
            );
          }
        })
        .catch((err: unknown) => {
          console.warn('Sinyal oluşturma hatası:', err);
          setAllTasks((prev: TaskItem[]) => prev.filter(t => t.id !== tempId));
        });
    }
    setTaskText('');
    setIsAddingGlobal(false);
    Keyboard.dismiss();
  };

  const deleteTaskFromState = (id: string) => {
    setAllTasks((prev: TaskItem[]) => prev.filter((t: TaskItem) => t.id !== id));
    apiDelete(id).catch(err => console.warn('Silme hatası:', err));
  };
  
  const onSwipeStart = (openedId: string) => { rowRefs.current.forEach((ref, id) => { if (id !== openedId && ref) ref.close(); }); };

  const renderDayPage = ({ item: dayOffset }: { item: number }) => {
    const pageDateIso = getLocalIsoDate(dayOffset);
    const dayTasks = allTasks.filter((t: TaskItem) => t.date === pageDateIso);
    const totalStatus = dayTasks.reduce((sum: number, t: TaskItem) => sum + (t.status === -1 ? 0 : t.status), 0);
    const srValue = dayTasks.length === 0 ? 0 : Math.round((totalStatus / dayTasks.length) * 100);
    const dayTitle = dayOffset === 0 ? 'Today' : dayOffset === -1 ? 'Yesterday' : 'Tomorrow';
    const isAddingThisDay = isAddingGlobal && currentDayOffset === dayOffset;

    const getDynamicStyles = () => {
      if (dayOffset === -1) return { container: { alignItems: 'flex-start' as const }, text: { textAlign: 'left' as const }, dateColors: ['rgba(219, 217, 223, 0.9)', 'rgba(37, 36, 34, 0.8)'] };
      else if (dayOffset === 1) return { container: { alignItems: 'flex-end' as const }, text: { textAlign: 'right' as const }, dateColors: ['rgba(37, 36, 34, 0.8)', 'rgba(219, 217, 223, 0.9)'] };
      return { container: { alignItems: 'center' as const }, text: { textAlign: 'center' as const }, dateColors: ['rgba(37, 36, 34, 0.8)', 'rgba(37, 36, 34, 0.4)', 'rgba(37, 36, 34, 0.8)'] };
    };
    const { container: alignmentContainer, text: alignmentText, dateColors } = getDynamicStyles();

    return (
      <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
        <View style={[styles.pageHeader, alignmentContainer]}>
          <Text style={[styles.title, alignmentText]}>{dayTitle}</Text>
          <GradientText text={getFormattedDateDisplay(dayOffset)} style={styles.date} alignmentText={alignmentText} colors={dateColors} />
          <AnimatedProgressSection srValue={srValue} totalStatus={totalStatus} length={dayTasks.length} />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 150, paddingTop: 16 }}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!isEditMode}
          onScrollBeginDrag={closeAllSwipeables}
          showsVerticalScrollIndicator={false}
        >
          <InputHeader isAddingThisDay={isAddingThisDay} taskText={taskText} setTaskText={setTaskText} handleSubmitTask={handleSubmitTask} hasItems={dayTasks.length > 0} />
          <EmptyState
            isVisible={dayTasks.length === 0 && (!isAddingGlobal || currentDayOffset !== dayOffset)}
            onAddTrigger={() => setIsAddingGlobal(true)}
          />
          <SortableList
            tasks={dayTasks}
            onReorder={(newDayTasks: TaskItem[]) => {
              const others = allTasks.filter((t: TaskItem) => t.date !== pageDateIso);
              setAllTasks([...others, ...newDayTasks]);
              // Sıralamayı API'ye yaz (fire-and-forget)
              apiReorder(newDayTasks.map((t: TaskItem) => t.id))
                .catch(err => console.warn('Sıralama hatası:', err));
            }}
            isEditMode={isEditMode}
            isAddingTask={isAddingThisDay}
            actualDelete={deleteTaskFromState}
            onSwipeStart={onSwipeStart}
            rowRefs={rowRefs}
            onOpenDetail={(t: TaskItem, readOnly: boolean) => { closeAllSwipeables(); onOpenDetail(t, readOnly); }}
          />
        </ScrollView>
      </View>
    );
  };

  return (
    <Pressable style={{ flex: 1 }} onPress={() => { setIsEditMode(false); Keyboard.dismiss(); closeAllSwipeables(); }}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <View style={styles.dotsContainer}>{[-1, 0, 1].map((_, i) => (<AnimatedDot key={i.toString()} index={i} scrollX={homeScrollX} dotsOpacitySV={dotsOpacitySV} />))}</View>
        </View>
        <Animated.FlatList
          ref={flatListRef} data={[-1, 0, 1]} renderItem={renderDayPage} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          keyExtractor={(item: number) => item.toString()} onScroll={onScroll} scrollEventThrottle={16}
          onMomentumScrollEnd={(e: any) => { const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH); handlePageChange(index); }}
          getItemLayout={(_: any, index: number) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })} initialScrollIndex={1}
        />
      </SafeAreaView>
    </Pressable>
  );
});

/**
 * Uygulama kökü: font + splash, onboarding bayrağı, Supabase anon oturum,
 * görev listesi state’i, üç yatay ekran (Flow / Track / Signals), alt nav, sheet’ler.
 */
export default function App() {
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [currentScreen, setCurrentScreen] = useState<number>(TAB_FLOW);
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [isAddingGlobal, setIsAddingGlobal] = useState(false);
  const [currentDayOffset, setCurrentDayOffset] = useState(0);

  // ── Auth state ─────────────────────────────────────────────────────────────
  const [session,        setSession]        = useState<any>(null);
  const [isLoadingAuth,  setIsLoadingAuth]  = useState(true);

  // ── Onboarding: sadece ilk kurulumda göster (AsyncStorage) ─────────────────
  const [onboardingChecked, setOnboardingChecked]     = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  
  const [isSheetVisible, setIsSheetVisible] = useState(false); 
  const [signalSheetVisible, setSignalSheetVisible] = useState(false); 
  const [selectedSignal, setSelectedSignal] = useState<TaskItem | null>(null);
  const [isSignalSheetReadOnly, setIsSignalSheetReadOnly] = useState(false); 

  const [fontsLoaded] = useFonts({ HostGrotesk_400Regular, HostGrotesk_500Medium, HostGrotesk_700Bold });
  
  const homeScrollX = useSharedValue(SCREEN_WIDTH);
  const screensTranslateX = useSharedValue(0);

  const screensStyle = useAnimatedStyle(() => ({
    flexDirection: 'row',
    width: SCREEN_WIDTH * 3,
    flex: 1,
    transform: [{ translateX: screensTranslateX.value }]
  }));

  useEffect(() => {
    screensTranslateX.value = withTiming(-currentScreen * SCREEN_WIDTH, { duration: 300 });
  }, [currentScreen]);

  useEffect(() => {
    getOnboardingComplete().then((done) => {
      const forceOnboarding =
        __DEV__ ||
        (typeof process.env.EXPO_PUBLIC_FORCE_ONBOARDING === 'string' &&
          process.env.EXPO_PUBLIC_FORCE_ONBOARDING.toLowerCase() === 'true');
      setHasCompletedOnboarding(forceOnboarding ? getOnboardingCompleteThisSession() : done);
      setOnboardingChecked(true);
    });
  }, []);

  // ── Supabase: kayıt yok — otomatik anonim oturum (veri yine kullanıcıya özel JWT ile gider)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session: existing } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (existing) {
        setSession(existing);
        setIsLoadingAuth(false);
        return;
      }
      const { data, error } = await supabase.auth.signInAnonymously();
      if (cancelled) return;
      if (error) {
        console.warn('Anonim oturum açılamadı:', error.message);
        setIsLoadingAuth(false);
        return;
      }
      setSession(data.session);
      setIsLoadingAuth(false);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ── Oturum açıldığında sinyalleri API'den yükle ───────────────────────────
  useEffect(() => {
    if (session) {
      api.getSignals()
        .then(tasks => setAllTasks(tasks as TaskItem[]))
        .catch(err  => console.warn('Sinyaller yüklenemedi:', err));
    } else if (!isLoadingAuth) {
      setAllTasks([]);
    }
  }, [session, isLoadingAuth]);

  const handleOpenSignalDetail = React.useCallback((task: TaskItem, readOnly = false) => {
    setSelectedSignal(task);
    setIsSignalSheetReadOnly(readOnly); 
    setSignalSheetVisible(true);
  }, []);

  useEffect(() => { if (fontsLoaded) SplashScreen.hideAsync(); }, [fontsLoaded]);

  if (!fontsLoaded || isLoadingAuth || !onboardingChecked) return null;

  if (!hasCompletedOnboarding) return <Redirect href="/onboarding" />;

  // Oturum yoksa (anonim açılamadıysa) uygulama açılır; API çağrıları başarısız olabilir
  const tasksForCurrentDay = allTasks.filter((t: TaskItem) => t.date === getLocalIsoDate(currentDayOffset));
  const isFabDisabled = currentScreen === TAB_FLOW && tasksForCurrentDay.length >= 3;

  const handleUpdateTaskGlobally = (id: string, updates: Partial<TaskItem>) => {
    // Optimistik güncelleme
    setAllTasks((prev: TaskItem[]) => prev.map((t: TaskItem) => (t.id === id ? { ...t, ...updates } : t)));
    // API'ye yaz
    api.updateSignal(id, {
      text:   updates.text,
      note:   updates.note,
      status: updates.status,
    }).catch(err => console.warn('Güncelleme hatası:', err));
  };

  // ── ApiContext değerleri ────────────────────────────────────────────────────
  const apiContextValue: ApiContextType = {
    createSignal: async (task: Partial<TaskItem>) => {
      const created = await api.createSignal(task);
      return created as any;
    },
    deleteSignal: async (id: string) => {
      await api.deleteSignal(id);
    },
    updateSignal: async (id: string, updates: Partial<TaskItem>) => {
      await api.updateSignal(id, updates);
    },
    reorderSignals: async (orderedIds: string[]) => {
      await api.reorderSignals(orderedIds);
    },
  };

  // App düzeyinde API helper (AddExistingSignalSheet için)
  const apiCreate = apiContextValue.createSignal;

  return (
    <ApiContext.Provider value={apiContextValue}>
    <EditModeSetterContext.Provider value={setIsEditMode}>
    <EditModeContext.Provider value={isEditMode}>
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: BACKGROUND_ALT }}>
      
      <Animated.View style={screensStyle}>
         <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            <FlowHomeScreen allTasks={allTasks} setAllTasks={setAllTasks} isAddingGlobal={isAddingGlobal} setIsAddingGlobal={setIsAddingGlobal} currentDayOffset={currentDayOffset} setCurrentDayOffset={setCurrentDayOffset} homeScrollX={homeScrollX} onOpenDetail={handleOpenSignalDetail} />
         </View>
         <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            <MainArchiveScreen allTasks={allTasks} onOpenDetail={handleOpenSignalDetail} />
         </View>
         <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            <YearSignalsScreen allTasks={allTasks} onOpenDetail={handleOpenSignalDetail} />
         </View>
      </Animated.View>

      <LiquidBottomNav 
        currentTab={currentScreen} 
        isFabDisabled={isFabDisabled} 
        onChangeTab={setCurrentScreen} 
        onAddTrigger={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); if (currentScreen !== TAB_FLOW) setCurrentScreen(TAB_FLOW); setIsAddingGlobal(true); }} 
        onSheetTrigger={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); if (currentScreen !== TAB_FLOW) setCurrentScreen(TAB_FLOW); setIsSheetVisible(true); }} 
        homeScrollX={homeScrollX}
      />
      
      <AddExistingSignalSheet
        visible={isSheetVisible}
        onClose={() => setIsSheetVisible(false)}
        allTasks={allTasks}
        currentDayCount={tasksForCurrentDay.length}
        onAdd={(signals: string[]) => {
          const dateStr = getLocalIsoDate(currentDayOffset);
          signals.forEach((text, i) => {
            const tempId = 'tmp_' + Date.now().toString() + i.toString();
            const tempTask: TaskItem = { id: tempId, text, note: '', status: -1, date: dateStr };
            setAllTasks((prev: TaskItem[]) => [...prev, tempTask]);
            apiCreate({ text, note: '', status: -1, date: dateStr })
              .then((created: any) => {
                if (created?.id) {
                  setAllTasks((prev: TaskItem[]) =>
                    prev.map(t => t.id === tempId ? created as TaskItem : t)
                  );
                }
              })
              .catch(() => setAllTasks((prev: TaskItem[]) => prev.filter(t => t.id !== tempId)));
          });
        }}
      />
      
      <SignalDetailSheet 
        visible={signalSheetVisible} 
        onClose={() => setSignalSheetVisible(false)} 
        task={selectedSignal} 
        isReadOnly={isSignalSheetReadOnly}
        onUpdateTask={(id: string, updates: any) => {
          handleUpdateTaskGlobally(id, updates);
          if (selectedSignal && selectedSignal.id === id) {
            setSelectedSignal({...selectedSignal, ...updates});
          }
        }} 
      />

    </GestureHandlerRootView>
    </EditModeContext.Provider>
    </EditModeSetterContext.Provider>
    </ApiContext.Provider>
  );
}