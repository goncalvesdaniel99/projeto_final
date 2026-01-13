import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, 
  Platform, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Alert,
  Linking, Image, Modal 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons'; 
import * as DocumentPicker from 'expo-document-picker'; 

export default function ChatScreen({ route, navigation }) {
  const { groupId, groupName } = route.params || {};
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  const [myId, setMyId] = useState(null);
  const [myName, setMyName] = useState("Eu");
  
  // --- ESTADOS PARA AGENDAMENTO DE REUNIÃO ---
  const [modalVisible, setModalVisible] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  
  const flatListRef = useRef(); 

  const getApiUrl = () => {
    if (Platform.OS === 'web') return "http://localhost:3000";
    if (Platform.OS === 'android') return "http://10.0.2.2:3000"; 
    return "http://localhost:3000"; 
  };
  const BASE_URL = getApiUrl();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: groupName || "Chat",
      headerRight: () => (
        <TouchableOpacity 
          style={{ marginRight: 15 }}
          onPress={() => navigation.navigate('GroupInfo', { groupId, groupName })}
        >
          <Ionicons name="information-circle-outline" size={28} color="#1D3C58" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, groupId, groupName]);

  useEffect(() => {
    const getUserData = async () => {
        try {
            let id = Platform.OS === 'web' ? localStorage.getItem('userId') : await AsyncStorage.getItem('userId');
            let nome = Platform.OS === 'web' ? localStorage.getItem('userName') : await AsyncStorage.getItem('userName');
            if(id) id = id.replace(/^"|"$/g, '');
            if(nome) nome = nome.replace(/^"|"$/g, '');
            setMyId(id);
            if(nome) setMyName(nome);
        } catch (e) { console.log(e); }
    };
    getUserData();
  }, []);

  const fetchMessages = async () => {
    if (!groupId) return;
    try {
      let token = Platform.OS === 'web' ? localStorage.getItem('token') : await AsyncStorage.getItem('token');
      if(token) token = token.replace(/^"|"$/g, '');

      const res = await fetch(`${BASE_URL}/messages/${groupId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) { 
        console.log("Erro ao buscar mensagens:", error); 
    } finally { 
        setLoading(false); 
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000); 
    return () => clearInterval(interval);
  }, [groupId]);

  // --- FUNÇÃO DE AGENDAR REUNIÃO ---
  const handleScheduleMeeting = async () => {
    if (!meetingDate || !meetingLocation) {
        Alert.alert("Erro", "Preenche a Data e a Localização.");
        return;
    }
    
    if (!groupId) {
        Alert.alert("Erro", "ID do Grupo não encontrado.");
        return;
    }

    try {
        let token = Platform.OS === 'web' ? localStorage.getItem('token') : await AsyncStorage.getItem('token');
        if(token) token = token.replace(/^"|"$/g, '');

        // Criar a reunião no Backend
        const res = await fetch(`${BASE_URL}/meetings`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                groupId: groupId,
                startsAt: meetingDate, 
                location: meetingLocation,
                notes: meetingNotes
            })
        });

        if (res.ok) {
            // Sucesso: Enviar mensagem para o chat
            const msgTexto = `📅 Nova Reunião Agendada!\n\n🕒 ${meetingDate}\n📍 ${meetingLocation}\n📝 ${meetingNotes || "Sem notas"}`;
            
            await fetch(`${BASE_URL}/messages/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ groupId, texto: msgTexto })
            });

            Alert.alert("Sucesso", "Reunião criada!");
            setModalVisible(false);
            setMeetingDate(""); setMeetingLocation(""); setMeetingNotes("");
            fetchMessages(); 
        } else {
            const errData = await res.json();
            Alert.alert("Erro", errData.error || "Não foi possível criar a reunião.");
        }
    } catch (e) {
        Alert.alert("Erro", "Falha na conexão.");
        console.error(e);
    }
  };
  
  const openScheduleModal = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16).replace("T", " ");
    
    setMeetingDate(localISOTime);
    setModalVisible(true);
  };

  // --- RESTO DAS FUNÇÕES (UPLOAD, MENSAGENS) ---
  const uploadFile = async (file) => {
    setIsUploading(true);
    try {
      let token = Platform.OS === 'web' ? localStorage.getItem('token') : await AsyncStorage.getItem('token');
      if(token) token = token.replace(/^"|"$/g, '');
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        formData.append('file', blob, file.name || 'upload.jpg');
      } else {
        let uri = file.uri;
        if (Platform.OS === 'android' && !uri.startsWith('file://')) uri = 'file://' + uri;
        formData.append('file', { uri: uri, name: file.name, type: file.mimeType || 'application/octet-stream' });
      }
      formData.append('groupId', groupId);
      formData.append('type', 'file');

      const res = await fetch(`${BASE_URL}/messages/upload`, {
        method: "POST", headers: { "Authorization": `Bearer ${token}` }, body: formData
      });
      if (res.ok) fetchMessages(); 
      else alert("Erro no upload.");
    } catch (error) { alert("Erro de conexão."); } finally { setIsUploading(false); }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled) {
        const file = result.assets[0];
        if (Platform.OS === 'web') { if (window.confirm(`Enviar ${file.name}?`)) uploadFile(file); } 
        else { Alert.alert("Confirmar", `Enviar ${file.name}?`, [{ text: "Cancelar", style: "cancel" }, { text: "Enviar", onPress: () => uploadFile(file) }]); }
      }
    } catch (err) {}
  };

  const handleOpenFile = (fileUrl) => {
    if (!fileUrl) return;
    let cleanPath = fileUrl.replace(/\\/g, "/"); 
    if (cleanPath.startsWith("/")) cleanPath = cleanPath.substring(1);
    const fullUrl = `${BASE_URL}/${cleanPath}`;
    if (Platform.OS === 'web') window.open(fullUrl, '_blank');
    else Linking.openURL(fullUrl).catch(()=>Alert.alert("Erro", "Link inválido"));
  };

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    const txt = inputText; setInputText(""); 
    try {
      let token = Platform.OS === 'web' ? localStorage.getItem('token') : await AsyncStorage.getItem('token');
      if(token) token = token.replace(/^"|"$/g, '');
      await fetch(`${BASE_URL}/messages/send`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ groupId, texto: txt })
      });
      fetchMessages(); 
    } catch (e) {}
  };

  const renderItem = ({ item }) => {
    if (!item) return null;
    const senderData = item.sender || item.autor; 
    const isMe = String(senderData?._id || senderData) === String(myId);
    const texto = item.text || "";
    const nome = senderData?.nome || "Desconhecido";
    const isFile = item.type === 'file' || item.fileUrl || texto.includes("📎");
    let fullImgUrl = null; let isImage = false;
    
    if (item.fileUrl) {
        const cleanPath = item.fileUrl.replace(/\\/g, "/");
        fullImgUrl = `${BASE_URL}/${cleanPath.startsWith("/") ? cleanPath.substring(1) : cleanPath}`;
        isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(cleanPath);
    }

    return (
        <View style={{
            alignSelf: isMe ? 'flex-end' : 'flex-start',
            backgroundColor: isMe ? '#1D3C58' : '#E5E5EA',
            padding: 10, marginVertical: 5, borderRadius: 10, maxWidth: '80%'
        }}>
            {!isMe && <Text style={{fontSize: 11, color: '#666', fontWeight:'bold', marginBottom: 2}}>{nome}</Text>}
            {isFile ? (
               <TouchableOpacity onPress={() => handleOpenFile(item.fileUrl)}>
                 {isImage && fullImgUrl ? (
                    <View>
                        <Image source={{ uri: fullImgUrl }} style={{ width: 200, height: 150, borderRadius: 8, marginBottom: 5 }} resizeMode="cover"/>
                        <Text style={{color: isMe ? '#EEE' : '#555', fontSize: 10, textAlign:'center'}}>{texto.replace("📎 ", "")}</Text>
                    </View>
                 ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="document-text" size={30} color={isMe ? "#FFD700" : "#E63946"} />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={{color: isMe ? 'white' : 'black', textDecorationLine: 'underline', fontWeight: 'bold'}}>{texto.replace("📎 ", "")}</Text>
                            <Text style={{color: isMe ? '#EEE' : '#555', fontSize: 10}}>Toque para abrir</Text>
                        </View>
                    </View>
                 )}
               </TouchableOpacity>
            ) : (
               <Text style={{color: isMe ? 'white' : 'black', fontSize: 16}}>{texto}</Text>
            )}
        </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F9FC' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1 }}>
            {loading ? <ActivityIndicator size="large" color="#1D3C58" style={{marginTop:20}} /> : 
            <FlatList 
                ref={flatListRef} 
                
                // --- MÁGICA DO WHATSAPP: INVERTER A LISTA ---
                inverted={true}
                // Invertemos os dados também para a última mensagem ser a primeira (fundo)
                data={[...messages].reverse()} 
                
                keyExtractor={i => i._id || Math.random().toString()} 
                renderItem={renderItem} 
                contentContainerStyle={{ padding: 15 }} 
                
                // Mantém a posição visual ao abrir teclado
                maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            />}
        </View>

        {/* INPUT AREA */}
        <View style={styles.inputContainer}>
            <TextInput style={styles.input} value={inputText} onChangeText={setInputText} placeholder="Mensagem..." multiline />
            
            {/* BOTÃO CALENDÁRIO */}
            <TouchableOpacity onPress={openScheduleModal} style={styles.iconButton}>
                <Ionicons name="calendar-outline" size={28} color="#1D3C58" />
            </TouchableOpacity>

            {isUploading ? <ActivityIndicator size="small" color="#1D3C58" style={{margin:10}}/> : 
            <TouchableOpacity onPress={handlePickDocument} style={styles.iconButton}><Ionicons name="attach" size={28} color="#1D3C58"/></TouchableOpacity>}
            
            <TouchableOpacity onPress={handleSendText} style={styles.iconButton}><Ionicons name="send" size={24} color="#1D3C58"/></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* MODAL DE AGENDAMENTO */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agendar Reunião</Text>
            <Text style={{textAlign:'center', marginBottom:10, color:'#666'}}>Grupo: {groupName}</Text>

            <Text style={styles.label}>Data e Hora (AAAA-MM-DD HH:MM):</Text>
            <TextInput style={styles.modalInput} value={meetingDate} onChangeText={setMeetingDate} placeholder="2026-01-20 14:30" />

            <Text style={styles.label}>Localização / Link:</Text>
            <TextInput style={styles.modalInput} value={meetingLocation} onChangeText={setMeetingLocation} placeholder="Sala 1 ou Zoom Link" />

            <Text style={styles.label}>Notas (Opcional):</Text>
            <TextInput style={styles.modalInput} value={meetingNotes} onChangeText={setMeetingNotes} placeholder="Tópicos..." />

            <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.btn, styles.btnCancel]}>
                    <Text style={{color:'#333'}}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleScheduleMeeting} style={[styles.btn, styles.btnConfirm]}>
                    <Text style={{color:'white', fontWeight:'bold'}}>Confirmar</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: 'white', alignItems: 'center', borderTopWidth: 1, borderColor: '#ddd' },
  input: { flex: 1, minHeight: 40, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, marginRight: 10 },
  iconButton: { padding: 5, marginLeft: 2 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5, textAlign: 'center', color: '#1D3C58' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#666', marginTop: 10, marginBottom: 5 },
  modalInput: { backgroundColor: '#F0F0F0', borderRadius: 8, padding: 10, fontSize: 14 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  btnCancel: { backgroundColor: '#eee' },
  btnConfirm: { backgroundColor: '#1D3C58' },
});