import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  ScrollView,
  RefreshControl 
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

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

      // 1. Buscar "meus grupos" para saber onde já estou
      const resMeus = await fetch(`${API_BASE_URL}/groups/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meus = await resMeus.json();
      const meusIds = Array.isArray(meus) ? meus.map((g) => g._id) : [];

      // 2. Buscar TODOS os grupos
      const resAll = await fetch(`${API_BASE_URL}/groups/all`);
      const todos = await resAll.json();

      if (!Array.isArray(todos)) {
        setGrupos([]);
        return;
      }

      // 3. FILTRAGEM AVANÇADA
      const filtrados = todos.filter((g) => {
        const jaSouMembro = meusIds.includes(g._id);
        
        // Verifica se está cheio
        const numeroMembros = g.membros ? g.membros.length : 0;
        const maximo = g.maxPessoas || 100; // Fallback seguro
        const estaCheio = numeroMembros >= maximo;

        // Só mostramos se: NÃO sou membro E o grupo NÃO está cheio
        return !jaSouMembro && !estaCheio;
      });

      setGrupos(filtrados);

    } catch (err) {
      console.log("⚠ Erro ao carregar grupos disponíveis:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

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
      {/* Header */}
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
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Não há grupos disponíveis para te juntares neste momento.
            </Text>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#1D3C58"
            colors={["#1D3C58"]}
          />
        }
      >
        {grupos.map((g) => (
          <TouchableOpacity
            key={g._id}
            style={styles.card}
            // 🔥 CORREÇÃO DE NAVEGAÇÃO AQUI
            // Agora enviamos 'group' e 'id' explicitamente para evitar erros
            onPress={() => navigation.navigate("GroupDetails", { group: g, id: g._id })}
          >
            <View>
                <Text style={styles.cardTitle}>{g.disciplina}</Text>
                <Text style={styles.cardSubtitle}>{g.curso} • {g.ano}º Ano</Text>
            </View>
            
            <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                {g.membros ? g.membros.length : 0}/{g.maxPessoas}
                </Text>
            </View>
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
    marginBottom: 20
  },

  title: { fontSize: 22, fontWeight: "bold", color: "#1D3C58" },

  card: {
    padding: 15,
    backgroundColor: "#F6F9FC",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E3E8EE",
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  cardSubtitle: { fontSize: 13, color: "#666", marginTop: 4 },

  badgeContainer: {
    backgroundColor: '#E1F5FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  badgeText: {
    color: '#0288D1',
    fontWeight: 'bold',
    fontSize: 12
  },

  createBtn: {
    backgroundColor: "#1D3C58",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },

  createText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  
  emptyContainer: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyText: { color: '#888', textAlign: 'center', fontSize: 16 }
});