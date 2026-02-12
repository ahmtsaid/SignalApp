import React, { useCallback, useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Platform, StatusBar, TextInput, Keyboard, LayoutAnimation, UIManager, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, SpaceGrotesk_500Medium, SpaceGrotesk_400Regular, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import Colors from '../src/constants/Colors';
import * as Haptics from 'expo-haptics';

SplashScreen.preventAutoHideAsync();

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// Hızlı Animasyon Ayarı
const FastLayoutAnimation = {
  duration: 200, 
  create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
  delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
};

interface TaskItem {
  id: string;
  text: string;
  note: string;
  status: number; // 0, 0.25, 0.50, 0.75, 1 (Done)
}

// Tarih Formatlama Fonksiyonu (Örn: Feb 12, 2026 - Thursday)
const getFormattedDate = () => {
  const date = new Date();
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric', 
    weekday: 'long' 
  };
  // 'en-US' formatı "Feb 12, 2026, Thursday" verir. Biz tire (-) istiyoruz.
  const dateString = date.toLocaleDateString('en-US', options);
  return dateString.replace(',', ' -'); 
};

// State değerini metne çeviren yardımcı fonksiyon
const getStatusText = (status: number): string => {
  if (status === 0) return 'Nothing';
  if (status === 0.25) return '%25';
  if (status === 0.5) return '%50';
  if (status === 0.75) return '%75';
  if (status === 1) return 'Done';
  return '';
};

export default function HomeScreen() {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
  // Tarihi state olarak tutmaya gerek yok, her render'da güncel alabiliriz 
  // ama performans için memoize edilebilir. Şimdilik direkt değişkene atıyoruz.
  const currentDate = getFormattedDate();

  let [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      if (taskText.trim() === '') {
        setIsAddingTask(false);
      }
    });
    return () => {
      keyboardDidHideListener.remove();
    };
  }, [taskText]);

  const exitEditMode = () => {
    if (isEditMode) {
      LayoutAnimation.configureNext(FastLayoutAnimation);
      setIsEditMode(false);
    }
    Keyboard.dismiss();
  };

  const handleAddTaskPress = () => {
    exitEditMode(); 
    setExpandedTaskId(null); 
    if (tasks.length >= 5) return; 
    setIsAddingTask(true);
  };

  const handleSubmitTask = () => {
    if (taskText.trim().length > 0) {
      LayoutAnimation.configureNext(FastLayoutAnimation);
      const newTask: TaskItem = { 
        id: Date.now().toString(), 
        text: taskText,
        note: '',
        status: 0 
      };
      setTasks([newTask, ...tasks]); 
      setTaskText(''); 
      setIsAddingTask(false); 
    } else {
      setIsAddingTask(false); 
    }
    Keyboard.dismiss();
  };

  const deleteTask = (idToDelete: string) => {
    setTimeout(() => {
      LayoutAnimation.configureNext(FastLayoutAnimation);
      const newTasks = tasks.filter((task) => task.id !== idToDelete);
      setTasks(newTasks);
    }, 200);
  };

  const updateTask = (id: string, updates: Partial<TaskItem>) => {
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === id ? { ...task, ...updates } : task
    ));
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(FastLayoutAnimation);
    setExpandedTaskId(prev => prev === id ? null : id);
  };

  const renderRightActions = (progress: any, dragX: any) => {
    return (
      <View style={styles.deleteActionContainer}>
        <View style={styles.deleteAction}>
          <Ionicons name="trash-outline" size={24} color="white" />
        </View>
      </View>
    );
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<TaskItem>) => {
    const isExpanded = expandedTaskId === item.id;

    return (
      <ScaleDecorator activeScale={1.03}> 
        <View style={[
          styles.rowContainer, 
          isAddingTask && { opacity: 0.3 } 
        ]}>
          <Swipeable
            renderRightActions={renderRightActions}
            friction={1.5} 
            overshootFriction={8}
            onSwipeableWillOpen={() => deleteTask(item.id)}
            enabled={!isActive && !isEditMode && !isAddingTask && !isExpanded} 
          >
            <TouchableOpacity
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                LayoutAnimation.configureNext(FastLayoutAnimation);
                setIsEditMode(true);
                drag(); 
              }}
              onPress={() => {
                if (!isEditMode) toggleExpand(item.id);
              }}
              delayLongPress={100} 
              activeOpacity={1} 
              style={[
                styles.taskWrapper,
                isActive && styles.activeTaskWrapper,
                isExpanded ? styles.expandedTaskWrapper : { height: 62 }
              ]}
            >
              <View style={styles.taskContentContainer}>
                
                {/* ÜST KISIM (Başlık ve Nokta) */}
                <View style={styles.headerContent}>
                  <View style={styles.leftContent}>
                    <View style={styles.taskDot} />
                    <Text style={styles.taskText} numberOfLines={1} ellipsizeMode="tail">
                      {item.text}
                    </Text>
                  </View>

                  {/* Sağ Taraftaki İçerik (State veya Sürükleme İkonu) */}
                  <View style={styles.rightContent}>
                    {!isEditMode && !isActive && (
                      <Text style={[
                        styles.statusLabel,
                        // DÜZELTME: Eğer status 1 (Done) ise rengi turuncu yap
                        item.status === 1 && { color: '#EAB308' }
                      ]}>
                        {getStatusText(item.status)}
                      </Text>
                    )}

                    {(isEditMode || isActive) && (
                      <TouchableOpacity onPressIn={drag} style={styles.dragHandle}>
                        <Ionicons name="reorder-two-outline" size={24} color={Colors.secondaryText} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* AÇILAN DETAY KISMI */}
                {isExpanded && (
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
                        { label: 'Nothing', val: 0 },
                        { label: '0.25', val: 0.25 },
                        { label: '0.5', val: 0.5 },
                        { label: '0.75', val: 0.75 },
                        { label: 'Done', val: 1 },
                      ].map((statusOpt, index) => {
                        const isSelected = item.status === statusOpt.val;
                        return (
                          <TouchableOpacity 
                            key={index}
                            style={[
                              styles.statusButton,
                              isSelected && styles.statusButtonActive
                            ]}
                            onPress={() => updateTask(item.id, { status: statusOpt.val })}
                          >
                            <Text style={[
                              styles.statusText,
                              isSelected && styles.statusTextActive
                            ]}>
                              {statusOpt.label}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>

                  </View>
                )}

              </View>
            </TouchableOpacity>
          </Swipeable>
        </View>
      </ScaleDecorator>
    );
  };

  if (!fontsLoaded) return null; 

  const calculateSR = () => {
    if (tasks.length === 0) return 0;
    const totalStatus = tasks.reduce((sum, task) => sum + task.status, 0);
    const average = totalStatus / tasks.length;
    return Math.round(average * 100);
  };

  const srValue = calculateSR();
  const counterColor = tasks.length >= 5 ? '#EAB308' : Colors.activePillText;
  const isMaxReached = tasks.length >= 5;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Pressable style={{ flex: 1 }} onPress={() => { exitEditMode(); setExpandedTaskId(null); }}>
        <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
          <StatusBar barStyle="dark-content" />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dotsContainer}>
              <View style={styles.dot} />
              <View style={[styles.dot, { opacity: 0.3 }]} />
              <View style={[styles.dot, { opacity: 0.3 }]} />
            </View>

            <Text style={styles.title}>Today</Text>
            {/* DÜZELTME: Tarih artık dinamik */}
            <Text style={styles.date}>{currentDate}</Text>

            <View style={styles.statsContainer}>
              {/* SR Hapı */}
              <View style={[styles.pill, { backgroundColor: '#EAB308' }]}>
                <Text style={styles.pillLabel}>SR</Text>
                {/* DÜZELTME: SR değerinin rengi artık SİYAH */}
                <Text style={[styles.pillValue, { color: 'black' }]}>%{srValue}</Text>
              </View>
              {/* Sayaç Hapı */}
              <View style={styles.pill}>
                <Text style={[styles.pillValueActive, { color: counterColor }]}>
                  {tasks.length}/5
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.inputSection}>
            {isAddingTask && (
              <View style={styles.inputContainer}>
                <View style={styles.inputDot} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a new project"
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

          <DraggableFlatList
            data={tasks}
            onDragEnd={({ data }) => setTasks(data)}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            containerStyle={styles.listContent}
            contentContainerStyle={{ paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
            activationDistance={20} 
          />

          {!isAddingTask && (
            <View style={styles.bottomBar}>
              <TouchableOpacity style={styles.archiveButton} onPress={() => { exitEditMode(); setExpandedTaskId(null); }}>
                <Ionicons name="archive-outline" size={22} color="black" style={{ marginBottom: 2 }} />
                <Text style={styles.archiveButtonText}>Archive</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.fabButton, isMaxReached && styles.disabledButton]} 
                onPress={handleAddTaskPress}
                disabled={isMaxReached}
              >
                <Ionicons name="add" size={32} color={isMaxReached ? "#999" : "black"} />
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
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  header: {
    paddingHorizontal: 32, 
    paddingTop: 32, 
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 16, 
    gap: 10, 
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: '#EAB308', // Yeni Sarı
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
    marginBottom: 32, 
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24, 
  },
  pill: {
    height: 30,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pillLabel: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 13,
    color: Colors.primary,
  },
  pillValue: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    color: Colors.pillText,
  },
  pillValueActive: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    color: Colors.activePillText,
  },
  
  inputSection: {
    paddingHorizontal: 32,
  },
  listContent: {
    flex: 1,
    paddingHorizontal: 32,
  },
  
  rowContainer: {
    marginBottom: 12,
  },

  taskWrapper: {
    backgroundColor: Colors.surface, 
    borderRadius: 30, 
    overflow: 'hidden',
    paddingHorizontal: 20,
    flexDirection: 'column', 
    justifyContent: 'center',
  },
  
  expandedTaskWrapper: {
    height: undefined, 
    paddingVertical: 20, 
  },

  activeTaskWrapper: {
    backgroundColor: '#E5E5E5', 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10, 
  },

  taskContentContainer: {
    width: '100%',
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 62 - 40, 
    marginTop: 11, 
    marginBottom: 11,
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
    minWidth: 60, 
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
    marginTop: 10,
    paddingTop: 10,
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
  },
  noteInput: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    color: Colors.primary,
    minHeight: 60, 
    textAlignVertical: 'top',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap', 
    gap: 8,
  },
  statusButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#EBEBEB', 
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusButtonActive: {
    backgroundColor: '#fff', 
    borderColor: '#EAB308', // Yeni Sarı
  },
  statusText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
    color: '#999',
  },
  statusTextActive: {
    color: 'black', 
  },

  deleteActionContainer: {
    backgroundColor: '#eeb50a', 
    width: '100%', 
    height: '100%',
    justifyContent: 'center',
    alignItems: 'flex-end', 
    paddingHorizontal: 20,
    borderRadius: 30, 
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  taskDot: {
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: '#EAB308', // Yeni Sarı
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
    borderRadius: 30, 
    paddingHorizontal: 20,
    marginBottom: 12,
    height: 62, 
  },
  inputDot: {
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: '#EAB308', // Yeni Sarı
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
    backgroundColor: Colors.background,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  archiveButton: {
    width : 138, 
    marginRight: 15,
    height: 51, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 100,
    gap: 8,
  },
  archiveButtonText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 15,
    color: Colors.primary,
  },
  fabButton: {
    width: 56,
    height: 51, 
    borderRadius: 28,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  }
});