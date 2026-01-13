import React, { useState, useRef } from "react"; 
import { View, Text, TextInput, StyleSheet, Pressable, Alert, Platform, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const passwordRef = useRef(null);

  const fazerLogin = async () => {
    try {
      // URL Automático (para funcionar em Android e iOS/Web)
      const API_URL = Platform.OS === 'android' ? "http://10.0.2.2:3000" : "http://localhost:3000";

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      console.log("RESPOSTA LOGIN:", data);

      if (!res.ok || !data.token) {
        Alert.alert("Erro", data.error || "Login inválido");
        return;
      }

      // --- CORREÇÃO AQUI: GUARDAR TODOS OS DADOS ---
      const userId = data.user.id || data.user._id;
      const userName = data.user.nome; // O backend envia 'nome'

      if (Platform.OS === "web") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", userId);
        localStorage.setItem("userName", userName); // <--- OBRIGATÓRIO PARA O CHAT
      } else {
        await AsyncStorage.setItem("token", data.token);
        await AsyncStorage.setItem("userId", userId);
        await AsyncStorage.setItem("userName", userName); // <--- OBRIGATÓRIO PARA O CHAT
      }

      console.log("✅ Login OK. Dados guardados:", userId, userName);
      
      // Usa reset para impedir voltar atrás para o login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });

    } catch (err) {
      console.log("ERRO LOGIN:", err);
      Alert.alert("Erro", "Falha ao ligar ao servidor.");
    }
  };

  return (
    <View style={styles.container}>

      <Image 
        source={require('../../assets/logo.png')} 
        style={styles.logo} 
      />

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        onChangeText={setEmail}
        value={email}
        autoCapitalize="none" // Importante para emails
        keyboardType="email-address"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current.focus()} 
        blurOnSubmit={false} 
      />

      <TextInput
        ref={passwordRef} 
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        onChangeText={setPassword}
        value={password}
        returnKeyType="go" 
        onSubmitEditing={fazerLogin} 
      />

      <Pressable 
        onPress={fazerLogin}
        style={({ pressed, hovered }) => [
          styles.button, 
          hovered && styles.buttonHover, 
          pressed && { opacity: 0.7 }  
        ]}
      >
        <Text style={styles.buttonText}>Entrar</Text>
      </Pressable>

      <View style={styles.registerRow}>
        <Text>Não tens conta?</Text>
        <Pressable onPress={() => navigation.navigate("Register")}>
          <Text style={styles.registerLink}> Criar conta</Text>
        </Pressable>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#F6F9FC" },
  title: { fontSize: 24, marginBottom: 20, textAlign: "center" },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  registerLink: {
    color: "#000000", 
    fontWeight: "bold",
  },

  input: { 
    height: 50, 
    borderWidth: 1, 
    borderColor: "#1D3C58", 
    borderRadius: 8,
    paddingHorizontal: 15, 
    marginBottom: 15,
    backgroundColor: "#FFFFFF", 
    fontSize: 16
  },

  logo: {
    width: "100%",       
    height: 300,         
    alignSelf: "center", 
    marginBottom: 20,    
    resizeMode: "contain" 
  },

  button: { 
    height: 50, 
    borderWidth: 1, 
    borderColor: "#1D3C58", 
    borderRadius: 8,
    paddingHorizontal: 15, 
    marginBottom: 15,
    backgroundColor: "#1D3C58", 
    justifyContent: 'center' 
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    alignSelf: "center"
  },

  buttonHover: {
    backgroundColor: "#2E5B82"
  },
});