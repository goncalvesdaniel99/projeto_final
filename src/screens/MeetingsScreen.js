import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList, Platform, SafeAreaView, StatusBar, TouchableOpacity, ScrollView, Dimensions
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { Ionicons } from '@expo/vector-icons'; 
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

// Configuração do Calendário
LocaleConfig.locales['pt'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt';

const API_BASE_URL = Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

function formatarHora(isoString) {
  if(!isoString) return "--:--";
  const d = new Date(isoString);
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

function formatarDataBonita(dateString) {
  if(!dateString) return "";
  const [ano, mes, dia] = dateString.split('-');
  return `${dia}/${mes}/${ano}`;
}

export default function MeetingsScreen() {
  const navigation = useNavigation();
  const [meetings, setMeetings] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(false);

  const todayLocal = new Date();
  const todayString = todayLocal.getFullYear() + "-" + 
                      String(todayLocal.getMonth() + 1).padStart(2, '0') + "-" + 
                      String(todayLocal.getDate()).padStart(2, '0');
                      
  const [selectedDate, setSelectedDate] = useState(todayString);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    carregarReunioes();
  }, [navigation]);

  async function carregarReunioes() {
    try {
      setLoading(true);
      let token = await AsyncStorage.getItem("token");
      if(token) token = token.replace(/^"|"$/g, '');

      const res = await fetch(`${API_BASE_URL}/meetings/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const listaBruta = Array.isArray(data) ? data : (data.meetings || []);

      const now = new Date();
      const listaFutura = listaBruta.filter(m => new Date(m.startsAt || m.date) > now);
      listaFutura.sort((a, b) => new Date(a.startsAt || a.date) - new Date(b.startsAt || b.date));

      setMeetings(listaFutura);

      const marks = {};
      listaFutura.forEach((m) => {
        const dataStr = m.startsAt || m.date; 
        if (dataStr) {
            const day = dataStr.split('T')[0];
            marks[day] = { marked: true, dotColor: '#1D3C58' };
        }
      });
      setMarkedDates(marks);
    } catch (err) {
      console.error("Erro ao carregar reuniões:", err);
    } finally {
      setLoading(false);
    }
  }

  const meetingsDoDia = meetings.filter((m) => (m.startsAt || m.date)?.split('T')[0] === selectedDate);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      
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
            <Text style={styles.headerTitle}>Agenda</Text>
            <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Componente centralizado com largura máxima */}
            <View style={styles.centeredWrapper}>
                <Calendar
                    onDayPress={(day) => setSelectedDate(day.dateString)}
                    markedDates={{
                    ...markedDates,
                    [selectedDate]: {
                        ...(markedDates[selectedDate] || {}),
                        selected: true,
                        selectedColor: "#1D3C58",
                        selectedTextColor: "white",
                    },
                    }}
                    enableSwipeMonths={true}
                    style={styles.calendar}
                    theme={{
                        calendarBackground: 'rgba(255,255,255,0.85)',
                        selectedDayBackgroundColor: '#1D3C58',
                        todayTextColor: '#1D3C58',
                        dayTextColor: '#1E293B',
                        textDisabledColor: '#CBD5E1',
                        dotColor: '#1D3C58',
                        arrowColor: '#1D3C58',
                        monthTextColor: '#1D3C58',
                        textMonthFontWeight: '800',
                        textDayHeaderFontWeight: '700',
                    }}
                />

                <View style={styles.listContainer}>
                    <Text style={styles.dateTitle}>
                        {selectedDate === todayString ? "Reuniões de Hoje" : `Eventos: ${formatarDataBonita(selectedDate)}`}
                    </Text>

                    {loading ? (
                        <ActivityIndicator size="large" color="#1D3C58" style={{ marginTop: 20 }} />
                    ) : meetingsDoDia.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={32} color="#94A3B8" />
                            <Text style={styles.emptyText}>Sem eventos para este dia.</Text>
                        </View>
                    ) : (
                        meetingsDoDia.map((item) => (
                            <View key={item._id || Math.random()} style={styles.meetingCard}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.timeWrapper}>
                                        <Ionicons name="time" size={16} color="#1D3C58" />
                                        <Text style={styles.meetingTime}>{formatarHora(item.startsAt || item.date)}</Text>
                                    </View>
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{item.group?.disciplina || "Geral"}</Text>
                                    </View>
                                </View>
                                
                                <View style={styles.cardBody}>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="location" size={14} color="#64748B" />
                                        <Text style={styles.meetingLocation}>{item.location || "Online"}</Text>
                                    </View>
                                    {item.notes && (
                                        <View style={styles.notesBox}>
                                            <Text style={styles.meetingNotes}>{item.notes}</Text>
                                        </View>
                                    )}
                                    <Text style={styles.meetingCreator}>Agendado por {item.createdBy?.nome?.split(' ')[0] || "Membro"}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    marginVertical: 15,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 750
  },
  backCircle: { 
    width: 38, height: 38, backgroundColor: '#FFF', borderRadius: 19, 
    alignItems: 'center', justifyContent: 'center', elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1D3C58' },
  
  scrollContent: { paddingBottom: 40 },
  
  centeredWrapper: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 750, // <--- Limita a largura horizontal
    paddingHorizontal: 20
  },

  calendar: {
    borderRadius: 24,
    marginBottom: 25,
    elevation: 4, 
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    paddingVertical: 10,
    overflow: 'hidden'
  },

  listContainer: { paddingHorizontal: 5 },
  dateTitle: { fontSize: 17, fontWeight: "800", marginBottom: 15, color: '#1D3C58', paddingLeft: 5 },
  
  emptyContainer: { 
    alignItems: 'center', 
    marginTop: 20, 
    backgroundColor: 'rgba(255,255,255,0.5)', 
    padding: 30, 
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  emptyText: { fontSize: 14, color: "#64748B", marginTop: 8, fontWeight: '500' },
  
  meetingCard: {
    backgroundColor: "rgba(255, 255, 255, 0.85)", 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  timeWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meetingTime: { fontWeight: '800', color: '#1D3C58', fontSize: 15 },
  
  badge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#475569', fontSize: 10, fontWeight: '700' },
  
  cardBody: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meetingLocation: { fontSize: 14, fontWeight: '600', color: '#475569' },
  notesBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.04)', 
    padding: 12, 
    borderRadius: 12, 
    borderLeftWidth: 3, 
    borderLeftColor: '#1D3C58'
  },
  meetingNotes: { fontSize: 13, color: '#475569', lineHeight: 18 },
  meetingCreator: { fontSize: 11, color: '#94A3B8', marginTop: 2, fontWeight: '500' },
});