import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, 
  ActivityIndicator, ScrollView, SafeAreaView, Platform, Modal, ImageBackground 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

// Mesma imagem de fundo para consistência
const BG_IMAGE = { uri: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?q=80&w=2070&auto=format&fit=crop" };

export default function GroupDetailsScreen({ route, navigation }) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Estados do Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState(null); // 'leave', 'delete', 'join'

  const { group: paramGroup, id: paramId } = route.params || {};
  const navigationGroupId = paramId || paramGroup?._id || paramGroup?.id;

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      let userId = await AsyncStorage.getItem('userId');
      if (userId) setCurrentUserId(userId.replace(/^"|"$/g, ''));

      if (!navigationGroupId) {
        Alert.alert("Erro", "Grupo não encontrado.");
        navigation.goBack();
        return;
      }

      let token = await AsyncStorage.getItem('token');
      if(token) token = token.replace(/^"|"$/g, '');

      const response = await fetch(`${API_BASE_URL}/groups/info/${navigationGroupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setGroup(data);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }

  function handleButtonPress() {
    if (!group || !currentUserId) return;
    const isMember = group.membros.some(m => String(m._id) === String(currentUserId));
    const creatorId = group.criador?._id || group.criador;
    const isAdmin = String(creatorId) === String(currentUserId);

    if (!isMember) setActionType('join');
    else if (isAdmin) setActionType('delete');
    else setActionType('leave');
    
    setModalVisible(true);
  }

  async function confirmAction() {
    const targetId = group?._id || navigationGroupId;
    setModalVisible(false);
    if (actionType === 'join') await joinGroup(targetId);
    else if (actionType === 'delete') await deleteGroup(targetId);
    else await leaveGroup(targetId);
  }

  async function joinGroup(targetId) {
    try {
      let token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/groups/join/${targetId}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token?.replace(/^"|"$/g, '')}` }
      });
      if (res.ok) navigation.navigate('Chat', { id: targetId, group: group, title: group.disciplina });
      else Alert.alert("Erro", "Não foi possível entrar.");
    } catch (e) { console.error(e); }
  }

  async function deleteGroup(targetId) {
    try {
      let token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/groups/${targetId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token?.replace(/^"|"$/g, '')}` }
      });
      if (res.ok) navigation.navigate('Home');
      else Alert.alert("Erro", "Não foi possível eliminar.");
    } catch (e) { console.error(e); }
  }

  async function leaveGroup(targetId) {
    try {
      let token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/groups/leave/${targetId}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token?.replace(/^"|"$/g, '')}` }
      });
      if (res.ok) navigation.navigate('Home');
      else Alert.alert("Erro", "Não foi possível sair.");
    } catch (e) { console.error(e); }
  }

  if (loading) return (
    <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1D3C58" />
    </View>
  );

  if (!group) return null;

  const isMember = group.membros.some(m => String(m._id) === String(currentUserId));
  const creatorId = group.criador?._id || group.criador;
  const isAdmin = String(creatorId) === String(currentUserId);

  let btnStyle = styles.joinButton;
  let btnText = "Juntar-se ao Grupo";
  let btnIcon = "enter-outline";

  if (isMember) {
      if (isAdmin) {
          btnStyle = styles.deleteButton;
          btnText = "Eliminar Grupo";
          btnIcon = "trash-outline";
      } else {
          btnStyle = styles.leaveButton;
          btnText = "Sair do Grupo";
          btnIcon = "log-out-outline";
      }
  }

  return (
    <View style={{flex:1}}>
        <ImageBackground source={BG_IMAGE} style={styles.background} resizeMode="cover">
            <View style={styles.overlay}>
                <SafeAreaView style={{flex: 1}}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.screenTitle}>Detalhes</Text>
                        <View style={{width:40}}/>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {/* CARTÃO PRINCIPAL */}
                        <View style={styles.card}>
                            
                            {/* Cabeçalho do Grupo */}
                            <View style={styles.groupHeader}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="school" size={32} color="#1D3C58" />
                                </View>
                                <Text style={styles.courseTitle}>{group.curso}</Text>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{group.grau} • {group.ano}º Ano</Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {/* Disciplina */}
                            <View style={styles.section}>
                                <Text style={styles.label}>UNIDADE CURRICULAR</Text>
                                <Text style={styles.valueLarge}>{group.disciplina}</Text>
                            </View>

                            {/* Membros */}
                            <View style={styles.section}>
                                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                                    <Text style={styles.label}>MEMBROS ({group.membros.length}/{group.maxPessoas})</Text>
                                    {group.membros.length >= group.maxPessoas && (
                                        <Text style={{color:'#D32F2F', fontSize:12, fontWeight:'bold'}}>CHEIO</Text>
                                    )}
                                </View>
                                
                                <View style={styles.membersContainer}>
                                    {group.membros.map((m, i) => {
                                        const isCreator = String(m._id) === String(creatorId);
                                        return (
                                            <View key={i} style={styles.memberRow}>
                                                <View style={[styles.avatar, isCreator && styles.avatarAdmin]}>
                                                    <Text style={styles.avatarText}>
                                                        {m.nome ? m.nome.charAt(0).toUpperCase() : '?'}
                                                    </Text>
                                                </View>
                                                <View style={{flex:1}}>
                                                    <Text style={styles.memberName} numberOfLines={1}>
                                                        {m.nome}
                                                        {isCreator && <Text style={{color:'#FBC02D'}}> ★</Text>}
                                                    </Text>
                                                    <Text style={styles.memberEmail} numberOfLines={1}>{m.email}</Text>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Botão de Ação */}
                            <TouchableOpacity style={[styles.actionButton, btnStyle]} onPress={handleButtonPress}>
                                <Ionicons name={btnIcon} size={20} color={isAdmin ? "white" : (isMember ? "#D32F2F" : "white")} style={{marginRight:8}} />
                                <Text style={[styles.btnText, isAdmin ? {color:'white'} : (isMember ? {color:'#D32F2F'} : {color:'white'})]}>
                                    {btnText}
                                </Text>
                            </TouchableOpacity>

                        </View>
                    </ScrollView>
                </SafeAreaView>
            </View>
        </ImageBackground>

        {/* MODAL */}
        <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
            <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={[styles.modalIconCircle, 
                    actionType === 'delete' ? {backgroundColor:'#FFEBEE'} : (actionType === 'join' ? {backgroundColor:'#E8F5E9'} : {backgroundColor:'#E3F2FD'})
                ]}>
                    <Ionicons 
                        name={actionType === 'delete' ? "trash" : (actionType === 'join' ? "people" : "log-out")} 
                        size={32} 
                        color={actionType === 'delete' ? "#D32F2F" : (actionType === 'join' ? "#4CAF50" : "#1D3C58")} 
                    />
                </View>
                
                <Text style={styles.modalTitle}>
                    {actionType === 'delete' ? "Eliminar Grupo" : (actionType === 'join' ? "Juntar-se" : "Sair do Grupo")}
                </Text>
                
                <Text style={styles.modalMessage}>
                    {actionType === 'delete' 
                        ? "Tens a certeza? Esta ação é irreversível."
                        : (actionType === 'join' ? "Queres participar neste grupo de estudo?" : "Vais deixar de ter acesso ao chat.")
                    }
                </Text>

                <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalVisible(false)}>
                        <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.modalBtnConfirm, actionType === 'delete' ? {backgroundColor:'#D32F2F'} : (actionType === 'join' ? {backgroundColor:'#1D3C58'} : {backgroundColor:'#1D3C58'})]} 
                        onPress={confirmAction}
                    >
                        <Text style={styles.modalBtnTextConfirm}>Confirmar</Text>
                    </TouchableOpacity>
                </View>
            </View>
            </View>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F6F9FC' },
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1, backgroundColor: 'rgba(23, 42, 58, 0.85)' },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  backButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  screenTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  scrollContent: { padding: 20, paddingBottom: 50, alignItems: 'center' },

  // CARD PRINCIPAL
  card: {
    width: '100%', maxWidth: 500,
    backgroundColor: 'white', borderRadius: 24, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10
  },

  groupHeader: { alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  courseTitle: { fontSize: 20, fontWeight: 'bold', color: '#1D3C58', textAlign: 'center', marginBottom: 8 },
  badge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 13, color: '#64748B', fontWeight: '600' },

  divider: { height: 1, backgroundColor: '#E2E8F0', width: '100%', marginBottom: 20 },

  section: { marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 8, letterSpacing: 0.5 },
  valueLarge: { fontSize: 18, color: '#334155', fontWeight: '600' },

  // MEMBROS
  membersContainer: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 10 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingHorizontal: 5 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarAdmin: { backgroundColor: '#1D3C58' },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#334155' },
  memberEmail: { fontSize: 13, color: '#94A3B8' },

  // BOTÕES
  actionButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 16, marginTop: 10 },
  joinButton: { backgroundColor: '#1D3C58', shadowColor: "#1D3C58", shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  leaveButton: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  deleteButton: { backgroundColor: '#DC2626' },
  btnText: { fontSize: 16, fontWeight: 'bold' },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 380, backgroundColor: 'white', borderRadius: 24, padding: 24, alignItems: 'center' },
  modalIconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  modalMessage: { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', width: '100%', gap: 12 },
  modalBtnCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  modalBtnConfirm: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnTextCancel: { color: '#475569', fontWeight: '600' },
  modalBtnTextConfirm: { color: 'white', fontWeight: '600' }
});