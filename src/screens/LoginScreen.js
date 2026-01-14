import React, { useState, useRef } from "react"; 
import { View, Text, TextInput, StyleSheet, Pressable, Alert, Platform, Image, KeyboardAvoidingView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const passwordRef = useRef(null);

  const fazerLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erro", "Por favor, preenche todos os campos.");
      return;
    }

    try {
      const API_URL = Platform.OS === 'android' ? "http://10.0.2.2:3000" : "http://localhost:3000";

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok || !data.token) {
        Alert.alert("Erro", data.error || "Login inválido");
        return;
      }

      // --- DADOS DO UTILIZADOR ---
      const userId = data.user.id || data.user._id;
      const userName = data.user.nome;
      
      // 🔥 FIX: Tenta encontrar a foto em vários sítios da resposta
      let photoPath = data.user.foto || data.foto || null;
      let photoUrl = null;
      
      if (photoPath) {
        photoUrl = photoPath.startsWith('http') ? photoPath : `${API_URL}${photoPath}`;
      }

      // --- GUARDAR TUDO (WEB E MOBILE) ---
      if (Platform.OS === "web") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", userId);
        localStorage.setItem("userName", userName);
        localStorage.setItem("userEmail", email);
        if (photoUrl) localStorage.setItem("userPhoto", photoUrl);
      } else {
        await AsyncStorage.setItem("token", data.token);
        await AsyncStorage.setItem("userId", userId);
        await AsyncStorage.setItem("userName", userName);
        await AsyncStorage.setItem("userEmail", email);
        if (photoUrl) await AsyncStorage.setItem("userPhoto", photoUrl);
      }

      console.log("✅ Login OK. Foto guardada:", photoUrl);
      
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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} />

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          onChangeText={setEmail}
          value={email}
          autoCapitalize="none"
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#F6F9FC" },
  registerRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  registerLink: { color: "#000000", fontWeight: "bold", marginLeft: 5 },
  input: { height: 50, borderWidth: 1, borderColor: "#1D3C58", borderRadius: 8, paddingHorizontal: 15, marginBottom: 15, backgroundColor: "#FFFFFF", fontSize: 16 },
  logo: { width: "100%", height: 250, alignSelf: "center", marginBottom: 30, resizeMode: "contain" },
  button: { height: 50, borderWidth: 1, borderColor: "#1D3C58", borderRadius: 8, paddingHorizontal: 15, marginTop: 10, backgroundColor: "#1D3C58", justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 18, alignSelf: "center" },
  buttonHover: { backgroundColor: "#2E5B82" },
});