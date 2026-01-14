import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Dimensions
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function GroupsScreen({ navigation }) {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const API_BASE_URL =
    Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

  async function carregarDados() {
    try {
      if (!refreshing) setLoading(true);
      const token = await AsyncStorage.getItem("token");

      const resMeus = await fetch(`${API_BASE_URL}/groups/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meus = await resMeus.json();
      const meusIds = Array.isArray(meus) ? meus.map((g) => g._id) : [];

      const resAll = await fetch(`${API_BASE_URL}/groups/all`);
      const todos = await resAll.json();

      if (!Array.isArray(todos)) {
        setGrupos([]);
        return;
      }

      const filtrados = todos.filter((g) => {
        const jaSouMembro = meusIds.includes(g._id);
        const numeroMembros = g.membros ? g.membros.length : 0;
        const maximo = g.maxPessoas || 100;
        return !jaSouMembro && numeroMembros < maximo;
      });

      setGrupos(filtrados);
    } catch (err) {
      console.log("⚠ Erro:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerShown: false });
      carregarDados();
    }, [navigation])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarDados();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient 
        colors={['#E2E8F0', '#F8FAFC', '#F1F5F9']} 
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.container}>
        {/* Header Consistente */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
                <Ionicons name="arrow-back" size={22} color="#1D3C58" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Grupos Disponíveis</Text>
            <TouchableOpacity
              style={styles.createCircle}
              onPress={() => navigation.navigate("CreateGroup")}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D3C58" />
          }
        >
          <View style={styles.centeredWrapper}>
            <Text style={styles.sectionLabel}>Grupos Disponíveis</Text>

            {loading && !refreshing ? (
              <ActivityIndicator size="large" color="#795548" style={{ marginTop: 50 }} />
            ) : grupos.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={50} color="#CBD5E1" />
                <Text style={styles.emptyText}>Não há novos grupos para te juntares.</Text>
              </View>
            ) : (
              grupos.map((g) => (
                <TouchableOpacity
                  key={g._id}
                  style={styles.groupCard}
                  onPress={() => navigation.navigate("GroupDetails", { group: g, id: g._id })}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardMain}>
                    <View style={styles.iconBox}>
                      <Ionicons name="people" size={22} color="white" />
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{g.disciplina}</Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>{g.curso} • {g.ano}º Ano</Text>
                    </View>
                  </View>
                  
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {g.membros ? g.membros.length : 0}/{g.maxPessoas}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 20, marginVertical: 15, alignSelf: 'center', width: '100%', maxWidth: 750
  },
  backCircle: { 
    width: 38, height: 38, backgroundColor: '#FFF', borderRadius: 19, 
    alignItems: 'center', justifyContent: 'center', elevation: 3, shadowOpacity: 0.1, shadowRadius: 5
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1D3C58' },
  createCircle: {
    width: 38, height: 38, backgroundColor: '#1D3C58', borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', elevation: 3
  },
  scrollContent: { paddingBottom: 40 },
  centeredWrapper: { alignSelf: 'center', width: '100%', maxWidth: 750, paddingHorizontal: 20 },
  
  sectionLabel: { fontSize: 18, fontWeight: '800', color: '#1D3C58', marginBottom: 15, marginLeft: 5 },

  groupCard: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    elevation: 3, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  iconBox: { backgroundColor: '#795548', width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  cardSubtitle: { fontSize: 13, color: "#64748B", marginTop: 2, fontWeight: '500' },

  badge: { backgroundColor: 'rgba(121, 85, 72, 0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeText: { color: '#795548', fontWeight: '800', fontSize: 12 },

  emptyContainer: { alignItems: 'center', marginTop: 60, opacity: 0.5 },
  emptyText: { color: '#64748B', textAlign: 'center', fontSize: 15, marginTop: 10, fontWeight: '500' }
});