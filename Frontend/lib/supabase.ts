/**
 * Supabase istemcisi — Auth (anonim oturum dahil) ve JWT üretimi buradan.
 * URL / anon key: `.env` içindeki EXPO_PUBLIC_* değişkenleri (Expo bunları bundle’a gömer).
 */
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl     = process.env.EXPO_PUBLIC_SUPABASE_URL  as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:            AsyncStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});
