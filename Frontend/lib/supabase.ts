/**
 * Supabase istemcisi — Auth (anonim oturum dahil) ve JWT üretimi buradan.
 * URL / anon key: `.env` içindeki EXPO_PUBLIC_* değişkenleri (Expo bunları bundle’a gömer).
 */
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl     = (process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '').trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL veya EXPO_PUBLIC_SUPABASE_ANON_KEY boş. ' +
      'Frontend/.env dosyasını oluşturun (.env.example → .env), değerleri yapıştırın ve Metro’yu yeniden başlatın (npx expo start --clear).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:            AsyncStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});
