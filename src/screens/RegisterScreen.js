import React, { useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  Image
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ESCOLAS = ["ESE", "ESS", "ESTG", "ESA", "ESCE", "ESDL"];
const CURSOS = ["Agronomia", "Engenharia Informática", "Enfermagem", "Artes Plásticas","Contabilidade","Desporto e Lazer","Engenharia Civil", "Engenharia Mecânica"];
// cursos disponíveis por escola (ajusta se quiseres mais cursos)
const CURSOS_POR_ESCOLA = {
  ESA: ["Agronomia"],
  ESTG: ["Engenharia Informática", "Engenharia Civil", "Engenharia Mecânica"],
  ESS: ["Enfermagem"],
  ESE: ["Artes Plásticas"],   // por agora sem cursos associados
  ESCE: ["Contabilidade"],
  ESDL: ["Desporto e Lazer"],
};



const API_BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

export default function RegisterScreen({ navigation }) {

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Image 
          source={require('../../assets/icon.png')} 
          style={{ width: 120, height: 40, resizeMode: 'contain'}} 
        />
      ),
      headerStyle: {
          backgroundColor: '#F6F9FC',
      },
      headerTitleAlign: 'left', 
    });
  }, [navigation]);
  const [primeiroNome, setPrimeiroNome] = useState("");
  const [ultimoNome, setUltimoNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [escola, setEscola] = useState("");
  const [curso, setCurso] = useState("");
  const [ano, setAno] = useState("");
  const [loading, setLoading] = useState(false);
  const cursosDisponiveis = escola ? CURSOS_POR_ESCOLA[escola] || [] : [];


 async function handleRegister() {
  if (
    !primeiroNome ||
    !ultimoNome ||
    !email ||
    !password ||
    !escola ||
    !curso ||
    !ano
  ) {
    Alert.alert("Campos em falta", "Preenche todos os campos.");
    return;
  }

  try {
    setLoading(true);

    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primeiroNome,
        ultimoNome,
        email,
        password,
        escola,
        curso,
        ano,
      }),
    });

    const data = await res.json();
    console.log("REGISTER:", res.status, data);

    if (!res.ok) {
      Alert.alert("Erro", data.error || "Não foi possível criar conta.");
      return;
    }

    // ✅ Mensagem de sucesso + ir para Login ao carregar em OK
    Alert.alert("Sucesso", "Conta criada com sucesso!", [
      {
        text: "OK",
        onPress: () => navigation.navigate("Login"),
      },
    ]);
  } catch (err) {
    console.log("ERRO AO REGISTAR:", err);
    Alert.alert("Erro", "Ocorreu um erro ao criar conta.");
  } finally {
    setLoading(false);
  }
}


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Criar Conta</Text>

      <TextInput
        style={styles.input}
        placeholder="Primeiro nome"
        value={primeiroNome}
        onChangeText={setPrimeiroNome}
      />

      <TextInput
        style={styles.input}
        placeholder="Último nome"
        value={ultimoNome}
        onChangeText={setUltimoNome}
      />

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Text style={styles.label}>Escola (IPVC)</Text>
      <View style={styles.escolasRow}>
        {ESCOLAS.map((cod) => (
          <Pressable
            key={cod}
            style={[
              styles.escolaChip,
              escola === cod && styles.escolaChipSelected,
            ]}
            onPress={() => setEscola(cod)}
          >
            <Text
              style={[
                styles.escolaChipText,
                escola === cod && styles.escolaChipTextSelected,
              ]}
            >
              {cod}
            </Text>
          </Pressable>
        ))}
      </View>

            <Text style={styles.label}>Curso</Text>

            {!escola ? (
              <Text style={styles.helperText}>
                Escolhe primeiro a escola.
              </Text>
            ) : cursosDisponiveis.length === 0 ? (
              <Text style={styles.helperText}>
                Ainda não há cursos configurados para esta escola.
              </Text>
            ) : (
              <View style={styles.escolasRow}>
                {cursosDisponiveis.map((c) => (
                  <Pressable
                    key={c}
                    style={[
                      styles.escolaChip,
                      curso === c && styles.escolaChipSelected,
                    ]}
                    onPress={() => setCurso(c)}
                  >
                    <Text
                      style={[
                        styles.escolaChipText,
                        curso === c && styles.escolaChipTextSelected,
                      ]}
                    >
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}


      <TextInput
        style={styles.input}
        placeholder="Ano (ex: 1, 2, 3)"
        value={ano}
        onChangeText={setAno}
        keyboardType="numeric"
      />

      <Pressable
        onPress={handleRegister}
        disabled={loading}
        style={({ pressed, hovered }) => [
          styles.button,
          hovered && styles.buttonHover,
          pressed && { opacity: 0.7 }
        ]}
      >
        <Text style={styles.buttonText}>
          {loading ? "A criar..." : "Criar conta"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#F6F9FC",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
  },
  escolasRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  escolaChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#FFFFFF"
  },
  escolaChipSelected: {
    backgroundColor: "#1D3C58",
    borderColor: "#1D3C58",
  },
  escolaChipText: {
    fontSize: 13,
    color: "#333",
  },
  escolaChipTextSelected: {
    color: "#fff",
  },
  button: {
    backgroundColor: "#1D3C58",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonHover: {
    backgroundColor: "#2E5B82",  
  },

  helperText: {
  fontSize: 12,
  color: "#666",
  marginBottom: 12,
},

});
