import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  ScrollView,
  RefreshControl // 👈 1. Importar isto
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

export default function GroupsScreen({ navigation }) {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // 👈 2. Estado para o refresh

  const API_BASE_URL =
    Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

  async function carregarDados() {
    try {
      // Se estivermos a fazer refresh manual, não mostramos o loading gigante
      if (!refreshing) setLoading(true);

      const token = await AsyncStorage.getItem("token");

      // 1. Buscar "meus grupos"
      const resMeus = await fetch(`${API_BASE_URL}/groups/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meus = await resMeus.json();

      // Proteção contra falhas na resposta
      const meusIds = Array.isArray(meus) ? meus.map((g) => g._id) : [];

      // 2. Buscar todos os grupos
      const resAll = await fetch(`${API_BASE_URL}/groups/all`);
      const todos = await resAll.json();

      if (!Array.isArray(todos)) {
        console.log("Erro: Formato de grupos inválido");
        setGrupos([]);
        return;
      }

      // 3. Filtrar → só mostrar grupos onde ainda NÃO estou
      const filtrados = todos.filter((g) => !meusIds.includes(g._id));

      setGrupos(filtrados);
    } catch (err) {
      console.log("⚠ Erro ao carregar grupos disponíveis:", err);
    } finally {
      setLoading(false);
      setRefreshing(false); // 👈 Parar a animação do refresh
    }
  }

  // Recarrega ao entrar no ecrã
  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  // 👈 3. Função chamada ao puxar para baixo
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarDados();
  }, []);

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1D3C58" />
        <Text style={{marginTop: 10}}>A carregar grupos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com botão Criar Grupo */}
      <View style={styles.topRow}>
        <Text style={styles.title}>Grupos Disponíveis</Text>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate("CreateGroup")}
        >
          <Text style={styles.createText}>+ Criar Grupo</Text>
        </TouchableOpacity>
      </View>

      {grupos.length === 0 && !loading && (
        <Text style={{ marginTop: 20, textAlign: 'center', color: '#666' }}>
          Não há mais grupos disponíveis neste momento.
        </Text>
      )}

      {/* 👇 ScrollView com Pull to Refresh */}
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#1D3C58" // Cor do loading no iOS
            colors={["#1D3C58"]} // Cor do loading no Android
          />
        }
      >
        {grupos.map((g) => (
          <TouchableOpacity
            key={g._id}
            style={styles.card}
            onPress={() => navigation.navigate("GroupDetails", { grupo: g })}
          >
            <Text style={styles.cardTitle}>{g.disciplina} ({g.ano}º Ano)</Text>
            
            {/* Verifica se g.membros existe antes de ler o length */}
            <Text style={styles.cardSub}>
              Ocupação: {g.membros ? g.membros.length : 0}/{g.maxPessoas}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15
  },

  title: { fontSize: 22, fontWeight: "bold" },

  card: {
    padding: 15,
    backgroundColor: "#F6F9FC",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EEE"
  },

  cardTitle: { fontSize: 18, fontWeight: "600", color: "#1D3C58" },
  cardSub: { marginTop: 5, color: "#555" },

  createBtn: {
    backgroundColor: "#1D3C58",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },

  createText: { color: "#fff", fontWeight: "bold" },
});