import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, createElement, useMemo } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, 
  Platform, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, 
  Linking, Modal, ImageBackground, ScrollView, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons'; 
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const CHAT_BG = { uri: "https://i.pinimg.com/originals/85/ec/df/85ecdf1c3611ecc9b7fa85282d9526e0.png" };

// --- COMPONENTE DROPDOWN COM AUTO-SCROLL ---
const CustomWebDropdown = ({ options, value, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const itemRefs = useRef({});

  useEffect(() => {
    if (isOpen) {
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
          <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
            {options.map((opt) => (
              <TouchableOpacity 
                key={opt} 
                ref={el => itemRefs.current[opt] = el}
                style={[styles.webDropItem, value === opt && styles.webDropItemSelected]} 
                onPress={() => { onSelect(opt); setIsOpen(false); }}
              >
                <Text style={[styles.webDropItemText, value === opt && { fontWeight: 'bold', color: 'white' }]}>{opt}</Text>
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

  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [selDate, setSelDate] = useState(new Date().toISOString().split('T')[0]);
  const [selHour, setSelHour] = useState("12");
  const [selMin, setSelMin] = useState("00");

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

  const handleSendText = async (textToSend) => {
    const msg = textToSend || inputText;
    if (!msg.trim()) return;
    if (!textToSend) setInputText(""); 

    try {
      let token = await AsyncStorage.getItem('token');
      await fetch(`${BASE_URL}/messages/send`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token?.replace(/^"|"$/g, '')}` },
        body: JSON.stringify({ groupId: finalGroupId, texto: msg })
      });
      fetchMessages(); 
    } catch (e) {}
  };

  const handleScheduleMeeting = async () => {
    if (!meetingLocation) { 
      showAlert("Campo Vazio", "Indica o Local.", "error"); 
      return; 
    }

    // --- NOVA VALIDAÇÃO DE DATA/HORA ---
    const agora = new Date();
    const dataSelecionada = new Date(selDate + 'T00:00:00');
    const hoje = new Date(agora.toISOString().split('T')[0] + 'T00:00:00');

    // Se for hoje, verificar se a hora já passou
    if (dataSelecionada.getTime() === hoje.getTime()) {
      const horaSel = parseInt(selHour);
      const minSel = parseInt(selMin);
      
      if (horaSel < agora.getHours() || (horaSel === agora.getHours() && minSel <= agora.getMinutes())) {
        showAlert("Hora Inválida", "Não podes agendar uma reunião para uma hora que já passou!", "error");
        return;
      }
    } else if (dataSelecionada < hoje) {
      showAlert("Data Inválida", "Não podes agendar reuniões para dias passados.", "error");
      return;
    }
    // ------------------------------------

    const timePart = `${selHour}:${selMin}`;
    const msgTexto = `📅 *Nova Reunião Agendada!*\n\n🕒 ${selDate} às ${timePart}\n📍 ${meetingLocation}\n📝 ${meetingNotes || "Sem notas"}`;

    try {
        let token = await AsyncStorage.getItem('token');
        const tokenClean = token?.replace(/^"|"$/g, '');
        const res = await fetch(`${BASE_URL}/meetings/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenClean}` },
            body: JSON.stringify({ groupId: finalGroupId, date: selDate, time: timePart, location: meetingLocation, notes: meetingNotes })
        });
        if (res.ok) {
            handleSendText(msgTexto);
            setScheduleModalVisible(false);
            setMeetingLocation(""); setMeetingNotes("");
            showAlert("Sucesso", "Reunião agendada!");
        }
    } catch (e) { showAlert("Erro", "Falha na conexão.", "error"); }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled) { 
        setSelectedFile(result.assets[0]); 
        setFileModalVisible(true); 
      }
    } catch (err) { console.log(err); }
  };

  const confirmUpload = async () => {
    setFileModalVisible(false); setIsUploading(true);
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

  const showAlert = (title, message, type = "success") => { setAlertConfig({ title, message, type }); setAlertVisible(true); };

  const renderItem = ({ item }) => {
    const sender = item.sender || item.autor; 
    const isMe = String(sender?._id || sender) === String(myId);
    const texto = item.text || "";
    const isFile = item.type === 'file' || item.fileUrl || texto.includes("📎");
    return (
        <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
            <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                {!isMe && <Text style={styles.senderName}>{sender?.nome || "Utilizador"}</Text>}
                {isFile ? (
                   <TouchableOpacity onPress={() => Linking.openURL(`${BASE_URL}/${item.fileUrl?.replace(/\\/g, "/").replace(/^\//, "")}`)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="document-text" size={20} color={isMe ? "white" : "#1D3C58"} />
                            <Text style={[styles.fileText, {color: isMe ? 'white' : '#1D3C58'}]}>{texto.replace("📎 ", "") || "Ver Ficheiro"}</Text>
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
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={['#E2E8F0', '#F6F9FC']} style={styles.headerGradient}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}><Ionicons name="arrow-back" size={22} color="#1D3C58" /></TouchableOpacity>
            <View style={{flex: 1, alignItems:'center'}}><Text style={styles.headerTitle}>{finalGroupName}</Text></View>
            <TouchableOpacity onPress={() => navigation.navigate('GroupDetails', { group: finalGroupData, id: finalGroupId })} style={styles.backCircle}><Ionicons name="ellipsis-vertical" size={22} color="#1D3C58" /></TouchableOpacity>
          </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ImageBackground source={CHAT_BG} style={{flex:1}} imageStyle={{opacity:0.05}}>
            <View style={{ flex: 1 }}>
                {loading ? <ActivityIndicator size="large" color="#1D3C58" style={{marginTop:20}} /> : 
                <FlatList ref={flatListRef} inverted data={[...messages].reverse()} keyExtractor={i => i._id} renderItem={renderItem} contentContainerStyle={{ padding: 15 }} />}
            </View>
            <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                    <TextInput 
                        style={[styles.input, Platform.OS === 'web' && { outlineWidth: 0 }]} 
                        value={inputText} onChangeText={setInputText} placeholder="Mensagem..." 
                        outlineStyle="none"
                        onSubmitEditing={() => handleSendText()}
                        onKeyPress={(e) => { if(Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                    />
                    <View style={{flexDirection:'row', alignItems:'center', gap: 10, marginRight: 8}}>
                        <TouchableOpacity onPress={handlePickDocument}>
                          {isUploading ? <ActivityIndicator size="small" /> : <Ionicons name="attach" size={28} color="#555" />}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setScheduleModalVisible(true)}>
                          <Ionicons name="calendar-outline" size={26} color="#555" />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => handleSendText()} style={styles.sendBtn}><Ionicons name="send" size={18} color="white" /></TouchableOpacity>
                </View>
            </View>
        </ImageBackground>
      </KeyboardAvoidingView>

      {/* MODAL AGENDAR */}
      <Modal visible={scheduleModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agendar Reunião</Text>
            <Text style={styles.label}>Data:</Text>
            {Platform.OS === 'web' ? (
                createElement('input', { type: 'date', value: selDate, onChange: (e) => setSelDate(e.target.value), style: { ...styles.webDateInput, outline: 'none', boxShadow: 'none' } })
            ) : <TouchableOpacity style={styles.modalInput}><Text>{selDate}</Text></TouchableOpacity>}
            <Text style={styles.label}>Hora:</Text>
            <View style={{flexDirection:'row', alignItems:'center', gap: 10, zIndex: 1000}}>
                <CustomWebDropdown options={hourOptions} value={selHour} onSelect={setSelHour} />
                <Text style={{fontWeight:'bold'}}>:</Text>
                <CustomWebDropdown options={minuteOptions} value={selMin} onSelect={setSelMin} />
            </View>
            <Text style={styles.label}>Local:</Text>
            <TextInput style={[styles.modalInput, Platform.OS === 'web' && { outlineWidth: 0 }]} value={meetingLocation} onChangeText={setMeetingLocation} placeholder="Local..." outlineStyle="none" />
            <Text style={styles.label}>Tópicos a discutir:</Text>
            <TextInput style={[styles.modalInput, Platform.OS === 'web' && { outlineWidth: 0 }]} value={meetingNotes} onChangeText={setMeetingNotes} placeholder="Notas..." outlineStyle="none" />
            <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setScheduleModalVisible(false)} style={styles.btnCancel}><Text>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleScheduleMeeting} style={styles.btnConfirm}><Text style={{color:'white'}}>Agendar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL FICHEIRO */}
      <Modal visible={fileModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="cloud-upload-outline" size={50} color="#1D3C58" />
            <Text style={styles.modalTitle}>Enviar Ficheiro?</Text>
            <Text style={{textAlign:'center', color:'#666', marginBottom:20}}>{selectedFile?.name}</Text>
            <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setFileModalVisible(false)} style={styles.btnCancel}><Text>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={confirmUpload} style={styles.btnConfirm}><Text style={{color:'white'}}>Enviar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ALERTAS */}
      <Modal visible={alertVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Ionicons name={alertConfig.type === 'error' ? "alert-circle" : "checkmark-circle"} size={50} color={alertConfig.type === 'error' ? "#D32F2F" : "#4CAF50"} />
                <Text style={styles.modalTitle}>{alertConfig.title}</Text>
                <Text style={{textAlign:'center', color:'#666', marginBottom:20}}>{alertConfig.message}</Text>
                <TouchableOpacity onPress={() => setAlertVisible(false)} style={[styles.btnConfirm, {width:'100%', padding:12, borderRadius:10}]}><Text style={{color:'white', fontWeight:'bold', textAlign:'center'}}>OK</Text></TouchableOpacity>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerGradient: { borderBottomWidth: 1, borderBottomColor: '#E2E8F0', elevation: 4 },
  header: { height: 65, flexDirection: 'row', alignItems: 'center', justifyContent:'space-between', paddingHorizontal: 15 },
  backCircle: { width: 38, height: 38, backgroundColor: '#FFF', borderRadius: 19, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowOpacity: 0.1 },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#1D3C58' },
  msgRow: { flexDirection: 'row', marginBottom: 12, width: '100%' },
  msgRowRight: { justifyContent: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 18 },
  bubbleRight: { backgroundColor: '#1D3C58' },
  bubbleLeft: { backgroundColor: 'white' },
  senderName: { fontSize: 11, color: '#795548', fontWeight: 'bold', marginBottom: 2 },
  msgText: { fontSize: 15 },
  timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  fileText: { fontWeight: 'bold', marginLeft: 8 },
  inputWrapper: { padding: 10, backgroundColor: 'white' },
  inputContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 25, paddingHorizontal: 15, alignItems: 'center', height: 50 },
  input: { flex: 1, fontSize: 16, color: '#333', height: 50, paddingVertical: 0 },
  sendBtn: { backgroundColor: '#1D3C58', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxWidth: 400, backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1D3C58', marginVertical: 10 },
  label: { alignSelf:'flex-start', fontSize: 12, fontWeight: 'bold', color: '#666', marginTop: 10 },
  modalInput: { backgroundColor: '#F0F0F0', borderRadius: 8, padding: 12, width: '100%', marginTop: 5 },
  webDateInput: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #CCC', marginTop: 5 },
  modalButtons: { flexDirection: 'row', marginTop: 20, gap: 10 },
  btnCancel: { flex:1, padding: 12, borderRadius: 8, backgroundColor: '#EEE', alignItems: 'center' },
  btnConfirm: { flex:1, padding: 12, borderRadius: 8, backgroundColor: '#1D3C58', alignItems: 'center' },
  webDropTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CCC', width: 75, backgroundColor:'#F9F9F9' },
  webDropValue: { fontSize: 14, color: '#333' },
  webDropMenu: { position: 'absolute', top: 45, width: 75, backgroundColor: 'white', elevation: 10, borderRadius: 8, overflow: 'hidden', borderWidth:1, borderColor:'#EEE' },
  webDropItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', alignItems:'center' },
  webDropItemSelected: { backgroundColor: '#1D3C58' },
  webDropItemText: { fontSize: 14, color: '#666' }
});