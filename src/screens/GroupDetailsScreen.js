import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, 
  ActivityIndicator, ScrollView, SafeAreaView, Platform, Modal, ImageBackground, StatusBar, Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

// Imagem temática para o fundo do card
const CARD_BG_IMAGE = { uri: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?q=80&w=2070&auto=format&fit=crop" };

export default function GroupDetailsScreen({ route, navigation }) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState(null); // 'leave', 'delete', 'join'

  const { group: paramGroup, id: paramId } = route.params || {};
  const navigationGroupId = paramId || paramGroup?._id || paramGroup?.id;

  useEffect(() => {
    navigation.setOptions({ headerShown: false }); // Remove o header nativo (evita as duas setas)
    fetchData();
  }, [navigation]);

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
        <StatusBar barStyle="dark-content" />
        
        {/* GRADIENTE DE FUNDO CONSISTENTE */}
        <LinearGradient 
            colors={['#E2E8F0', '#F8FAFC', '#F1F5F9']} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
        />

        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
                    <Ionicons name="arrow-back" size={22} color="#1D3C58" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Detalhes</Text>
                <View style={{width: 40}} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.centeredWrapper}>
                    {/* CARTÃO PRINCIPAL COM FUNDO DE IMAGEM SUBTIL */}
                    <ImageBackground 
                        source={CARD_BG_IMAGE} 
                        style={styles.card} 
                        imageStyle={{ borderRadius: 24, opacity: 0.1 }}
                    >
                        <View style={styles.cardInner}>
                            {/* Cabeçalho do Grupo */}
                            <View style={styles.groupHeader}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="school" size={30} color="#795548" />
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
                                <View style={styles.memberHeader}>
                                    <Text style={styles.label}>MEMBROS ({group.membros.length}/{group.maxPessoas})</Text>
                                    {group.membros.length >= group.maxPessoas && (
                                        <Text style={styles.fullBadge}>CHEIO</Text>
                                    )}
                                </View>
                                
                                <View style={styles.membersList}>
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
                                                        {m.nome} {isCreator && <Ionicons name="star" size={12} color="#795548" />}
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
                                <Ionicons name={btnIcon} size={20} color="white" style={{marginRight:8}} />
                                <Text style={styles.btnText}>{btnText}</Text>
                            </TouchableOpacity>
                        </View>
                    </ImageBackground>
                </View>
            </ScrollView>
        </SafeAreaView>

        {/* MODAL DE CONFIRMAÇÃO */}
        <Modal animationType="fade" transparent={true} visible={modalVisible}>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
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
                    
                    <Text style={styles.modalSubtitle}>
                        {actionType === 'delete' 
                            ? "Tens a certeza? Esta ação não pode ser desfeita."
                            : (actionType === 'join' ? "Queres participar neste grupo de estudo?" : "Vais deixar de ter acesso ao chat deste grupo.")
                        }
                    </Text>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalVisible(false)}>
                            <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.modalBtnConfirm, actionType === 'delete' ? {backgroundColor:'#D32F2F'} : {backgroundColor:'#1D3C58'}]} 
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 20, marginVertical: 15, alignSelf: 'center', width: '100%', maxWidth: 600
  },
  backCircle: { 
    width: 38, height: 38, backgroundColor: '#FFF', borderRadius: 19, 
    alignItems: 'center', justifyContent: 'center', elevation: 3, shadowOpacity: 0.1, shadowRadius: 5
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1D3C58' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, alignItems: 'center', paddingTop: 10 },
  centeredWrapper: { width: '100%', maxWidth: 500 },

  card: {
    backgroundColor: 'white', borderRadius: 24, overflow: 'hidden',
    elevation: 8, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 15
  },
  cardInner: { padding: 24, backgroundColor: 'rgba(255, 255, 255, 0.9)' },

  groupHeader: { alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(121, 85, 72, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  courseTitle: { fontSize: 19, fontWeight: '800', color: '#1D3C58', textAlign: 'center', marginBottom: 8 },
  badge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 12, color: '#64748B', fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#E2E8F0', width: '100%', marginBottom: 20 },

  section: { marginBottom: 24 },
  label: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginBottom: 8, letterSpacing: 1 },
  valueLarge: { fontSize: 18, color: '#334155', fontWeight: '700' },
  memberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  fullBadge: { color: '#D32F2F', fontSize: 11, fontWeight: '900' },

  membersList: { backgroundColor: '#F8FAFC', borderRadius: 18, padding: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarAdmin: { backgroundColor: '#795548' },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  memberName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  memberEmail: { fontSize: 12, color: '#94A3B8' },

  actionButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, borderRadius: 14, marginTop: 10 },
  joinButton: { backgroundColor: '#1D3C58' },
  leaveButton: { backgroundColor: '#795548' }, // Usando o castanho para o botão de sair (diferencia do erro)
  deleteButton: { backgroundColor: '#DC2626' },
  btnText: { fontSize: 16, fontWeight: 'bold', color: 'white' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  modalCard: { backgroundColor: '#FFF', width: '90%', maxWidth: 360, borderRadius: 25, padding: 25, alignItems: 'center' },
  modalIconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1D3C58', marginBottom: 8 },
  modalSubtitle: { color: '#718096', textAlign: 'center', marginBottom: 25, fontSize: 14 },
  modalFooter: { flexDirection: 'row', gap: 10, width: '100%' },
  modalBtnCancel: { flex: 1, height: 48, backgroundColor: '#F1F5F9', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnConfirm: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnTextCancel: { color: '#64748B', fontWeight: 'bold' },
  modalBtnTextConfirm: { color: 'white', fontWeight: 'bold' }
});