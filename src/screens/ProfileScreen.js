import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Image, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, ScrollView, SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen({ navigation }) {
  // Dados do Utilizador
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  // Dados da Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPass, setLoadingPass] = useState(false);
  
  // Controla se a aba de password está aberta
  const [expandPassword, setExpandPassword] = useState(false);

  // URL da API
  const getApiUrl = () => {
    if (Platform.OS === 'web') return "http://localhost:3000";
    if (Platform.OS === 'android') return "http://10.0.2.2:3000"; 
    return "http://localhost:3000"; 
  };
  const BASE_URL = getApiUrl();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const storedName = Platform.OS === 'web' ? localStorage.getItem('userName') : await AsyncStorage.getItem('userName');
      const storedEmail = Platform.OS === 'web' ? localStorage.getItem('userEmail') : await AsyncStorage.getItem('userEmail');
      // Tenta carregar foto guardada localmente (opcional)
      const storedPhoto = Platform.OS === 'web' ? localStorage.getItem('userPhoto') : await AsyncStorage.getItem('userPhoto');

      if (storedName) setName(storedName.replace(/^"|"$/g, ''));
      if (storedEmail) setEmail(storedEmail.replace(/^"|"$/g, ''));
      if (storedPhoto) setPhoto(storedPhoto);
      
    } catch (e) {
      console.error("Erro ao carregar perfil:", e);
    }
  };

  // --- 1. ALTERAR FOTO ---
  const handlePickImage = async () => {
    // Pede permissão e abre a galeria
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const newUri = result.assets[0].uri;
      setPhoto(newUri);
      
      // Guarda a URI localmente para persistir ao reiniciar a app
      if(Platform.OS === 'web') localStorage.setItem('userPhoto', newUri);
      else await AsyncStorage.setItem('userPhoto', newUri);
    }
  };

  // --- 2. SALVAR NOME ---
  const handleSaveName = async () => {
    if (!name.trim()) return Alert.alert("Erro", "Nome vazio.");
    
    setLoading(true);
    try {
      if (Platform.OS === 'web') localStorage.setItem('userName', name);
      else await AsyncStorage.setItem('userName', name);
      Alert.alert("Sucesso", "Nome atualizado!");
    } catch (e) {
      Alert.alert("Erro", "Falha ao salvar nome.");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. ALTERAR PASSWORD ---
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return Alert.alert("Atenção", "Preenche todos os campos da password.");
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert("Erro", "As novas passwords não coincidem.");
    }

    setLoadingPass(true);
    try {
      let token = Platform.OS === 'web' ? localStorage.getItem('token') : await AsyncStorage.getItem('token');
      if(token) token = token.replace(/^"|"$/g, '');

      console.log("A enviar pedido para:", `${BASE_URL}/auth/update-password`);

      const res = await fetch(`${BASE_URL}/auth/update-password`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (res.ok) {
        Alert.alert("Sucesso", "Password alterada com sucesso!");
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        setExpandPassword(false); // Fecha a aba
      } else {
        // Se a conta for antiga, vai dar erro aqui porque a pass antiga na BD não é um hash
        Alert.alert("Erro", data.error || "Falha ao alterar. Verifica a password atual.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Erro", "Falha de conexão com o servidor.");
    } finally {
      setLoadingPass(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F9FC' }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          
          <Text style={styles.headerTitle}>O Meu Perfil</Text>

          {/* --- SECÇÃO DA FOTO --- */}
          <View style={styles.photoContainer}>
            <TouchableOpacity onPress={handlePickImage} style={styles.photoWrapper}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="person" size={60} color="#BDC3C7" />
                </View>
              )}
              {/* Ícone de Câmara sobreposto */}
              <View style={styles.cameraIconBadge}>
                <Ionicons name="camera" size={20} color="white" />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>Toque para alterar a foto</Text>
          </View>


          {/* --- DADOS PESSOAIS --- */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dados Pessoais</Text>
            
            <Text style={styles.label}>Nome</Text>
            <TextInput 
              style={styles.input} 
              value={name} 
              onChangeText={setName} 
            />

            <Text style={styles.label}>E-mail</Text>
            <TextInput 
              style={[styles.input, styles.disabledInput]} 
              value={email} 
              editable={false} 
              placeholder="Sem email definido"
            />

            <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveName} disabled={loading}>
               {loading ? <ActivityIndicator color="white"/> : <Text style={styles.btnText}>Guardar Nome</Text>}
            </TouchableOpacity>
          </View>


          {/* --- SEGURANÇA (PASSWORD) --- */}
          <View style={[styles.card, { marginTop: 20 }]}>
            <TouchableOpacity 
              style={styles.accordionHeader} 
              onPress={() => setExpandPassword(!expandPassword)}
            >
              <View style={{flexDirection:'row', alignItems:'center'}}>
                <Ionicons name="lock-closed-outline" size={20} color="#1D3C58" style={{marginRight:10}} />
                <Text style={styles.cardTitle}>Alterar Password</Text>
              </View>
              <Ionicons name={expandPassword ? "chevron-up" : "chevron-down"} size={20} color="#666" />
            </TouchableOpacity>

            {expandPassword && (
              <View style={{ marginTop: 15 }}>
                <Text style={styles.label}>Password Atual</Text>
                <TextInput 
                  style={styles.input} 
                  secureTextEntry 
                  value={currentPassword} 
                  onChangeText={setCurrentPassword}
                  placeholder="********"
                />

                <Text style={styles.label}>Nova Password</Text>
                <TextInput 
                  style={styles.input} 
                  secureTextEntry 
                  value={newPassword} 
                  onChangeText={setNewPassword}
                  placeholder="Mínimo 6 caracteres"
                />

                <Text style={styles.label}>Confirmar Nova Password</Text>
                <TextInput 
                  style={styles.input} 
                  secureTextEntry 
                  value={confirmPassword} 
                  onChangeText={setConfirmPassword}
                  placeholder="Repete a nova password"
                />

                <TouchableOpacity style={styles.btnDanger} onPress={handleChangePassword} disabled={loadingPass}>
                   {loadingPass ? <ActivityIndicator color="white"/> : <Text style={styles.btnText}>Atualizar Password</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 50 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1D3C58', textAlign: 'center', marginBottom: 25, marginTop: 10 },
  
  // FOTO
  photoContainer: { alignItems: 'center', marginBottom: 25 },
  photoWrapper: { position: 'relative' },
  photo: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: 'white' },
  photoPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#ECF0F1', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'white' },
  cameraIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1D3C58', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#F6F9FC' },
  photoHint: { marginTop: 8, color: '#7F8C8D', fontSize: 12 },

  // CARDS
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 5 },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },

  // INPUTS
  label: { fontSize: 13, color: '#7F8C8D', marginTop: 10, marginBottom: 5, fontWeight: '600' },
  input: { backgroundColor: '#F7F9F9', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ECF0F1', color: '#333' },
  disabledInput: { backgroundColor: '#F0F3F4', color: '#95A5A6' },

  // BOTÕES
  btnPrimary: { backgroundColor: '#1D3C58', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20 },
  btnDanger: { backgroundColor: '#E74C3C', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});