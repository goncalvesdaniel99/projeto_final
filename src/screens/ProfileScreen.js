import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Image, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, ScrollView, SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [expandPassword, setExpandPassword] = useState(false);

  const BASE_URL = Platform.OS === 'android' ? "http://10.0.2.2:3000" : "http://localhost:3000";

  useEffect(() => {
    loadProfileLocal();
  }, []);

  const loadProfileLocal = async () => {
    try {
      // Tenta ler do armazenamento local primeiro (Web ou Mobile)
      const storedName = Platform.OS === 'web' ? localStorage.getItem('userName') : await AsyncStorage.getItem('userName');
      const storedEmail = Platform.OS === 'web' ? localStorage.getItem('userEmail') : await AsyncStorage.getItem('userEmail');
      const storedPhoto = Platform.OS === 'web' ? localStorage.getItem('userPhoto') : await AsyncStorage.getItem('userPhoto');

      if (storedName) setName(storedName);
      if (storedEmail) setEmail(storedEmail);
      if (storedPhoto) setPhoto(storedPhoto);

      // Depois tenta atualizar com dados frescos do servidor
      fetchUserProfileRemote();
    } catch (e) { console.error(e); }
  };

  const fetchUserProfileRemote = async () => {
    try {
      let token = Platform.OS === 'web' ? localStorage.getItem('token') : await AsyncStorage.getItem('token');
      if(token) token = token.replace(/^"|"$/g, '');

      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const user = await res.json();
        
        if (user.nome) {
            setName(user.nome);
            const storage = Platform.OS === 'web' ? localStorage : AsyncStorage;
            storage.setItem('userName', user.nome);
        }
        
        // Se o servidor tiver uma foto, usamos essa (é a fonte de verdade)
        if (user.foto) {
            const photoUrl = user.foto.startsWith('http') ? user.foto : `${BASE_URL}${user.foto}`;
            setPhoto(photoUrl);
            
            const storage = Platform.OS === 'web' ? localStorage : AsyncStorage;
            storage.setItem('userPhoto', photoUrl);
        }
      }
    } catch (e) {
        console.log("Erro ao sincronizar perfil:", e);
    }
  };

  // --- ESCOLHER FOTO ---
  const confirmAddPhoto = () => {
    if (Platform.OS === 'web') {
        if (window.confirm("Queres alterar a tua foto de perfil?")) handlePickImage();
    } else {
        Alert.alert("Alterar Foto", "Queres escolher uma nova foto?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Sim", onPress: handlePickImage }
        ]);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const newUri = result.assets[0].uri;
      
      // 1. Atualiza visualmente JÁ
      setPhoto(newUri);
      
      // 2. Guarda localmente JÁ
      if(Platform.OS === 'web') localStorage.setItem('userPhoto', newUri);
      else await AsyncStorage.setItem('userPhoto', newUri);

      // 3. Envia para o servidor em background
      uploadPhotoToServer(newUri);
    }
  };

  const uploadPhotoToServer = async (uri) => {
    setUploading(true);
    try {
      let token = Platform.OS === 'web' ? localStorage.getItem('token') : await AsyncStorage.getItem('token');
      if(token) token = token.replace(/^"|"$/g, '');

      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob, 'profile.jpg');
      } else {
        let cleanUri = uri.startsWith('file://') ? uri : 'file://' + uri;
        formData.append('file', { uri: cleanUri, name: 'profile.jpg', type: 'image/jpeg' });
      }

      // Rota de Upload
      const res = await fetch(`${BASE_URL}/auth/upload-avatar`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if(res.ok) {
          Alert.alert("Sucesso", "Foto guardada na nuvem!");
      } else {
          console.log("Erro upload servidor");
      }
    } catch (e) {
      console.log("Erro de conexão no upload");
    } finally {
      setUploading(false);
    }
  };

  // --- REMOVER FOTO ---
  const confirmRemovePhoto = () => {
    if (Platform.OS === 'web') {
        if (window.confirm("Tens a certeza que queres eliminar a tua foto?")) handleRemovePhoto();
    } else {
        Alert.alert("Eliminar Foto", "Tens a certeza?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Eliminar", style: "destructive", onPress: handleRemovePhoto }
        ]);
    }
  };

  const handleRemovePhoto = async () => {
    setPhoto(null);
    
    if (Platform.OS === 'web') localStorage.removeItem('userPhoto');
    else await AsyncStorage.removeItem('userPhoto');

    try {
        let token = Platform.OS === 'web' ? localStorage.getItem('token') : await AsyncStorage.getItem('token');
        if(token) token = token.replace(/^"|"$/g, '');

        await fetch(`${BASE_URL}/auth/update-profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ foto: "" }) 
        });
        Alert.alert("Sucesso", "Foto removida.");
    } catch (e) {}
  };

  const handleSaveName = async () => {
    if (!name.trim()) return Alert.alert("Erro", "Nome vazio.");
    setLoading(true);
    
    if(Platform.OS === 'web') localStorage.setItem('userName', name);
    else await AsyncStorage.setItem('userName', name);

    try {
      let token = Platform.OS === 'web' ? localStorage.getItem('token') : await AsyncStorage.getItem('token');
      if(token) token = token.replace(/^"|"$/g, '');

      const res = await fetch(`${BASE_URL}/auth/update-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ nome: name })
      });

      if (res.ok) Alert.alert("Sucesso", "Nome atualizado!");
    } catch (e) {
      Alert.alert("Guardado", "Nome guardado localmente.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return Alert.alert("Atenção", "Preenche tudo.");
    if (newPassword !== confirmPassword) return Alert.alert("Erro", "Passwords não coincidem.");

    setLoadingPass(true);
    try {
      let token = Platform.OS === 'web' ? localStorage.getItem('token') : await AsyncStorage.getItem('token');
      if(token) token = token.replace(/^"|"$/g, '');

      const res = await fetch(`${BASE_URL}/auth/update-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (res.ok) {
        Alert.alert("Sucesso", "Password alterada!");
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        setExpandPassword(false);
      } else {
        const d = await res.json();
        Alert.alert("Erro", d.error || "Falha ao alterar.");
      }
    } catch (e) {
      Alert.alert("Erro", "Falha de conexão.");
    } finally {
      setLoadingPass(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F9FC' }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          
          <Text style={styles.headerTitle}>O Meu Perfil</Text>

          <View style={styles.photoContainer}>
            <View style={styles.photoWrapper}>
                {uploading ? (
                    <View style={[styles.photo, styles.loadingPhoto]}>
                        <ActivityIndicator color="#1D3C58" size="large"/>
                    </View>
                ) : photo ? (
                    <Image source={{ uri: photo }} style={styles.photo} />
                ) : (
                    <View style={styles.photoPlaceholder}>
                        <Ionicons name="person" size={60} color="#BDC3C7" />
                    </View>
                )}

                <TouchableOpacity onPress={confirmAddPhoto} style={styles.cameraIconBadge}>
                    <Ionicons name="camera" size={20} color="white" />
                </TouchableOpacity>

                {photo && !uploading && (
                    <TouchableOpacity onPress={confirmRemovePhoto} style={styles.deleteIconBadge}>
                        <Ionicons name="trash" size={18} color="white" />
                    </TouchableOpacity>
                )}
            </View>
            <Text style={styles.photoHint}>Toque na câmara para alterar</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dados Pessoais</Text>
            <Text style={styles.label}>Nome</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />
            <Text style={styles.label}>E-mail</Text>
            <TextInput style={[styles.input, styles.disabledInput]} value={email} editable={false} placeholder="Email não disponível" />
            <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveName} disabled={loading}>
               {loading ? <ActivityIndicator color="white"/> : <Text style={styles.btnText}>Guardar Nome</Text>}
            </TouchableOpacity>
          </View>

          <View style={[styles.card, { marginTop: 20 }]}>
            <TouchableOpacity style={styles.accordionHeader} onPress={() => setExpandPassword(!expandPassword)}>
              <View style={{flexDirection:'row', alignItems:'center'}}>
                <Ionicons name="lock-closed-outline" size={20} color="#1D3C58" style={{marginRight:10}} />
                <Text style={styles.cardTitle}>Alterar Password</Text>
              </View>
              <Ionicons name={expandPassword ? "chevron-up" : "chevron-down"} size={20} color="#666" />
            </TouchableOpacity>

            {expandPassword && (
              <View style={{ marginTop: 15 }}>
                <Text style={styles.label}>Password Atual</Text>
                <TextInput style={styles.input} secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} placeholder="********" />
                <Text style={styles.label}>Nova Password</Text>
                <TextInput style={styles.input} secureTextEntry value={newPassword} onChangeText={setNewPassword} placeholder="Mínimo 6 caracteres" />
                <Text style={styles.label}>Confirmar Nova Password</Text>
                <TextInput style={styles.input} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repete a nova password" />
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
  photoContainer: { alignItems: 'center', marginBottom: 25 },
  photoWrapper: { position: 'relative', width: 120, height: 120 },
  photo: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: 'white' },
  loadingPhoto: { backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', width: 120, height: 120, borderRadius: 60 },
  photoPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#ECF0F1', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'white' },
  cameraIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1D3C58', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#F6F9FC', zIndex: 2 },
  deleteIconBadge: { position: 'absolute', bottom: 0, left: 0, backgroundColor: '#E74C3C', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#F6F9FC', zIndex: 2 },
  photoHint: { marginTop: 8, color: '#7F8C8D', fontSize: 12 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 5 },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  label: { fontSize: 13, color: '#7F8C8D', marginTop: 10, marginBottom: 5, fontWeight: '600' },
  input: { backgroundColor: '#F7F9F9', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ECF0F1', color: '#333' },
  disabledInput: { backgroundColor: '#F0F3F4', color: '#95A5A6' },
  btnPrimary: { backgroundColor: '#1D3C58', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20 },
  btnDanger: { backgroundColor: '#E74C3C', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});