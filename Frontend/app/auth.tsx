import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, Alert,
} from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const [mode,     setMode]     = useState<Mode>('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  if (done) return <Redirect href="/" />;

  const handleSubmit = async () => {
    const trimEmail    = email.trim().toLowerCase();
    const trimPassword = password.trim();

    if (!trimEmail || !trimPassword) {
      Alert.alert('Eksik bilgi', 'Email ve şifre gerekli.');
      return;
    }
    if (trimPassword.length < 6) {
      Alert.alert('Şifre çok kısa', 'En az 6 karakter gir.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email:    trimEmail,
          password: trimPassword,
        });
        if (error) throw error;
        Alert.alert('Hesap oluşturuldu', 'Giriş yapılıyor…');
        // Supabase auto-confirms in most setups — try login immediately
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: trimEmail, password: trimPassword,
        });
        if (loginErr) throw loginErr;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email:    trimEmail,
          password: trimPassword,
        });
        if (error) throw error;
      }
      setDone(true);
    } catch (err: any) {
      Alert.alert('Hata', err?.message ?? 'Bir şeyler ters gitti.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / başlık */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>S</Text>
          </View>
          <Text style={styles.appName}>Signal</Text>
          <Text style={styles.tagline}>Track what truly matters</Text>
        </View>

        {/* Kart */}
        <View style={styles.card}>
          {/* Sekme */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login'    && styles.tabActive]}
              onPress={() => setMode('login')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, mode === 'login'    && styles.tabTextActive]}>Giriş Yap</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'register' && styles.tabActive]}
              onPress={() => setMode('register')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9E9EA0"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            placeholderTextColor="#9E9EA0"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>
                  {mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
                </Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const CARD_RADIUS = 24;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  logoLetter: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: CARD_RADIUS,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  input: {
    height: 52,
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  btn: {
    height: 52,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
