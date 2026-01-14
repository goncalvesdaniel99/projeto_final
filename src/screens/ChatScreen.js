import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, createElement, useMemo } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, 
  Platform, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, 
  Linking, Modal, ImageBackground, ScrollView 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons'; 
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

const CHAT_BG = { uri: "https://i.pinimg.com/originals/85/ec/df/85ecdf1c3611ecc9b7fa85282d9526e0.png" };

// --- COMPONENTE DROPDOWN COM AUTO-SCROLL ---
const CustomWebDropdown = ({ options, value, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef(null);
  const itemRefs = useRef({}); // Guarda as refs de cada item da lista

  // 🔥 Efeito para dar Scroll Automático ao abrir
  useEffect(() => {
    if (isOpen) {
      // Pequeno delay para garantir que o ScrollView já foi renderizado
      setTimeout(() => {
        const selectedItem = itemRefs.current[value];
        if (selectedItem && selectedItem.scrollIntoView) {
          selectedItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 50);
    }
  }, [isOpen, value]);

  return (
    <View style={{ flex: 1, zIndex: isOpen ? 9999 : 1 }}>
      <TouchableOpacity style={styles.webDropTrigger} onPress={() => setIsOpen(!isOpen)}>
        <Text style={styles.webDropValue}>{value}</Text>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={14} color="#1D3C58" />
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.webDropMenu}>
          <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true} ref={scrollRef}>
            {options.map((opt) => (
              <TouchableOpacity 
                key={opt} 
                // Atribui a ref para podermos dar scroll até este item
                ref={el => itemRefs.current[opt] = el}
                style={[styles.webDropItem, value === opt && styles.webDropItemSelected]} 
                onPress={() => { onSelect(opt); setIsOpen(false); }}
              >
                <Text style={[styles.webDropItemText, value === opt && { fontWeight: 'bold', color: 'white' }]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default function ChatScreen({ route, navigation }) {
  const { group, groupId, groupName, groupData } = route.params || {}; 
  const finalGroupId = groupId || group?._id || groupData?._id;
  const finalGroupName = groupName || group?.disciplina || groupData?.disciplina || "Chat";
  const finalGroupData = group || groupData || { _id: finalGroupId, disciplina: finalGroupName };

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [myId, setMyId] = useState(null);
  const [nextMeeting, setNextMeeting] = useState(null);

  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState('date'); 

  const [fileModalVisible, setFileModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: "", message: "", type: "success" });
  
  const flatListRef = useRef(); 
  const BASE_URL = Platform.OS === 'android' ? "http://10.0.2.2:3000" : "http://localhost:3000";

  const hourOptions = useMemo(() => Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')), []);
  const minuteOptions = ["00", "15", "30", "45"];

  useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  useEffect(() => {
    const getUserData = async () => {
        try {
            let id = await AsyncStorage.getItem('userId');
            if(id) setMyId(id.replace(/^"|"$/g, ''));
        } catch (e) { console.log(e); }
    };
    getUserData();
  }, []);

  // Garante que a hora está correta ao abrir o modal
  useEffect(() => {
    if (scheduleModalVisible) setDate(new Date());
  }, [scheduleModalVisible]);

  const fetchMessages = async () => {
    if (!finalGroupId) return;
    try {
      let token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/messages/${finalGroupId}`, {
        headers: { "Authorization": `Bearer ${token?.replace(/^"|"$/g, '')}` }
      });
      if (res.ok) setMessages(await res.json());
    } catch (error) { console.log(error); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); 
    return () => clearInterval(interval);
  }, [finalGroupId]);

  useFocusEffect(useCallback(() => { if (finalGroupId) fetchNextMeeting(); }, [finalGroupId]));

  const fetchNextMeeting = async () => {
    try {
      let token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/meetings/${finalGroupId}`, { headers: { Authorization: `Bearer ${token?.replace(/^"|"$/g, '')}` } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const now = new Date();
          const upcoming = data.filter(m => {
             const dateStr = m.startsAt || (m.date && m.time ? `${m.date}T${m.time}:00` : null);
             return dateStr && new Date(dateStr) >= now;
          });
          setNextMeeting(upcoming.length > 0 ? upcoming[0] : null);
        } else setNextMeeting(null);
      }
    } catch (e) { console.log(e); }
  };

  const handleScheduleMeeting = async () => {
    if (!meetingLocation) { showAlert("Campo Vazio", "Indica o Local.", "error"); return; }
    if (date < new Date()) { showAlert("Data Inválida", "Não podes agendar reuniões para o passado!", "error"); return; }

    const datePart = date.toISOString().split('T')[0];
    const timePart = `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
    
    try {
        let token = await AsyncStorage.getItem('token');
        const tokenClean = token?.replace(/^"|"$/g, '');
        const res = await fetch(`${BASE_URL}/meetings/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenClean}` },
            body: JSON.stringify({ groupId: finalGroupId, date: datePart, time: timePart, location: meetingLocation, notes: meetingNotes })
        });
        if (res.ok) {
            const msgTexto = `📅 Nova Reunião Agendada!\n\n🕒 ${datePart} às ${timePart}\n📍 ${meetingLocation}\n📝 ${meetingNotes || "Sem notas"}`;
            await fetch(`${BASE_URL}/messages/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenClean}` },
                body: JSON.stringify({ groupId: finalGroupId, texto: msgTexto })
            });
            setScheduleModalVisible(false);
            setMeetingLocation(""); setMeetingNotes("");
            fetchMessages(); fetchNextMeeting();
            showAlert("Sucesso", "Reunião agendada!");
        }
    } catch (e) { showAlert("Erro", "Falha na conexão.", "error"); }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled) { setSelectedFile(result.assets[0]); setFileModalVisible(true); }
    } catch (err) { console.log(err); }
  };

  const confirmUpload = async () => {
    setFileModalVisible(false);
    setIsUploading(true);
    try {
      let token = await AsyncStorage.getItem('token');
      const formData = new FormData();
      formData.append('groupId', finalGroupId);
      formData.append('type', 'file');
      if (Platform.OS === 'web') {
        const response = await fetch(selectedFile.uri);
        formData.append('file', await response.blob(), selectedFile.name);
      } else {
        formData.append('file', { uri: selectedFile.uri, name: selectedFile.name, type: selectedFile.mimeType });
      }
      await fetch(`${BASE_URL}/messages/upload`, {
        method: "POST", headers: { "Authorization": `Bearer ${token?.replace(/^"|"$/g, '')}` }, body: formData
      });
      fetchMessages();
    } catch (e) { showAlert("Erro", "Falha no upload.", "error"); } 
    finally { setIsUploading(false); setSelectedFile(null); }
  };

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    const txt = inputText; setInputText(""); 
    try {
      let token = await AsyncStorage.getItem('token');
      await fetch(`${BASE_URL}/messages/send`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token?.replace(/^"|"$/g, '')}` },
        body: JSON.stringify({ groupId: finalGroupId, texto: txt })
      });
      fetchMessages(); 
    } catch (e) {}
  };

  const handleOpenFile = (url) => Linking.openURL(`${BASE_URL}/${url.replace(/\\/g, "/").replace(/^\//, "")}`);

  const showAlert = (title, message, type = "success") => {
      setAlertConfig({ title, message, type });
      setAlertVisible(true);
  };

  const renderItem = ({ item }) => {
    const sender = item.sender || item.autor; 
    const isMe = String(sender?._id || sender) === String(myId);
    const texto = item.text || "";
    const isFile = item.type === 'file' || item.fileUrl || texto.includes("📎");
    
    return (
        <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
            {!isMe && <View style={styles.avatar}><Text style={styles.avatarText}>{sender?.nome?.charAt(0).toUpperCase() || "?"}</Text></View>}
            <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                {!isMe && <Text style={styles.senderName}>{sender?.nome || "Utilizador"}</Text>}
                {isFile ? (
                   <TouchableOpacity onPress={() => handleOpenFile(item.fileUrl)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="document-text" size={24} color={isMe ? "white" : "#E63946"} />
                            <Text style={[styles.fileText, {color: isMe ? 'white' : '#333'}]}>{texto.replace("📎 ", "") || "Ver Ficheiro"}</Text>
                        </View>
                   </TouchableOpacity>
                ) : <Text style={[styles.msgText, {color: isMe ? 'white' : '#333'}]}>{texto}</Text>}
                <Text style={[styles.timeText, {color: isMe ? 'rgba(255,255,255,0.6)' : '#999'}]}>{new Date(item.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Text>
            </View>
        </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F9FC' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#1D3C58" /></TouchableOpacity>
        <View style={{alignItems:'center'}}><Text style={styles.headerTitle}>{finalGroupName}</Text></View>
        <TouchableOpacity onPress={() => navigation.navigate('GroupDetails', { group: finalGroupData, id: finalGroupId })}><Ionicons name="ellipsis-vertical" size={24} color="#1D3C58" /></TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ImageBackground source={CHAT_BG} style={{flex:1}} imageStyle={{opacity:0.4}}>
            <View style={{ flex: 1 }}>
                {loading ? <ActivityIndicator size="large" color="#1D3C58" style={{marginTop:20}} /> : 
                <FlatList ref={flatListRef} inverted data={[...messages].reverse()} keyExtractor={i => i._id} renderItem={renderItem} contentContainerStyle={{ padding: 15 }} />}
            </View>
            
            <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                    <TextInput 
                        style={styles.input} 
                        value={inputText} 
                        onChangeText={setInputText} 
                        placeholder="Mensagem..." 
                        multiline={true}
                        onSubmitEditing={handleSendText}
                        onKeyPress={(e) => { if(Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                        outlineStyle="none"
                    />
                    <View style={{flexDirection:'row', alignItems:'center', gap: 8, marginRight: 8}}>
                        <TouchableOpacity onPress={handlePickDocument}>
                            {isUploading ? <ActivityIndicator size="small" /> : <Ionicons name="attach" size={28} color="#555" />}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setScheduleModalVisible(true)}>
                            <Ionicons name="calendar-outline" size={26} color="#555" />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={handleSendText} style={styles.sendBtn}><Ionicons name="send" size={20} color="white" /></TouchableOpacity>
                </View>
            </View>
        </ImageBackground>
      </KeyboardAvoidingView>

      {/* MODAL AGENDAR REUNIÃO */}
      <Modal visible={scheduleModalVisible} animationType="slide" transparent={true} onRequestClose={() => setScheduleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agendar Reunião</Text>
            
            <Text style={styles.label}>Data:</Text>
            {Platform.OS === 'web' ? (
                createElement('input', { type: 'date', value: date.toISOString().split('T')[0], onChange: (e) => { const [y,m,d] = e.target.value.split('-').map(Number); const nd = new Date(date); nd.setFullYear(y,m-1,d); setDate(nd); }, style: styles.webDateInput })
            ) : <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.dateBtn}><Text>{date.toLocaleDateString()}</Text></TouchableOpacity>}

            <Text style={styles.label}>Hora:</Text>
            <View style={{flexDirection:'row', alignItems:'center', gap: 10, zIndex: 1000}}>
                <CustomWebDropdown 
                    options={hourOptions} 
                    value={String(date.getHours()).padStart(2,'0')} 
                    onSelect={(h) => { const nd = new Date(date); nd.setHours(parseInt(h)); setDate(nd); }} 
                />
                <Text style={{fontWeight:'bold'}}>:</Text>
                <CustomWebDropdown 
                    options={minuteOptions} 
                    value={String(Math.floor(date.getMinutes() / 5) * 5).padStart(2,'0')} 
                    onSelect={(m) => { const nd = new Date(date); nd.setMinutes(parseInt(m)); setDate(nd); }} 
                />
            </View>

            <Text style={styles.label}>Local:</Text>
            <TextInput style={styles.modalInput} value={meetingLocation} onChangeText={setMeetingLocation} placeholder="Sala ou Link..." />
            
            <Text style={styles.label}>Notas da Reunião:</Text>
            <TextInput style={styles.modalInput} value={meetingNotes} onChangeText={setMeetingNotes} placeholder="Tópicos a discutir..." />

            <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setScheduleModalVisible(false)} style={[styles.btn, styles.btnCancel]}><Text>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleScheduleMeeting} style={[styles.btn, styles.btnConfirm]}><Text style={{color:'white'}}>Agendar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL FICHEIRO */}
      <Modal visible={fileModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="cloud-upload-outline" size={50} color="#1D3C58" style={{marginBottom:10}} />
            <Text style={styles.modalTitle}>Enviar Ficheiro?</Text>
            <Text style={{textAlign:'center', color:'#666', marginBottom:20}}>{selectedFile?.name}</Text>
            <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setFileModalVisible(false)} style={[styles.btn, styles.btnCancel]}><Text>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={confirmUpload} style={[styles.btn, styles.btnConfirm]}><Text style={{color:'white'}}>Enviar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ALERTAS */}
      <Modal visible={alertVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
            <Ionicons name={alertConfig.type === 'error' ? "alert-circle" : "checkmark-circle"} size={40} color={alertConfig.type === 'error' ? "#D32F2F" : "#4CAF50"} />
            <Text style={styles.modalTitle}>{alertConfig.title}</Text>
            <Text style={{textAlign:'center', marginBottom:20}}>{alertConfig.message}</Text>
            <TouchableOpacity onPress={() => setAlertVisible(false)} style={[styles.btn, styles.btnConfirm, {width:'100%'}]}><Text style={{color:'white'}}>OK</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent:'space-between', paddingHorizontal: 15, backgroundColor: 'white', elevation: 4 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1D3C58' },
  msgRow: { flexDirection: 'row', marginBottom: 12, width: '100%' },
  msgRowRight: { justifyContent: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#B0BEC5', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarText: { fontSize: 12, fontWeight: 'bold', color: 'white' },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 18, elevation: 1 },
  bubbleRight: { backgroundColor: '#1D3C58', borderBottomRightRadius: 2 },
  bubbleLeft: { backgroundColor: 'white', borderBottomLeftRadius: 2 },
  senderName: { fontSize: 11, color: '#F57C00', fontWeight: 'bold', marginBottom: 2 },
  msgText: { fontSize: 15 },
  timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  fileText: { fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
  
  inputWrapper: { padding: 10 },
  inputContainer: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 25, paddingHorizontal: 15, alignItems: 'center', elevation: 5, height: 55 },
  input: { flex: 1, fontSize: 18, color: '#333', height: '100%', textAlignVertical: 'center', lineHeight: Platform.OS === 'web' ? 55 : undefined },
  sendBtn: { backgroundColor: '#1D3C58', width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxWidth: 400, backgroundColor: 'white', borderRadius: 15, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginVertical: 10, color: '#1D3C58' },
  label: { alignSelf:'flex-start', fontSize: 12, fontWeight: 'bold', color: '#666', marginTop: 10, marginBottom: 5 },
  modalInput: { backgroundColor: '#F0F0F0', borderRadius: 8, padding: 12, width: '100%', marginBottom: 5 },
  webDateInput: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #E0E0E0', marginBottom: 10 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, width: '100%' },
  btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  btnCancel: { backgroundColor: '#EEE' },
  btnConfirm: { backgroundColor: '#1D3C58' },

  // --- ESTILOS WEB DROPDOWN ---
  webDropTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#F9F9F9', width: 80 },
  webDropValue: { fontSize: 14, color: '#333' },
  webDropMenu: { position: 'absolute', top: 45, left: 0, right: 0, backgroundColor: 'white', borderRadius: 8, elevation: 10, borderWidth: 1, borderColor: '#EEE', overflow: 'hidden' },
  webDropItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  webDropItemSelected: { backgroundColor: '#1D3C58' }, // Cor de fundo se selecionado
  webDropItemText: { fontSize: 14, color: '#666', textAlign: 'center' }
});