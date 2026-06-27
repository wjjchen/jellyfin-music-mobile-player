import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { jellyfinApi } from '@/api/jellyfin';
import Svg, { Polygon, Path } from 'react-native-svg';

export default function LoginPage() {
  const [server, setServer] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await jellyfinApi.setServer(server);
      await jellyfinApi.login(username, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || '登录失败，请检查服务器地址和凭据');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <Svg width={72} height={72} viewBox="0 0 24 24" fill="none">
            <Polygon points="12 2 2 7 12 12 22 7 12 2" fill="#00A4DC" />
            <Path d="M2 17l10 5 10-5" stroke="#00A4DC" strokeWidth={2} />
            <Path d="M2 12l10 5 10-5" stroke="#00A4DC" strokeWidth={2} />
          </Svg>
          <Text style={styles.title}>Jellyfin Player</Text>
          <Text style={styles.subtitle}>连接你的音乐世界</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>服务器地址</Text>
            <TextInput
              style={styles.input}
              value={server}
              onChangeText={setServer}
              placeholder="http://192.168.1.100:8096"
              placeholderTextColor="rgba(255,255,255,0.4)"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>用户名</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="输入用户名"
              placeholderTextColor="rgba(255,255,255,0.4)"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>密码</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="输入密码"
              placeholderTextColor="rgba(255,255,255,0.4)"
              secureTextEntry
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>登录</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00A4DC',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
  },
  form: { gap: 16 },
  field: { gap: 6 },
  label: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  input: {
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 14,
  },
  error: {
    padding: 10,
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
    borderRadius: 8,
    color: '#ff6b6b',
    fontSize: 13,
  },
  loginBtn: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#00A4DC',
    alignItems: 'center',
    marginTop: 8,
  },
  loginBtnDisabled: { opacity: 0.5 },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
