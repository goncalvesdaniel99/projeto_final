import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList, Platform, SafeAreaView
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { Ionicons } from '@expo/vector-icons'; 

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
  const [meetings, setMeetings] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(false);

  // Data de hoje para seleção inicial
  const todayLocal = new Date();
  const todayString = todayLocal.getFullYear() + "-" + 
                      String(todayLocal.getMonth() + 1).padStart(2, '0') + "-" + 
                      String(todayLocal.getDate()).padStart(2, '0');
                      
  const [selectedDate, setSelectedDate] = useState(todayString);

  useEffect(() => {
    carregarReunioes();
  }, []);

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

      // 🔥 FILTRO: Remove reuniões que já passaram
      const now = new Date();
      
      const listaFutura = listaBruta.filter(m => {
          const dataReuniao = new Date(m.startsAt || m.date);
          return dataReuniao > now; // Só mantém se for no futuro
      });

      // 🔥 ORDENAÇÃO: Da mais próxima para a mais distante
      listaFutura.sort((a, b) => {
          const dateA = new Date(a.startsAt || a.date);
          const dateB = new Date(b.startsAt || b.date);
          return dateA - dateB;
      });

      setMeetings(listaFutura);

      // Gera as marcas (bolinhas) apenas para as reuniões futuras
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

  // Filtra a lista visual para mostrar apenas o dia clicado
  const meetingsDoDia = meetings.filter((m) => {
    const dataReuniao = m.startsAt || m.date;
    if (!dataReuniao) return false;
    return dataReuniao.split('T')[0] === selectedDate;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>O Meu Calendário</Text>
      </View>

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
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#b6c1cd',
          selectedDayBackgroundColor: '#1D3C58',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#1D3C58',
          dayTextColor: '#2d4150',
          textDisabledColor: '#d9e1e8',
          dotColor: '#1D3C58',
          selectedDotColor: '#ffffff',
          arrowColor: '#1D3C58',
          disabledArrowColor: '#d9e1e8',
          textDayFontWeight: '500',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: 'bold',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 13,
          'stylesheet.day.basic': {
            base: {
              width: 32,
              height: 32,
              alignItems: 'center',
              justifyContent: 'center'
            }
          }
        }}
      />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1D3C58" />
        </View>
      ) : (
        <View style={styles.listContainer}>
            <Text style={styles.dateTitle}>
                {selectedDate ? `Reuniões de ${formatarDataBonita(selectedDate)}` : "Seleciona um dia"}
            </Text>

            {meetingsDoDia.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Nenhuma reunião agendada.</Text>
                </View>
            ) : (
                <FlatList
                  data={meetingsDoDia}
                  keyExtractor={(item) => item._id || Math.random().toString()}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  renderItem={({ item }) => (
                    <View style={styles.meetingCard}>
                      <View style={styles.cardHeader}>
                          <Text style={styles.meetingTime}>
                            <Ionicons name="time-outline" size={14}/> {formatarHora(item.startsAt || item.date)}
                          </Text>
                          <Text style={styles.meetingGroupBadge}>
                            {item.group?.disciplina || "Grupo"}
                          </Text>
                      </View>
                      
                      <View style={styles.cardBody}>
                        <Text style={styles.meetingLocation}>
                            <Ionicons name="location-outline" size={16}/> {item.location || "Online"}
                        </Text>
                        {item.notes ? (
                            <Text style={styles.meetingNotes}>"{item.notes}"</Text>
                        ) : null}
                        <Text style={styles.meetingCreator}>
                            Agendado por: {item.createdBy?.nome || "Membro do grupo"}
                        </Text>
                      </View>
                    </View>
                  )}
                />
            )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F9FC" },
  header: { padding: 15, backgroundColor: 'white', alignItems: 'center', borderBottomWidth:1, borderColor:'#eee' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1D3C58' },
  calendar: {
    borderRadius: 15,
    margin: 15,
    elevation: 4, 
    shadowColor: '#000', 
    shadowOpacity: 0.1,
    shadowRadius: 10,
    paddingBottom: 10
  },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContainer: { flex: 1, padding: 16 },
  dateTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10, color: '#333' },
  emptyContainer: { alignItems: 'center', marginTop: 30 },
  emptyText: { fontSize: 14, color: "#666" },
  meetingCard: {
    backgroundColor: "white", padding: 15, borderRadius: 12, marginBottom: 12,
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  meetingTime: { fontWeight: 'bold', color: '#1D3C58', fontSize: 16 },
  meetingGroupBadge: { backgroundColor: '#E1F5FE', color: '#0288D1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
  cardBody: { paddingLeft: 5 },
  meetingLocation: { fontSize: 15, fontWeight: '500', color: '#333', marginBottom: 4 },
  meetingNotes: { fontSize: 14, color: '#666', fontStyle: 'italic', marginBottom: 6 },
  meetingCreator: { fontSize: 12, color: '#999', marginTop: 4 },
});