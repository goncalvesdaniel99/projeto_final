import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function GroupDetailsScreen({ route, navigation }) {
  const { grupo } = route.params;
  const [loading, setLoading] = useState(false);

  const API_BASE_URL =
    Platform.OS === "android"
      ? "http://10.0.2.2:3000"
      : "http://localhost:3000";

  async function entrarNoGrupo() {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      // 1. Validar se grupo está cheio
      if (grupo.membros.length >= grupo.maxPessoas) {
        Alert.alert("Atenção", "O grupo está cheio.");
        return;
      }

      // 2. Tentar entrar no grupo
      const res = await fetch(`${API_BASE_URL}/groups/join/${grupo._id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Erro", data.error || "Não foi possível entrar no grupo.");
        return;
      }

      // 3. Sucesso
      Alert.alert("Sucesso", "Entraste no grupo!", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("MyGroups");
          },
        },
      ]);
    } catch (err) {
      console.log(err);
      Alert.alert("Erro", "Algo correu mal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{grupo.disciplina}</Text>

      <View style={styles.box}>
        <Text style={styles.label}>Ano:</Text>
        <Text style={styles.value}>{grupo.ano}</Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>Ocupação:</Text>
        <Text style={styles.value}>
          {grupo.membros.length}/{grupo.maxPessoas}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          grupo.membros.length >= grupo.maxPessoas && { backgroundColor: "#999" },
        ]}
        onPress={entrarNoGrupo}
        disabled={loading || grupo.membros.length >= grupo.maxPessoas}
      >
        <Text style={styles.buttonText}>
          {loading ? "A entrar..." : "Entrar no Grupo"}
        </Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" style={{ marginTop: 15 }} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 25,
    paddingBottom: 60,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 25,
  },

  box: {
    marginBottom: 18,
  },

  label: {
    fontSize: 18,
    fontWeight: "600",
  },

  value: {
    marginTop: 3,
    fontSize: 18,
    color: "#444",
  },

  button: {
    marginTop: 30,
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 10,
  },

  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 17,
    fontWeight: "bold",
  },
});
