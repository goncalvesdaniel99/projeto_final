import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Image, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, ScrollView, SafeAreaView, StatusBar, Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState(null);
  const [escola, setEscola] = useState("");
  const [grau, setGrau] = useState("");
  const [curso, setCurso] = useState("");
  const [ano, setAno] = useState("");
  
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Estados da Password
  const [expandPassword, setExpandPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Estados do Modal Foto
  const [tempPhoto, setTempPhoto] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const BASE_URL = Platform.OS === 'android' ? "http://10.0.2.2:3000" : "http://localhost:3000";

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    loadProfileData();
  }, [navigation]);

  const loadProfileData = async () => {
    try {
      const storage = Platform.OS === 'web' ? localStorage : AsyncStorage;
      let token = await storage.getItem('token');
      if (token) {
        const res = await fetch(`${BASE_URL}/auth/profile`, {
          headers: { "Authorization": `Bearer ${token.replace(/^"|"$/g, '')}` }
        });
        if (res.ok) {
          const data = await res.json();
          const u = data.user;
          setName(u.nome || "");
          setEmail(u.email || "");
          setEscola(u.escola || "");
          setGrau(u.grau || "");
          setCurso(u.curso || "");
          setAno(u.ano ? String(u.ano) : "");
          if (u.foto) {
             const imgUrl = `${BASE_URL}${u.foto}`;
             setPhoto(imgUrl);
             await storage.setItem('userPhoto', imgUrl);
          }
        }
      }
    } catch (e) { console.log(e); }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const storage = Platform.OS === 'web' ? localStorage : AsyncStorage;
      let token = (await storage.getItem('token')).replace(/^"|"$/g, '');

      const res = await fetch(`${BASE_URL}/auth/update-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ nome: name, escola, grau, curso, ano })
      });

      if (res.ok) {
        await storage.setItem('userName', name);
        setEditing(false); // 🔥 Fecha o modo de edição e ícone volta ao lápis
        Alert.alert("Sucesso", "Perfil atualizado!");
      }
    } catch (e) { Alert.alert("Erro", "Falha de rede."); } 
    finally { setLoading(false); }
  };

  const confirmUpload = async () => {
    setShowPhotoModal(false);
    setUploading(true);
    try {
      let token = (await AsyncStorage.getItem('token')).replace(/^"|"$/g, '');
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(tempPhoto);
        formData.append('file', await response.blob(), 'profile.jpg');
      } else {
        formData.append('file', { uri: tempPhoto, name: 'profile.jpg', type: 'image/jpeg' });
      }
      const res = await fetch(`${BASE_URL}/auth/upload-avatar`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        const finalUrl = `${BASE_URL}${data.photoUrl}`;
        setPhoto(finalUrl);
        if (Platform.OS === 'web') localStorage.setItem('userPhoto', finalUrl);
        else await AsyncStorage.setItem('userPhoto', finalUrl);
        Alert.alert("Sucesso", "Foto atualizada!");
      }
    } catch (e) { console.log(e); } 
    finally { setUploading(false); }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) return Alert.alert("Erro", "As passwords não coincidem.");
    setLoading(true);
    try {
      let token = (await AsyncStorage.getItem('token')).replace(/^"|"$/g, '');
      const res = await fetch(`${BASE_URL}/auth/update-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (res.ok) {
        Alert.alert("Sucesso", "Password alterada!");
        setExpandPassword(false);
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      } else {
        Alert.alert("Erro", "Password atual incorreta.");
      }
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={['#E2E8F0', '#F8FAFC', '#F1F5F9']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
                <Ionicons name="arrow-back" size={22} color="#1D3C58" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>O Meu Perfil</Text>
            <TouchableOpacity onPress={() => setEditing(!editing)} style={styles.backCircle}>
                <Ionicons name={editing ? "close" : "create-outline"} size={22} color={editing ? "#E74C3C" : "#1D3C58"} />
            </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.centeredWrapper}>
              
              <View style={styles.photoContainer}>
                <View style={styles.photoWrapper}>
                    {uploading ? <ActivityIndicator color="#1D3C58" /> : photo ? <Image source={{ uri: photo }} style={styles.photo} /> : <View style={styles.photoPlaceholder}><Ionicons name="person" size={50} color="#BDC3C7" /></View>}
                    <TouchableOpacity onPress={() => {
                        ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5 })
                        .then(result => { if (!result.canceled) { setTempPhoto(result.assets[0].uri); setShowPhotoModal(true); } });
                    }} style={styles.cameraBadge}><Ionicons name="camera" size={18} color="white" /></TouchableOpacity>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardSectionTitle}>Informação Geral</Text>
                <Text style={styles.label}>NOME COMPLETO</Text>
                <TextInput style={[styles.input, !editing && styles.disabledInput]} value={name} onChangeText={setName} editable={editing} />
                
                <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
                    <View style={{flex: 2}}><Text style={styles.label}>INSTITUIÇÃO</Text><TextInput style={[styles.input, !editing && styles.disabledInput]} value={escola} onChangeText={setEscola} editable={editing} /></View>
                    <View style={{flex: 1}}><Text style={styles.label}>ANO</Text><TextInput style={[styles.input, !editing && styles.disabledInput]} value={ano} onChangeText={setAno} editable={editing} keyboardType="numeric" /></View>
                </View>

                <Text style={[styles.label, {marginTop: 15}]}>CURSO</Text>
                <TextInput style={[styles.input, !editing && styles.disabledInput]} value={curso} onChangeText={setCurso} editable={editing} />
                
                <Text style={[styles.label, {marginTop: 15}]}>E-MAIL (BLOQUEADO)</Text>
                <TextInput style={[styles.input, styles.disabledInput]} value={email} editable={false} />

                {editing && (
                    <TouchableOpacity style={styles.btnSave} onPress={handleSaveProfile}>
                        {loading ? <ActivityIndicator color="white"/> : <Text style={styles.btnText}>Guardar Alterações</Text>}
                    </TouchableOpacity>
                )}
              </View>

              {/* SEGURANÇA / PASSWORD */}
              <View style={[styles.card, { marginTop: 20, marginBottom: 30 }]}>
                <TouchableOpacity style={styles.accordionHeader} onPress={() => setExpandPassword(!expandPassword)}>
                  <View style={{flexDirection:'row', alignItems:'center'}}><Ionicons name="lock-closed" size={18} color="#1D3C58" style={{marginRight:8}} /><Text style={styles.cardSectionTitle}>Segurança</Text></View>
                  <Ionicons name={expandPassword ? "chevron-up" : "chevron-down"} size={20} color="#94A3B8" />
                </TouchableOpacity>
                {expandPassword && (
                  <View style={{ marginTop: 15 }}>
                    <TextInput style={styles.input} secureTextEntry placeholder="Password Atual" value={currentPassword} onChangeText={setCurrentPassword} />
                    <TextInput style={[styles.input, {marginTop:10}]} secureTextEntry placeholder="Nova Password" value={newPassword} onChangeText={setNewPassword} />
                    <TextInput style={[styles.input, {marginTop:10}]} secureTextEntry placeholder="Confirmar Nova Password" value={confirmPassword} onChangeText={setConfirmPassword} />
                    <TouchableOpacity style={styles.btnPassword} onPress={handleChangePassword}>
                       {loading ? <ActivityIndicator color="white"/> : <Text style={styles.btnText}>Atualizar Password</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* MODAL FOTO (LARGURA CORRIGIDA) */}
      <Modal visible={showPhotoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Alterar foto de perfil?</Text>
            {tempPhoto && <Image source={{ uri: tempPhoto }} style={styles.previewImage} />}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnCancelModal} onPress={() => setShowPhotoModal(false)}><Text style={{fontWeight:'bold', color:'#64748B'}}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirmModal} onPress={confirmUpload}><Text style={{color:'white', fontWeight:'bold'}}>Confirmar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginVertical: 15, alignSelf: 'center', width: '100%', maxWidth: 750 },
  backCircle: { width: 38, height: 38, backgroundColor: '#FFF', borderRadius: 19, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowOpacity: 0.1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1D3C58' },
  scrollContent: { paddingBottom: 40 },
  centeredWrapper: { alignSelf: 'center', width: '100%', maxWidth: 750, paddingHorizontal: 20 },
  photoContainer: { alignItems: 'center', marginVertical: 20 },
  photoWrapper: { position: 'relative', width: 110, height: 110 },
  photo: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: 'white' },
  photoPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1D3C58', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#F1F5F9' },
  card: { backgroundColor: "rgba(255, 255, 255, 0.85)", borderRadius: 24, padding: 24, elevation: 4, shadowOpacity: 0.05 },
  cardSectionTitle: { fontSize: 17, fontWeight: '800', color: '#1D3C58' },
  label: { fontSize: 10, fontWeight: '800', color: '#94A3B8', marginBottom: 5, marginTop: 10, textTransform: 'uppercase' },
  input: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#E2E8F0', color: '#1E293B', fontWeight: '600' },
  disabledInput: { backgroundColor: 'rgba(226, 232, 240, 0.5)', color: '#64748B' },
  btnSave: { backgroundColor: '#1D3C58', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 25 },
  btnPassword: { backgroundColor: '#795548', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 10 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 380, backgroundColor: 'white', borderRadius: 25, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 19, fontWeight: 'bold', marginBottom: 20, color: '#1D3C58' },
  previewImage: { width: 140, height: 140, borderRadius: 70, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  btnCancelModal: { flex: 1, padding: 14, backgroundColor: '#F1F5F9', borderRadius: 15, alignItems: 'center' },
  btnConfirmModal: { flex: 1, padding: 14, backgroundColor: '#1D3C58', borderRadius: 15, alignItems: 'center' }
});