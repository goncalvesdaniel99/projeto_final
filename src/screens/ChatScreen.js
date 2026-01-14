import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, createElement, useMemo } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, 
  Platform, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, 
  Linking, Modal 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons'; 
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function ChatScreen({ route, navigation }) {
  // --- DADOS DO GRUPO ---
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

  // --- ESTADOS DO DATE PICKER ---
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState('date'); 

  // --- ESTADOS AUXILIARES ---
  const [fileModalVisible, setFileModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: "", message: "", type: "success" });

  const flatListRef = useRef(); 
  const BASE_URL = Platform.OS === 'android' ? "http://10.0.2.2:3000" : "http://localhost:3000";

  // --- LISTAS PARA OS DROPDOWNS (WEB) ---
  const hourOptions = useMemo(() => Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')), []);
  const minuteOptions = ["00", "15", "30", "45"];

  useLayoutEffect(() => {
    navigation.setOptions({
      title: finalGroupName,
      headerRight: () => (
        <TouchableOpacity 
          style={{ marginRight: 15 }}
          onPress={() => navigation.navigate('GroupDetails', { group: finalGroupData, id: finalGroupId })}
        >
          <Ionicons name="settings-outline" size={24} color="#1D3C58" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, finalGroupId, finalGroupName]);

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
      if(token) token = token.replace(/^"|"$/g, '');
      const res = await fetch(`${BASE_URL}/messages/${finalGroupId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setMessages(await res.json());
    } catch (error) { console.log("Erro msgs:", error); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); 
    return () => clearInterval(interval);
  }, [finalGroupId]);

  useFocusEffect(
    useCallback(() => { if (finalGroupId) fetchNextMeeting(); }, [finalGroupId])
  );

  const fetchNextMeeting = async () => {
    try {
      let token = await AsyncStorage.getItem('token');
      if(token) token = token.replace(/^"|"$/g, '');
      const res = await fetch(`${BASE_URL}/meetings/${finalGroupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const upcoming = data.filter(m => {
             const dateStr = m.startsAt || (m.date && m.time ? `${m.date}T${m.time}:00` : null);
             if(!dateStr) return false;
             return new Date(dateStr) >= new Date();
          });
          setNextMeeting(upcoming.length > 0 ? upcoming[0] : null);
        } else { setNextMeeting(null); }
      } else { setNextMeeting(null); }
    } catch (e) { console.log("Silent catch"); }
  };

  // --- LÓGICA DE DATA/HORA ---
  const onChangeDate = (event, selectedDate) => {
    if (event.type === 'dismissed') {
        setShowPicker(false);
        return;
    }
    const currentDate = selectedDate || date;
    setShowPicker(Platform.OS === 'ios'); 
    setDate(currentDate);
  };

  const showMode = (currentMode) => {
    setShowPicker(true);
    setMode(currentMode);
  };

  // --- AGENDAR ---
  const handleScheduleMeeting = async () => {
    if (!meetingLocation) {
        showAlert("Campo Vazio", "Indica o Local.", "error");
        return;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    const datePart = `${year}-${month}-${day}`;
    const timePart = `${hour}:${minute}`;
    
    try {
        let token = await AsyncStorage.getItem('token');
        if(token) token = token.replace(/^"|"$/g, '');

        const res = await fetch(`${BASE_URL}/meetings/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({
                groupId: finalGroupId,
                date: datePart,
                time: timePart,
                location: meetingLocation,
                notes: meetingNotes
            })
        });

        if (res.ok) {
            const msgTexto = `📅 Nova Reunião Agendada!\n\n🕒 ${datePart} às ${timePart}\n📍 ${meetingLocation}\n📝 ${meetingNotes || "Sem notas"}`;
            await fetch(`${BASE_URL}/messages/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ groupId: finalGroupId, texto: msgTexto })
            });
            showAlert("Sucesso", "Reunião criada!");
            setScheduleModalVisible(false);
            setMeetingLocation(""); setMeetingNotes("");
            fetchMessages(); fetchNextMeeting(); 
        } else { 
            const err = await res.json();
            showAlert("Erro", err.error || "Falha ao criar.", "error");
        }
    } catch (e) { showAlert("Erro", "Falha na conexão.", "error"); }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled) {
        setSelectedFile(result.assets[0]);
        setFileModalVisible(true);
      }
    } catch (err) { console.log(err); }
  };

  const confirmUpload = async () => {
    setFileModalVisible(false);
    if (!selectedFile || !finalGroupId) return;
    setIsUploading(true);
    try {
      let token = await AsyncStorage.getItem('token');
      if(token) token = token.replace(/^"|"$/g, '');
      const formData = new FormData();
      formData.append('groupId', finalGroupId);
      formData.append('type', 'file');

      if (Platform.OS === 'web') {
        const response = await fetch(selectedFile.uri);
        const blob = await response.blob();
        formData.append('file', blob, selectedFile.name || 'upload.jpg');
      } else {
        let uri = selectedFile.uri;
        if (Platform.OS === 'android' && !uri.startsWith('file://')) uri = 'file://' + uri;
        formData.append('file', { uri: uri, name: selectedFile.name || 'upload.jpg', type: selectedFile.mimeType || 'application/octet-stream' });
      }

      const res = await fetch(`${BASE_URL}/messages/upload`, {
        method: "POST", headers: { "Authorization": `Bearer ${token}` }, body: formData
      });

      if (res.ok) fetchMessages(); 
      else showAlert("Erro", "Falha no upload.", "error");
    } catch (error) { showAlert("Erro", "Erro de conexão.", "error"); } 
    finally { setIsUploading(false); setSelectedFile(null); }
  };

  const handleOpenFile = (fileUrl) => {
    if (!fileUrl) return;
    let cleanPath = fileUrl.replace(/\\/g, "/"); 
    if (cleanPath.startsWith("/")) cleanPath = cleanPath.substring(1);
    const fullUrl = `${BASE_URL}/${cleanPath}`;
    Linking.openURL(fullUrl).catch(()=> showAlert("Erro", "Link inválido", "error"));
  };

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    const txt = inputText; setInputText(""); 
    try {
      let token = await AsyncStorage.getItem('token');
      if(token) token = token.replace(/^"|"$/g, '');
      await fetch(`${BASE_URL}/messages/send`, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ groupId: finalGroupId, texto: txt })
      });
      fetchMessages(); 
    } catch (e) {}
  };

  const showAlert = (title, message, type = "success") => {
      setAlertConfig({ title, message, type });
      setAlertVisible(true);
  };

  const renderPinnedMeeting = () => {
    if (!nextMeeting) return null;
    const dateStrRaw = nextMeeting.startsAt || (nextMeeting.date && nextMeeting.time ? `${nextMeeting.date}T${nextMeeting.time}:00` : null);
    if (!dateStrRaw) return null;
    const dateObj = new Date(dateStrRaw);
    if (isNaN(dateObj.getTime())) return null;

    const dateStr = dateObj.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
    const timeStr = dateObj.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const isLink = nextMeeting.location && (nextMeeting.location.startsWith('http') || nextMeeting.location.includes('zoom'));

    return (
      <View style={styles.pinnedWrapper}>
        <LinearGradient colors={['#1D3C58', '#3498DB']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.pinnedGradient}>
          <View style={styles.pinnedHeader}>
             <View style={{flexDirection:'row', alignItems:'center'}}>
                 <Ionicons name="calendar" size={14} color="#FFD700" style={{marginRight:5}} />
                 <Text style={styles.pinnedLabel}>PRÓXIMA REUNIÃO</Text>
             </View>
             {isLink && (
                 <TouchableOpacity style={styles.joinBtnSmall} onPress={() => handleOpenFile(nextMeeting.location)}>
                     <Text style={styles.joinTextSmall}>ENTRAR</Text>
                     <Ionicons name="arrow-forward" size={10} color="white" style={{marginLeft:4}}/>
                 </TouchableOpacity>
             )}
          </View>
          <View style={styles.mainRow}>
              <View style={{flex: 1}}>
                  <Text style={styles.pinnedTitle}>{dateStr}</Text>
                  <Text style={styles.pinnedTime}>{timeStr}</Text>
              </View>
              <View style={styles.rightSideContainer}>
                 <View style={styles.locationBadge}>
                    <Ionicons name="location" size={14} color="#1D3C58"/>
                    <Text style={styles.locationText} numberOfLines={1}>{nextMeeting.location}</Text>
                 </View>
                 {nextMeeting.notes ? (
                    <View style={styles.noteRow}>
                        <Ionicons name="document-text-outline" size={16} color="rgba(255,255,255,0.8)" style={{marginRight: 4}} />
                        <Text style={styles.pinnedNotes} numberOfLines={1}>{nextMeeting.notes}</Text>
                    </View>
                 ) : null}
              </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    if (!item) return null;
    const senderData = item.sender || item.autor; 
    const isMe = String(senderData?._id || senderData) === String(myId);
    const texto = item.text || "";
    const nome = senderData?.nome || "Desconhecido";
    const isFile = item.type === 'file' || item.fileUrl || texto.includes("📎");
    
    return (
        <View style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', backgroundColor: isMe ? '#1D3C58' : '#E5E5EA', padding: 10, marginVertical: 5, borderRadius: 10, maxWidth: '80%' }}>
            {!isMe && <Text style={{fontSize: 11, color: '#666', fontWeight:'bold', marginBottom: 2}}>{nome}</Text>}
            {isFile ? (
               <TouchableOpacity onPress={() => handleOpenFile(item.fileUrl)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="document-text" size={30} color={isMe ? "#FFD700" : "#E63946"} />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={{color: isMe ? 'white' : 'black', textDecorationLine: 'underline', fontWeight: 'bold'}}>{texto.replace("📎 ", "")}</Text>
                            <Text style={{color: isMe ? '#EEE' : '#555', fontSize: 10}}>Toque para abrir</Text>
                        </View>
                    </View>
               </TouchableOpacity>
            ) : ( <Text style={{color: isMe ? 'white' : 'black', fontSize: 16}}>{texto}</Text> )}
        </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F9FC' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {renderPinnedMeeting()}
        <View style={{ flex: 1 }}>
            {loading ? <ActivityIndicator size="large" color="#1D3C58" style={{marginTop:20}} /> : 
            <FlatList ref={flatListRef} inverted={true} data={[...messages].reverse()} keyExtractor={i => i._id || Math.random().toString()} renderItem={renderItem} contentContainerStyle={{ padding: 15 }} />}
        </View>
        
        <View style={styles.inputContainer}>
            <TextInput 
                style={styles.input} 
                value={inputText} 
                onChangeText={setInputText} 
                placeholder="Mensagem..." 
                multiline={false} 
                onSubmitEditing={handleSendText}
                returnKeyType="send"
            />
            <TouchableOpacity onPress={() => setScheduleModalVisible(true)} style={styles.iconButton}>
                <Ionicons name="calendar-outline" size={28} color="#1D3C58" />
            </TouchableOpacity>
            {isUploading ? <ActivityIndicator size="small" color="#1D3C58" style={{margin:10}}/> : 
            <TouchableOpacity onPress={handlePickDocument} style={styles.iconButton}><Ionicons name="attach" size={28} color="#1D3C58"/></TouchableOpacity>}
            <TouchableOpacity onPress={handleSendText} style={styles.iconButton}><Ionicons name="send" size={24} color="#1D3C58"/></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* --- MODAL REUNIÃO --- */}
      <Modal visible={scheduleModalVisible} animationType="slide" transparent={true} onRequestClose={() => setScheduleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agendar Reunião</Text>
            <Text style={styles.label}>Data e Hora:</Text>
            
            {/* 🔥 WEB: 3 Inputs Separados (Data, Hora, Minutos) */}
            {Platform.OS === 'web' ? (
                <View style={{flexDirection: 'row', width: '100%', marginBottom: 15, alignItems:'center', gap: 5}}>
                    {/* DATA */}
                    {createElement('input', {
                        type: 'date',
                        value: date.toISOString().split('T')[0],
                        onChange: (e) => {
                            if(!e.target.value) return;
                            const [y, m, d] = e.target.value.split('-').map(Number);
                            const newDate = new Date(date);
                            newDate.setFullYear(y, m - 1, d);
                            setDate(newDate);
                        },
                        style: { flex: 2, padding: 10, borderRadius: 8, border: '1px solid #E0E0E0', backgroundColor: '#F0F0F0', color:'#333', fontSize: 14 }
                    })}
                    
                    {/* HORA (00-23) */}
                    {createElement('select', {
                        value: String(date.getHours()).padStart(2, '0'),
                        onChange: (e) => {
                            const newDate = new Date(date);
                            newDate.setHours(parseInt(e.target.value));
                            setDate(newDate);
                        },
                        style: { flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E0E0E0', backgroundColor: '#F0F0F0', color:'#333', fontSize: 14 }
                    }, hourOptions.map(h => createElement('option', { key: h, value: h }, h)))}

                    <Text style={{fontWeight:'bold'}}>:</Text>

                    {/* MINUTOS (00, 15, 30, 45) */}
                    {createElement('select', {
                        value: String(date.getMinutes()).padStart(2, '0'),
                        onChange: (e) => {
                            const newDate = new Date(date);
                            newDate.setMinutes(parseInt(e.target.value));
                            setDate(newDate);
                        },
                        style: { flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E0E0E0', backgroundColor: '#F0F0F0', color:'#333', fontSize: 14 }
                    }, minuteOptions.map(m => createElement('option', { key: m, value: m }, m)))}
                </View>
            ) : (
                <>
                    {/* MOBILE */}
                    <View style={{flexDirection:'row', justifyContent:'space-between', width:'100%', marginBottom:10}}>
                        <TouchableOpacity onPress={() => showMode('date')} style={styles.dateBtn}>
                            <Ionicons name="calendar" size={18} color="#1D3C58"/>
                            <Text style={styles.dateBtnText}>{date.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => showMode('time')} style={styles.dateBtn}>
                            <Ionicons name="time" size={18} color="#1D3C58"/>
                            <Text style={styles.dateBtnText}>{String(date.getHours()).padStart(2,'0')}:{String(date.getMinutes()).padStart(2,'0')}</Text>
                        </TouchableOpacity>
                    </View>
                    {showPicker && (
                        <DateTimePicker
                            testID="dateTimePicker"
                            value={date}
                            mode={mode}
                            is24Hour={true}
                            display="default"
                            onChange={onChangeDate}
                            minuteInterval={15} // 👈 No Android pode não funcionar dependendo da versão, mas no iOS garante 15min
                        />
                    )}
                </>
            )}

            <Text style={styles.label}>Local</Text>
            <TextInput style={styles.modalInput} value={meetingLocation} onChangeText={setMeetingLocation} placeholder="Sala..." />
            <Text style={styles.label}>Notas (Opcional):</Text>
            <TextInput style={styles.modalInput} value={meetingNotes} onChangeText={setMeetingNotes} placeholder="Tópicos..." />
            <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setScheduleModalVisible(false)} style={[styles.btn, styles.btnCancel]}><Text>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleScheduleMeeting} style={[styles.btn, styles.btnConfirm]}><Text style={{color:'white'}}>Confirmar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={fileModalVisible} animationType="fade" transparent={true} onRequestClose={() => setFileModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="cloud-upload-outline" size={40} color="#1D3C58" style={{marginBottom:10}} />
            <Text style={styles.modalTitle}>Enviar Ficheiro?</Text>
            <Text style={{textAlign:'center', color:'#666', marginBottom:20}}>{selectedFile?.name}</Text>
            <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setFileModalVisible(false)} style={[styles.btn, styles.btnCancel]}><Text>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={confirmUpload} style={[styles.btn, styles.btnConfirm]}><Text style={{color:'white'}}>Enviar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={alertVisible} animationType="fade" transparent={true} onRequestClose={() => setAlertVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name={alertConfig.type === 'error' ? "alert-circle" : "checkmark-circle"} size={40} color={alertConfig.type === 'error' ? "#D32F2F" : "#4CAF50"} style={{marginBottom:10}} />
            <Text style={styles.modalTitle}>{alertConfig.title}</Text>
            <Text style={{textAlign:'center', color:'#666', marginBottom:20}}>{alertConfig.message}</Text>
            <TouchableOpacity onPress={() => setAlertVisible(false)} style={[styles.btn, styles.btnConfirm, {width:'100%'}]}><Text style={{color:'white'}}>OK</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: 'white', alignItems: 'center', borderTopWidth: 1, borderColor: '#ddd' },
  input: { flex: 1, height: 45, backgroundColor: '#f0f0f0', borderRadius: 25, paddingHorizontal: 15, marginRight: 10, textAlignVertical: 'center' },
  iconButton: { padding: 5, marginLeft: 2 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  
  // 🔥 FIX TAMANHO MODAL NO BROWSER
  modalContent: { 
      width: '90%',        
      maxWidth: 400,       
      backgroundColor: 'white', 
      borderRadius: 15, 
      padding: 20, 
      alignItems:'center' 
  },
  
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#1D3C58' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#666', marginTop: 10, marginBottom: 5, alignSelf:'flex-start', width:'100%' },
  modalInput: { backgroundColor: '#F0F0F0', borderRadius: 8, padding: 10, fontSize: 14, width:'100%' },
  
  dateBtn: { flex: 0.48, flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#E8EAF6', padding: 12, borderRadius: 8 },
  dateBtnText: { marginLeft: 8, color: '#1D3C58', fontWeight: 'bold' },

  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, width:'100%' },
  btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  btnCancel: { backgroundColor: '#eee' },
  btnConfirm: { backgroundColor: '#1D3C58' },
  
  pinnedWrapper: { width: '100%', marginBottom: 0, zIndex: 10 },
  pinnedGradient: { width: '100%', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#3498DB' },
  pinnedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pinnedLabel: { color: '#BDC3C7', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  joinBtnSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  joinTextSmall: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  mainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 2 },
  pinnedTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  pinnedTime: { color: '#E0E0E0', fontSize: 14, fontWeight: '600' },
  rightSideContainer: { alignItems: 'flex-end', justifyContent: 'flex-start', maxWidth: '55%' },
  locationBadge: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignItems: 'center', marginBottom: 4 },
  locationText: { color: '#1D3C58', fontSize: 14, fontWeight: 'bold', marginLeft: 4 },
  noteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  pinnedNotes: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontStyle: 'italic', textAlign: 'right' }
});