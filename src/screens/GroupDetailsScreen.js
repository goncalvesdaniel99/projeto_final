import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, 
  ActivityIndicator, ScrollView, SafeAreaView, Platform, Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export default function GroupDetailsScreen({ route, navigation }) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Estados do Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState(null); // 'leave', 'delete', 'join'

  // Recuperação do ID
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
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // --- LÓGICA DO BOTÃO ---
  function handleButtonPress() {
    if (!group || !currentUserId) return;

    // Verificar se sou membro
    const isMember = group.membros.some(m => String(m._id) === String(currentUserId));
    
    // Verificar se sou admin
    const creatorId = group.criador?._id || group.criador;
    const isAdmin = String(creatorId) === String(currentUserId);

    if (!isMember) {
        setActionType('join');
    } else if (isAdmin) {
        setActionType('delete');
    } else {
        setActionType('leave');
    }
    
    setModalVisible(true);
  }

  async function confirmAction() {
    const targetId = group?._id || navigationGroupId;
    setModalVisible(false);

    if (actionType === 'join') {
        await joinGroup(targetId);
    } else if (actionType === 'delete') {
        await deleteGroup(targetId);
    } else {
        await leaveGroup(targetId);
    }
  }

  // --- AÇÃO DE JUNTAR ---
  async function joinGroup(targetId) {
    try {
      let token = await AsyncStorage.getItem('token');
      if(token) token = token.replace(/^"|"$/g, '');

      const res = await fetch(`${API_BASE_URL}/groups/join/${targetId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        if (Platform.OS === 'web') alert("Entraste no grupo!");
        else Alert.alert("Sucesso", "Agora fazes parte do grupo!");
        
        // 🔥 CORREÇÃO: Usa navigate em vez de reset para não perderes o menu
        navigation.navigate('MyGroups'); 
      } else {
        Alert.alert("Erro", "Não foi possível entrar.");
      }
    } catch (e) { console.error(e); }
  }

  async function deleteGroup(targetId) {
    try {
      let token = await AsyncStorage.getItem('token');
      if(token) token = token.replace(/^"|"$/g, '');

      const res = await fetch(`${API_BASE_URL}/groups/${targetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        // 🔥 CORREÇÃO: Volta para a Home sem destruir a navegação
        navigation.navigate('Home');
      } else { Alert.alert("Erro", "Não foi possível eliminar."); }
    } catch (e) { console.error(e); }
  }

  async function leaveGroup(targetId) {
    try {
      let token = await AsyncStorage.getItem('token');
      if(token) token = token.replace(/^"|"$/g, '');

      const res = await fetch(`${API_BASE_URL}/groups/leave/${targetId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        // 🔥 CORREÇÃO: Volta para a Home sem destruir a navegação
        navigation.navigate('Home');
      } else { Alert.alert("Erro", "Não foi possível sair."); }
    } catch (e) { console.error(e); }
  }

  if (loading) return <ActivityIndicator size="large" color="#1D3C58" style={{marginTop:50}} />;
  if (!group) return <Text style={{textAlign:'center', marginTop:50}}>Grupo não encontrado.</Text>;

  // Recálculo para renderização do UI
  const isMember = group.membros.some(m => String(m._id) === String(currentUserId));
  const creatorId = group.criador?._id || group.criador;
  const isAdmin = String(creatorId) === String(currentUserId);

  let btnStyle = styles.joinButton;
  let btnText = "Juntar-se ao Grupo";

  if (isMember) {
      if (isAdmin) {
          btnStyle = styles.deleteButton;
          btnText = "Eliminar Grupo";
      } else {
          btnStyle = styles.leaveButton;
          btnText = "Sair do Grupo";
      }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.headerCard}>
          <Ionicons name="school" size={40} color="#1D3C58" style={{ marginBottom: 10 }} />
          <Text style={styles.courseTitle}>{group.curso}</Text>
          <Text style={styles.degreeText}>{group.grau} • {group.ano}º Ano</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Disciplina</Text>
          <View style={styles.infoBox}>
            <Text style={styles.value}>{group.disciplina}</Text>
          </View>
        </View>

        <View style={styles.section}>
            <Text style={styles.label}>Membros ({group.membros.length}/{group.maxPessoas})</Text>
            <View style={styles.membersList}>
                {group.membros.map((m, i) => (
                <View key={i} style={styles.memberRow}>
                    <View style={styles.avatar}>
                        <Text style={{color:'white', fontWeight:'bold'}}>
                            {m.nome ? m.nome.charAt(0).toUpperCase() : '?'}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.memberName}>
                            {m.nome}
                            {String(m._id) === String(creatorId) && 
                                <Text style={{color:'#FBC02D', fontWeight:'bold', fontSize:12}}> ⭐ Admin</Text>
                            }
                        </Text>
                        <Text style={styles.memberEmail}>{m.email}</Text>
                    </View>
                </View>
                ))}
            </View>
        </View>

        <TouchableOpacity 
            style={[styles.actionButton, btnStyle]} 
            onPress={handleButtonPress}
        >
          <Text style={[styles.btnText, isAdmin && isMember ? {color:'white'} : (isMember ? {color:'#D32F2F'} : {color:'white'})]}>
            {btnText}
          </Text>
        </TouchableOpacity>

      </ScrollView>

      {/* --- MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
                <Ionicons 
                    name={actionType === 'delete' ? "warning" : (actionType === 'join' ? "people" : "exit-outline")} 
                    size={40} 
                    color={actionType === 'delete' ? "#D32F2F" : (actionType === 'join' ? "#4CAF50" : "#1D3C58")} 
                />
            </View>
            
            <Text style={styles.modalTitle}>
                {actionType === 'delete' ? "Eliminar Grupo?" : (actionType === 'join' ? "Entrar no Grupo?" : "Sair do Grupo?")}
            </Text>
            
            <Text style={styles.modalMessage}>
                {actionType === 'delete' 
                    ? "Esta ação irá apagar o grupo permanentemente."
                    : (actionType === 'join' ? "Queres juntar-te a este grupo de estudo?" : "Queres mesmo sair deste grupo?")
                }
            </Text>

            <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setModalVisible(false)}>
                    <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[
                        styles.modalBtn, 
                        actionType === 'delete' ? styles.modalBtnDelete : (actionType === 'join' ? styles.modalBtnJoin : styles.modalBtnConfirm)
                    ]} 
                    onPress={confirmAction}
                >
                    <Text style={styles.modalBtnTextConfirm}>
                        {actionType === 'delete' ? "Eliminar" : (actionType === 'join' ? "Entrar" : "Sair")}
                    </Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F9FC' },
  scrollContent: { padding: 20 },
  headerCard: { backgroundColor: 'white', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 20, elevation:2 },
  courseTitle: { fontSize: 18, fontWeight: 'bold', color: '#1D3C58', textAlign:'center' },
  degreeText: { color: '#666', marginTop: 5 },
  section: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color:'#333', marginLeft: 4 },
  infoBox: { backgroundColor: 'white', padding: 15, borderRadius: 10, borderWidth:1, borderColor:'#eee' },
  value: { fontSize: 16, color: '#1D3C58', fontWeight:'500' },
  membersList: { backgroundColor: 'white', borderRadius: 12, padding: 5 },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1D3C58', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberName: { fontWeight: '600', color: '#333' },
  memberEmail: { fontSize: 12, color: '#999' },
  
  actionButton: { padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  joinButton: { backgroundColor: '#4CAF50' },
  leaveButton: { backgroundColor: '#FFEBEE' },
  deleteButton: { backgroundColor: '#D32F2F' }, 
  btnText: { fontWeight: 'bold', fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 5 },
  modalIcon: { marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  modalMessage: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 25 },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  modalBtnCancel: { backgroundColor: '#F0F0F0' },
  modalBtnConfirm: { backgroundColor: '#1D3C58' },
  modalBtnDelete: { backgroundColor: '#D32F2F' },
  modalBtnJoin: { backgroundColor: '#4CAF50' },
  modalBtnTextCancel: { color: '#333', fontWeight: 'bold' },
  modalBtnTextConfirm: { color: 'white', fontWeight: 'bold' }
});