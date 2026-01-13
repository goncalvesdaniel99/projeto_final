import React, { useState } from "react";
import {
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { ScrollView } from "react-native";

export default function CreateGroupScreen({ navigation }) {
  const cursos = {
    "Engenharia Informática": {
      1: [
        "AED",
        "Matemática Discreta",
        "Álgebra Linear",
        "ASC",
        "Analise",
        "Prog1",
        "Estatistica",
        "SO",
      ],
      2: [
        "Bases de Dados",
        "Projeto1",
        "Redes de Computadores",
        "Engenharia de Software",
        "Prog2",
        "Projeto2",
        "IHM",
        "Multimedia",
        "Inteligencia Artificial",
      ],
      3: ["Gestao de Projetos", "IS", "SIR", "Projeto3", "IE", "Projeto4"],
    },
  };

  const [curso, setCurso] = useState("Engenharia Informática");
  const [ano, setAno] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [maxPessoas, setMaxPessoas] = useState("");

  const anosDisponiveis = [1, 2, 3];
  const disciplinasDisponiveis = ano ? cursos[curso][ano] : [];

  async function criarGrupo() {
    try {
      if (!ano || !disciplina || !maxPessoas) {
        Toast.show({
          type: "error",
          text1: "Preenche todos os campos obrigatórios.",
        });
        return;
      }

      const token = await AsyncStorage.getItem("token");

      const API_URL =
        Platform.OS === "android"
          ? "http://10.0.2.2:3000"
          : "http://localhost:3000";

      const res = await fetch(`${API_URL}/groups/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          curso,
          ano,
          disciplina,
          maxPessoas: Number(maxPessoas),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Toast.show({ type: "error", text1: data.error || "Erro ao criar grupo" });
        return;
      }

      Toast.show({ type: "success", text1: "Grupo criado com sucesso!" });

      // --- AQUI ESTÁ A CORREÇÃO ---
      setTimeout(() => {
        navigation.reset({
          index: 0, // Agora é 0 porque só há uma rota na pilha
          routes: [
            { name: "MyGroups" }, // Redireciona apenas para a lista de grupos
          ],
        });
      }, 1500);
    } catch (err) {
      console.log(err);
      Toast.show({ type: "error", text1: "Erro de conexão." });
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={styles.title}>Criar Grupo</Text>

      <Text style={styles.label}>Curso</Text>
      <Text style={styles.valueBox}>{curso}</Text>

      <Text style={styles.label}>Ano</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {anosDisponiveis.map((a) => (
          <TouchableOpacity
            key={a}
            style={[
              styles.option,
              ano === a && styles.optionSelected, // Estilo visual para selecionado
            ]}
            onPress={() => {
              setAno(a);
              setDisciplina(""); // Limpa disciplina ao mudar o ano
            }}
          >
            <Text style={styles.optionText}>{a}º Ano</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Disciplina</Text>
      {ano !== "" ? (
        disciplinasDisponiveis.map((d, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.option,
              disciplina === d && styles.optionSelected, // Estilo visual para selecionado
            ]}
            onPress={() => setDisciplina(d)}
          >
            <Text style={styles.optionText}>{d}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.info}>Escolhe primeiro o ano</Text>
      )}

      <Text style={styles.label}>Máximo de Pessoas</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        onChangeText={setMaxPessoas}
        value={maxPessoas}
        placeholder="Ex: 5"
      />

      <TouchableOpacity style={styles.button} onPress={criarGrupo}>
        <Text style={styles.buttonText}>Criar Grupo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#F6F9FC" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 15 },
  label: { fontSize: 16, marginTop: 10, fontWeight: "600" },
  valueBox: {
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginTop: 5,
    borderColor: "#ccc",
    borderWidth: 1,
    color: "#555",
  },
  option: {
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginTop: 5,
    borderColor: "#ccc",
    borderWidth: 1,
    marginRight: 8, // Espaçamento se estiverem lado a lado
  },
  optionText: { fontSize: 16 },
  optionSelected: {
    borderColor: "#1D3C58",
    backgroundColor: "#D1E1F2",
  },
  info: { color: "#888", paddingVertical: 5, fontStyle: "italic" },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
    backgroundColor: "#FFFFFF",
    borderColor: "#ccc",
  },
  button: {
    backgroundColor: "#1D3C58",
    padding: 15,
    borderRadius: 8,
    marginTop: 30,
  },
  buttonText: { color: "#FFF", textAlign: "center", fontWeight: "bold", fontSize: 16 },
});