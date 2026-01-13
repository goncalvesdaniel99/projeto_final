import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList, Platform, SafeAreaView
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { Ionicons } from '@expo/vector-icons'; 

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
  if(!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

function formatarDataBonita(isoString) {
  if(!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleDateString("pt-PT");
}

export default function MeetingsScreen() {
  const [meetings, setMeetings] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

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
      
      const lista = Array.isArray(data) ? data : (data.meetings || []);
      setMeetings(lista);

      const marks = {};
      lista.forEach((m) => {
        // CORREÇÃO AQUI: usar startsAt
        const day = m.startsAt.slice(0, 10); 
        if (!marks[day]) {
          marks[day] = { marked: true, dotColor: '#1D3C58' };
        }
      });
      setMarkedDates(marks);
    } catch (err) {
      console.log("ERRO:", err);
    } finally {
      setLoading(false);
    }
  }

  const meetingsDoDia = meetings.filter(
    (m) => selectedDate && m.startsAt.slice(0, 10) === selectedDate
  );

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
            selectedTextColor: 'white'
          },
        }}
        theme={{
          todayTextColor: "#1D3C58",
          arrowColor: "#1D3C58",
          selectedDayBackgroundColor: "#1D3C58",
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
                    <Text style={styles.emptyText}>Sem reuniões para este dia.</Text>
                </View>
            ) : (
                <FlatList
                  data={meetingsDoDia}
                  keyExtractor={(item) => item._id}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  renderItem={({ item }) => (
                    <View style={styles.meetingCard}>
                      <View style={styles.cardHeader}>
                          <Text style={styles.meetingTime}>
                            <Ionicons name="time-outline" size={14}/> {formatarHora(item.startsAt)}
                          </Text>
                          <Text style={styles.meetingGroupBadge}>
                            {item.group?.disciplina || "Grupo"}
                          </Text>
                      </View>
                      
                      <View style={styles.cardBody}>
                        <Text style={styles.meetingLocation}>
                            <Ionicons name="location-outline" size={16}/> {item.location}
                        </Text>
                        {item.notes ? (
                            <Text style={styles.meetingNotes}>{item.notes}</Text>
                        ) : null}
                        <Text style={styles.meetingCreator}>
                            Agendado por: {item.createdBy?.nome || "Alguém"}
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
  meetingGroupBadge: { backgroundColor: '#E1F5FE', color: '#0288D1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 12, fontWeight: 'bold' },
  cardBody: { paddingLeft: 5 },
  meetingLocation: { fontSize: 15, fontWeight: '500', color: '#333', marginBottom: 4 },
  meetingNotes: { fontSize: 14, color: '#666', fontStyle: 'italic', marginBottom: 6 },
  meetingCreator: { fontSize: 12, color: '#999', marginTop: 4 },
});