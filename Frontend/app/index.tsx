import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Animated as RNAnimated, StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, StatusBar, TextInput, Keyboard, LayoutAnimation, UIManager, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, SpaceGrotesk_500Medium, SpaceGrotesk_400Regular, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import Colors from '../src/constants/Colors';
import * as Haptics from 'expo-haptics';
import Animated, { 
  SharedValue, 
  useSharedValue, 
  useAnimatedScrollHandler, 
  useAnimatedStyle, 
  interpolate, 
  Extrapolation, 
  runOnJS,
  withTiming,
  LinearTransition
} from 'react-native-reanimated';
import IntroScreen from './IntroScreen'; 

SplashScreen.preventAutoHideAsync();

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const iOSLayoutAnimation = {
  duration: 400,
  create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  update: { type: LayoutAnimation.Types.spring, springDamping: 0.7 },
  delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const BACKGROUND_ALT = '#F2F1F6';

interface TaskItem {
  id: string;
  text: string;
  note: string;
  status: number;
  date: string; 
}

const getIsoDate = (offset: number = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset); 
  return d.toISOString().split('T')[0]; 
};

const getFormattedDateDisplay = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric', weekday: 'long' };
  return d.toLocaleDateString('en-US', options).replace(',', ' -');
};

const getStatusText = (status: number): string => {
  if (status === 0) return ''; 
  if (status === 0.25) return '%25';
  if (status === 0.5) return '%50';
  if (status === 0.75) return '%75';
  if (status === 1) return 'Done';
  return '';
};

const ProgressBarSegment = ({ fillAmount }: { fillAmount: number }) => {
  const widthVal = useSharedValue(0);

  useEffect(() => {
    widthVal.value = withTiming(fillAmount, { duration: 450 });
  }, [fillAmount]);

  const fillAnimStyle = useAnimatedStyle(() => {
    return {
      width: `${widthVal.value * 100}%`,
    };
  });

  return (
    <Animated.View style={styles.progressSegmentBg} layout={LinearTransition}>
      <Animated.View style={[styles.progressSegmentFill, fillAnimStyle]} />
    </Animated.View>
  );
};

const AnimatedDot = ({ index, scrollX }: { index: number, scrollX: SharedValue<number> }) => {
  const animatedDotStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
    const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP);
    const width = interpolate(scrollX.value, inputRange, [8, 16, 8], Extrapolation.CLAMP);
    return { opacity, width };
  });
  return <Animated.View style={[styles.dot, animatedDotStyle]} />;
};

const TaskItemRow = ({
  item, drag, isActive, expandedTaskId, isEditMode, isAddingTask,
  toggleExpand, updateTask, actualDelete, setIsEditMode
}: any) => {
  const isExpanded = expandedTaskId === item.id;
  
  const rowHeight = useSharedValue<number | undefined>(undefined);
  const marginB = useSharedValue(12); 
  const clipOverflow = useSharedValue(false); 
  const isDeletingSV = useSharedValue(false); 

  const taskTranslateX = useSharedValue(0); 
  const taskOpacity = useSharedValue(1);    
  const buttonOpacity = useSharedValue(1);  

  const EXPANDED_HEIGHT = 245; 
  const expandHeight = useSharedValue(isExpanded ? EXPANDED_HEIGHT : 0);
  const expandOpacity = useSharedValue(isExpanded ? 1 : 0);

  useEffect(() => {
    if (isExpanded) {
      expandHeight.value = withTiming(EXPANDED_HEIGHT, { duration: 350 });
      expandOpacity.value = withTiming(1, { duration: 300 });
    } else {
      expandHeight.value = withTiming(0, { duration: 250 });
      expandOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isExpanded]);

  const animatedExpandStyle = useAnimatedStyle(() => ({
    height: expandHeight.value,
    opacity: expandOpacity.value,
    overflow: 'hidden',
  }));

  const handleDelete = () => {
    if (isDeletingSV.value) return;
    isDeletingSV.value = true; 

    taskTranslateX.value = withTiming(-SCREEN_WIDTH, { duration: 400 });
    taskOpacity.value = withTiming(0, { duration: 400 });
    buttonOpacity.value = withTiming(0, { duration: 400 }, (finished) => {
      if (finished) {
        clipOverflow.value = true; 
        
        if (rowHeight.value !== undefined) {
          rowHeight.value = withTiming(0, { duration: 350 });
          marginB.value = withTiming(0, { duration: 350 }, (fin2) => {
            if (fin2) runOnJS(actualDelete)(item.id); 
          });
        } else {
          runOnJS(actualDelete)(item.id);
        }
      }
    });
  };

  const animatedRowStyle = useAnimatedStyle(() => ({
    height: isDeletingSV.value ? rowHeight.value : undefined, 
    marginBottom: marginB.value,
    marginHorizontal: 32,
    borderRadius: 30, 
    overflow: clipOverflow.value ? 'hidden' : 'visible', 
  }));

  const animatedBgStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(isActive ? '#E5E5E5' : '#FFFFFF', { duration: 200 }),
    transform: [{ translateX: taskTranslateX.value }],
    opacity: taskOpacity.value,
  }));

  const animatedButtonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const onLayout = (event: any) => {
    if (!isDeletingSV.value && !isActive) {
      rowHeight.value = event.nativeEvent.layout.height;
    }
  };

  const renderRightActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.4],
      extrapolate: 'clamp',
    });
    const actionOpacity = dragX.interpolate({
      inputRange: [-80, -20, 0],
      outputRange: [1, 0, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.rightActionContainer, animatedButtonStyle]}>
        <RNAnimated.View style={{ transform: [{ scale }], opacity: actionOpacity, alignItems: 'center' }}>
          <TouchableOpacity 
            style={styles.deleteCircleButton} 
            onPress={handleDelete} 
            activeOpacity={0.7}
          >
            <Ionicons name="trash" size={20} color="white" />
          </TouchableOpacity>
        </RNAnimated.View>
        <RNAnimated.Text style={[styles.deleteActionText, { opacity: actionOpacity }]}>Sil</RNAnimated.Text>
      </Animated.View>
    );
  };

  return (
    <Animated.View 
      style={[animatedRowStyle, isAddingTask && { opacity: 0.3 }]} 
      onLayout={onLayout}
    >
      <ScaleDecorator activeScale={1.05}>
        <Swipeable
          renderRightActions={renderRightActions}
          friction={1.5} 
          overshootFriction={8}
          enabled={!isActive && !isEditMode && !isAddingTask && !isExpanded} 
          containerStyle={{ overflow: 'visible' }} 
        >
          <Animated.View style={[
            animatedBgStyle, 
            { borderRadius: 18, width: '100%', zIndex: isActive ? 999 : 1 },
            isActive && styles.activeTaskShadow
          ]}>
            <TouchableOpacity
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIsEditMode(true);
                
                if (isExpanded) {
                  expandHeight.value = 0;
                  expandOpacity.value = 0;
                  toggleExpand(item.id);
                  
                  setTimeout(() => {
                    drag();
                  }, 100); 
                } else {
                  drag(); 
                }
              }}
              onPress={() => { if (!isEditMode) toggleExpand(item.id); }}
              delayLongPress={100} 
              activeOpacity={1} 
              style={{ borderRadius: 18, width: '100%' }}
            >
              <View style={[styles.taskWrapper, (isExpanded && !isActive) && { paddingBottom: 20 }]}>
                <View style={styles.headerContent}>
                  <View style={styles.leftContent}>
                    
                    {(isExpanded && !isActive) ? (
                      <TextInput
                        // 🌟 ÇÖZÜM: flex: undefined ve flexShrink: 1 yaparak tıklanabilir alanı sadece yazı boyutu kadar kısıtladık!
                        style={[styles.taskText, { padding: 0, margin: 0, flex: undefined, flexShrink: 1 }]}
                        value={item.text}
                        onChangeText={(text) => updateTask(item.id, { text })}
                        multiline={true}
                        scrollEnabled={false}
                        placeholder="Signal name..."
                        placeholderTextColor="#999"
                      />
                    ) : (
                      <Text 
                        style={styles.taskText} 
                        numberOfLines={(isExpanded && !isActive) ? undefined : 2} 
                        ellipsizeMode="tail"
                      >
                        {item.text}
                      </Text>
                    )}

                  </View>
                  <View style={styles.rightContent}>
                    {!isEditMode && !isActive ? (
                      <Text style={[styles.statusLabel, item.status === 1 && { color: '#EAB308' }]}>
                        {getStatusText(item.status)}
                      </Text>
                    ) : (
                      <TouchableOpacity 
                        onPressIn={() => {
                          if (isExpanded) {
                            expandHeight.value = 0;
                            expandOpacity.value = 0;
                            toggleExpand(item.id);
                            setTimeout(() => drag(), 100);
                          } else {
                            drag();
                          }
                        }} 
                        style={styles.dragHandle}
                      >
                        <Ionicons name="reorder-two-outline" size={24} color={Colors.secondaryText} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <Animated.View style={animatedExpandStyle} pointerEvents={isExpanded && !isActive ? 'auto' : 'none'}>
                  <View style={styles.detailsContainer}>
                    <Text style={styles.detailLabel}>Note</Text>
                    
                    <View style={styles.noteInputContainer}>
                      <TextInput 
                        style={styles.noteInput}
                        multiline
                        placeholder="Add a note..."
                        placeholderTextColor="#999"
                        value={item.note}
                        onChangeText={(text) => updateTask(item.id, { note: text })}
                      />
                    </View>

                    <Text style={styles.detailLabel}>State</Text>
                    <View style={styles.statusRow}>
                      {[
                        { label: 'Void', val: 0 }, 
                        { label: '0.25', val: 0.25 },
                        { label: '0.5', val: 0.5 },
                        { label: '0.75', val: 0.75 },
                        { label: 'Done', val: 1 },
                      ].map((statusOpt, index) => {
                        const isSelected = item.status === statusOpt.val;
                        return (
                          <TouchableOpacity 
                            key={index}
                            style={[styles.statusButton, isSelected && styles.statusButtonActive]}
                            onPress={() => updateTask(item.id, { status: statusOpt.val })}
                          >
                            <Text style={[styles.statusText, isSelected && styles.statusTextActive]}>
                              {statusOpt.label}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </View>
                </Animated.View>

              </View>
            </TouchableOpacity>
          </Animated.View>
        </Swipeable>
      </ScaleDecorator>
    </Animated.View>
  );
};

export default function App() {
  const [showIntro, setShowIntro] = useState(false); 

  let [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    async function prepareApp() {
      if (fontsLoaded) {
        await SplashScreen.hideAsync();
      }
    }
    prepareApp();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; 
  }

  if (showIntro) {
    return <IntroScreen onComplete={() => setShowIntro(false)} />;
  }

  return <HomeScreen />;
}

function HomeScreen() {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
  const [currentDayOffset, setCurrentDayOffset] = useState(0);
  
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<Animated.FlatList<number>>(null);

  useEffect(() => {
    setTimeout(() => {
      scrollX.value = SCREEN_WIDTH; 
      flatListRef.current?.scrollToIndex({ index: 1, animated: false });
    }, 100);
  }, []);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const handlePageChange = (index: number) => {
    const daysData = [-1, 0, 1];
    const newOffset = daysData[index];
    setCurrentDayOffset((prev) => {
      if (prev !== newOffset) return newOffset;
      return prev;
    });
    setIsAddingTask(false);
    if (isEditMode) {
        setIsEditMode(false);
        Keyboard.dismiss();
    }
  };

  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      if (taskText.trim() === '') {
        setIsAddingTask(false);
      }
    });
    return () => { keyboardDidHideListener.remove(); };
  }, [taskText]);

  const exitEditMode = () => {
    if (isEditMode) {
      setIsEditMode(false);
    }
    Keyboard.dismiss();
  };

  const handleAddTaskPress = () => {
    exitEditMode(); 
    setExpandedTaskId(null); 
    const tasksForCurrentDay = allTasks.filter(t => t.date === getIsoDate(currentDayOffset));
    if (tasksForCurrentDay.length >= 3) return; 
    
    setIsAddingTask(true);
  };

  const handleSubmitTask = () => {
    const textToSave = taskText.trim();
    if (textToSave.length > 0) {
      const targetDate = getIsoDate(currentDayOffset);
      const newTask: TaskItem = { 
        id: Date.now().toString(), 
        text: textToSave,
        note: '',
        status: 0,
        date: targetDate 
      };
      setAllTasks([newTask, ...allTasks]); 
    }
    setTaskText(''); 
    setIsAddingTask(false); 
    Keyboard.dismiss();
  };

  const deleteTaskFromState = (idToDelete: string) => {
    setAllTasks(prevTasks => prevTasks.filter((task) => task.id !== idToDelete));
  };

  const updateTask = (id: string, updates: Partial<TaskItem>) => {
    setAllTasks(prevTasks => prevTasks.map(task => 
      task.id === id ? { ...task, ...updates } : task
    ));
  };

  const toggleExpand = (id: string) => {
    setExpandedTaskId(prev => prev === id ? null : id);
  };

  const renderTaskItem = ({ item, drag, isActive }: RenderItemParams<TaskItem>) => {
    return (
      <TaskItemRow
        item={item}
        drag={drag}
        isActive={isActive}
        expandedTaskId={expandedTaskId}
        isEditMode={isEditMode}
        isAddingTask={isAddingTask}
        toggleExpand={toggleExpand}
        updateTask={updateTask}
        actualDelete={deleteTaskFromState}
        setIsEditMode={setIsEditMode}
      />
    );
  };

  const renderDayPage = ({ item: dayOffset }: { item: number }) => {
    const pageDateIso = getIsoDate(dayOffset);
    const dayTasks = allTasks.filter(t => t.date === pageDateIso);
    
    const totalStatus = dayTasks.reduce((sum, task) => sum + task.status, 0);
    const srValue = dayTasks.length === 0 ? 0 : Math.round((totalStatus / dayTasks.length) * 100);
    
    const displayDate = getFormattedDateDisplay(dayOffset);
    const dayTitle = dayOffset === 0 ? "Today" : dayOffset === -1 ? "Yesterday" : "Tomorrow";
    
    return (
      <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
        <View style={styles.pageHeader}>
          <Text style={styles.title}>{dayTitle}</Text>
          <Text style={styles.date}>{displayDate}</Text>

          <View style={styles.progressSection}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressLabelText}>Signal ratio progress bar</Text>
              <Text style={styles.progressValueText}>%{srValue}</Text>
            </View>
            
            <View style={styles.progressBarRow}>
              {dayTasks.length === 0 ? (
                <View style={styles.progressSegmentBg} />
              ) : (
                Array.from({ length: Math.max(1, dayTasks.length) }).map((_, index) => {
                  const segmentFillAmount = dayTasks.length === 0 ? 0 : Math.min(1, Math.max(0, totalStatus - index));
                  return <ProgressBarSegment key={`segment-${index}`} fillAmount={segmentFillAmount} />
                })
              )}
            </View>
          </View>
        </View>

        <DraggableFlatList
          ListHeaderComponent={
            <View style={styles.inputSection}>
              {isAddingTask && currentDayOffset === dayOffset && (
                <View style={[styles.inputContainer, { backgroundColor: '#FFFFFF' }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Create a new signal" 
                    placeholderTextColor={Colors.pillText} 
                    value={taskText}
                    onChangeText={setTaskText}
                    autoFocus={true} 
                    onSubmitEditing={handleSubmitTask}
                    blurOnSubmit={false}
                  />
                </View>
              )}
            </View>
          }
          data={dayTasks}
          onDragEnd={({ data }) => {
            const otherDaysTasks = allTasks.filter(t => t.date !== pageDateIso);
            setAllTasks([...otherDaysTasks, ...data]);
          }}
          keyExtractor={(item) => item.id}
          renderItem={renderTaskItem}
          containerStyle={styles.listContent}
          contentContainerStyle={{ paddingBottom: 100 }} 
          keyboardShouldPersistTaps="handled"
          activationDistance={20} 
        />
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Pressable style={{ flex: 1 }} onPress={() => { exitEditMode(); setExpandedTaskId(null); }}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" />

          <View style={styles.header}>
            <View style={styles.dotsContainer}>
              {[-1, 0, 1].map((_, index) => (
                <AnimatedDot key={index} index={index} scrollX={scrollX} />
              ))}
            </View>
          </View>

          <Animated.FlatList
            ref={flatListRef}
            data={[-1, 0, 1]}
            renderItem={renderDayPage}
            horizontal
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.toString()}
            onScroll={onScroll}
            scrollEventThrottle={16} 
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              runOnJS(handlePageChange)(index);
            }}
            getItemLayout={(data, index) => (
              { length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index }
            )}
            initialScrollIndex={1} 
          />

          {!isAddingTask && (
            <View style={styles.bottomBar}>
              <TouchableOpacity 
                style={[styles.archiveButton, styles.buttonShadow]} 
                onPress={() => { exitEditMode(); setExpandedTaskId(null); }}
              >
                <View style={styles.glassContainer}>
                  <Ionicons name="file-tray-outline" size={22} color="black" />
                  <Text style={styles.archiveButtonText}>Archive</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.fabButton, 
                  styles.buttonShadow,
                  allTasks.filter(t => t.date === getIsoDate(currentDayOffset)).length >= 3 && styles.disabledButton
                ]} 
                onPress={handleAddTaskPress}
                disabled={allTasks.filter(t => t.date === getIsoDate(currentDayOffset)).length >= 3}
              >
                <View style={styles.glassContainer}>
                  <Ionicons name="add" size={32} color={
                      allTasks.filter(t => t.date === getIsoDate(currentDayOffset)).length >= 3 ? "#999" : "black"
                  } />
                </View>
              </TouchableOpacity>
            </View>
          )}
          
        </SafeAreaView>
      </Pressable>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_ALT,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  header: {
    paddingHorizontal: 32, 
    paddingTop: 32, 
    backgroundColor: BACKGROUND_ALT, 
    zIndex: 1, 
  },
  pageHeader: {
    paddingHorizontal: 32, 
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 16, 
    gap: 10, 
    height: 8, 
    alignItems: 'center', 
  },
  dot: {
    height: 8,
    borderRadius: 6,
    backgroundColor: '#EAB308', 
  },
  title: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 24,
    color: Colors.primary,
    marginBottom: 8, 
    lineHeight: 30,
  },
  date: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 18,
    color: Colors.secondaryText,
    marginBottom: 18, 
  },
  
  progressSection: {
    marginBottom: 18, 
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  progressLabelText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
    color: '#999',
  },
  progressValueText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
    color: '#999', 
  },
  progressBarRow: {
    flexDirection: 'row',
    height: 6,
    gap: 6, 
  },
  progressSegmentBg: {
    flex: 1,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressSegmentFill: {
    height: '100%',
    backgroundColor: '#EAB308', 
    borderRadius: 3,
  },

  inputSection: {
    paddingHorizontal: 32,
    paddingTop: 16,
  },
  listContent: {
    flex: 1,
  },
  activeTaskShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10, 
    zIndex: 999, 
  },
  taskWrapper: {
    paddingHorizontal: 18,
    borderRadius: 18,
    overflow: 'hidden',
    width: '100%',
    backgroundColor: 'transparent'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 47, 
    paddingVertical: 10, 
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1, 
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 60, 
    height: 24, 
  },
  statusLabel: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    color: Colors.secondaryText,
  },
  dragHandle: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 10,
    height: '100%', 
    width: 40,      
  },
  detailsContainer: {
    marginTop: 0,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)', 
  },
  detailLabel: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
    marginLeft: 4,
  },
  noteInputContainer: {
    backgroundColor: '#F3F3F3', 
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    height: 120, 
    borderWidth: 1,
    borderColor: '#E0E0E0', 
  },
  noteInput: {
    flex: 1, 
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    color: Colors.primary,
    textAlignVertical: 'top',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  statusButton: {
    paddingVertical: 6,
    paddingHorizontal: 8, 
    borderRadius: 20,
    backgroundColor: '#EBEBEB', 
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusButtonActive: {
    backgroundColor: '#fff', 
    borderColor: '#EAB308', 
  },
  statusText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11, 
    color: '#999',
  },
  statusTextActive: {
    color: 'black', 
  },
  rightActionContainer: {
    width: 70, 
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  deleteCircleButton: {
    width: 42, 
    height: 42, 
    borderRadius: 21, 
    backgroundColor: '#FF3B30', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActionText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11, 
    color: '#999',
    marginTop: 2, 
  },
  taskText: {
    fontFamily: 'SpaceGrotesk_400Regular', 
    fontSize: 16,
    color: Colors.primary, 
    flex: 1, 
  },
  inputContainer: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    backgroundColor: Colors.surface, 
    borderRadius: 18, 
    paddingHorizontal: 18,
    marginBottom: 12,
    minHeight: 47, 
  },
  input: {
    flex: 1, 
    fontFamily: 'SpaceGrotesk_400Regular', 
    fontSize: 16,
    color: Colors.primary, 
    padding: 0, 
    textAlignVertical: 'center', 
    height: '100%',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 36, 
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  archiveButton: {
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginRight: 16,
  },
  archiveButtonText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 15,
    color: Colors.primary,
  },
  fabButton: {
    backgroundColor: '#FFFFFF',
    width: 56,
    height: 51,
    borderRadius: 28,
  },
  buttonShadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  glassContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    gap: 8,
    flex: 1,
  },
  disabledButton: {
    opacity: 0.5,
  }
});