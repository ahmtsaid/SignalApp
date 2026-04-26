/**
 * Onboarding’i yalnızca ilk kurulumda göstermek için kalıcı bayrak.
 * `App` okur; `onboarding.tsx` tamamlanınca yazar.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@signalapp/onboarding_complete';
let completedThisSession = false;

/** Kullanıcı onboarding’i bitirdiyse `true`. */
export async function getOnboardingComplete(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === 'true';
  } catch {
    return false;
  }
}

/** Test modunda app yeniden açılana kadar onboarding'i tekrar göstermemek için RAM bayrağı. */
export function getOnboardingCompleteThisSession(): boolean {
  return completedThisSession;
}

/** Onboarding son “İleri”de çağrılır; bir daha göstermemek için bayrak yazar. */
export async function setOnboardingComplete(): Promise<void> {
  completedThisSession = true;
  await AsyncStorage.setItem(KEY, 'true');
}
