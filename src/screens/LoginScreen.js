import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // --- ESTADOS DE ERRO ESPECÍFICOS ---
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  // --- ESTADO DE ERRO GERAL (NOVO) ---
  const [generalError, setGeneralError] = useState("");
  
  // --- ESTADO DE FOCO ---
  const [focusedInput, setFocusedInput] = useState(null);

  const passwordRef = useRef(null);

  const fazerLogin = async () => {
    // 1. Limpar todos os erros
    setEmailError("");
    setPasswordError("");
    setGeneralError("");

    let isValid = true;

    // Validação local (campos vazios)
    if (!email.trim()) {
      setEmailError("Campo obrigatório");
      isValid = false;
    }
    
    if (!password.trim()) {
      setPasswordError("Campo obrigatório");
      isValid = false;
    }

    if (!isValid) return;

    try {
      const API_URL = Platform.OS === 'android' ? "http://10.0.2.2:3000" : "http://localhost:3000";

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      console.log("RESPOSTA LOGIN:", data);

      if (!res.ok || !data.token) {
        // --- ALTERAÇÃO AQUI ---
        // Em vez de definir erro em cada campo, definimos um erro geral
        setGeneralError("Email ou password incorretos");
        return;
      }

      const userId = data.user.id || data.user._id;
      const userName = data.user.nome;

      if (Platform.OS === "web") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", userId);
        localStorage.setItem("userName", userName);
      } else {
        await AsyncStorage.setItem("token", data.token);
        await AsyncStorage.setItem("userId", userId);
        await AsyncStorage.setItem("userName", userName);
      }

      console.log("✅ Login OK. Dados guardados:", userId, userName);
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });

    } catch (err) {
      console.log("ERRO LOGIN:", err);
      Alert.alert("Erro", "Falha ao ligar ao servidor.");
    }
  };

  const colors = {
    backgroundTop: '#EBF7FF',
    backgroundBottom: '#A8D8FF',
    darkBlue: '#1D3C58',
    buttonGradientTop: '#5FA4E6',
    buttonGradientBottom: '#3F88C5',
    inputBorder: '#E0E0E0',
    error: '#FF4444', 
    white: '#FFFFFF',
    inactiveText: '#A0A0A0'
  };

  return (
    <LinearGradient
      colors={[colors.backgroundTop, colors.backgroundBottom]}
      style={styles.mainContainer}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* LOGO */}
          <View style={styles.logoContainerOuter}>
            <View style={styles.logoContainerInner}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoImage}
              />
            </View>
          </View>

          {/* CARTÃO / MODAL */}
          <View style={styles.cardContainer}>
            
            {/* ABAS DO TOPO */}
            <View style={styles.tabsContainer}>
              <View style={[styles.tab, styles.activeTab]}>
                <Text style={styles.activeTabText}>Iniciar Sessão</Text>
              </View>

              <Pressable 
                style={styles.tab} 
                onPress={() => navigation.navigate("Register")}
              >
                <Text style={styles.inactiveTabText}>Criar Conta</Text>
              </Pressable>
            </View>

            {/* CONTEÚDO DO FORMULÁRIO */}
            <View style={styles.formContent}>
              
              {/* --- INPUT EMAIL --- */}
              <View style={[
                styles.inputContainer, 
                // Fica vermelho se houver erro específico OU erro geral
                (emailError || generalError) ? styles.inputError : null,
                (!(emailError || generalError) && focusedInput === 'email') ? styles.inputFocused : null
              ]}>
                <Ionicons 
                    name="mail-outline" 
                    size={20} 
                    color={(emailError || generalError) ? colors.error : (focusedInput === 'email' ? colors.darkBlue : "#999")} 
                    style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.inputField}
                  placeholder="E-mail"
                  placeholderTextColor="#999"
                  onChangeText={(text) => {
                    setEmail(text);
                    if(emailError) setEmailError("");
                    if(generalError) setGeneralError(""); // Limpa erro geral ao escrever
                  }}
                  value={email}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current.focus()}
                  blurOnSubmit={false}
                />
              </View>
              {/* Mostra erro específico (ex: "Campo obrigatório") se existir */}
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}


              {/* --- INPUT PASSWORD --- */}
              <View style={[
                styles.inputContainer, 
                // Fica vermelho se houver erro específico OU erro geral
                (passwordError || generalError) ? styles.inputError : null,
                (!(passwordError || generalError) && focusedInput === 'password') ? styles.inputFocused : null
              ]}>
                <Ionicons 
                    name="lock-closed-outline" 
                    size={20} 
                    color={(passwordError || generalError) ? colors.error : (focusedInput === 'password' ? colors.darkBlue : "#999")} 
                    style={styles.inputIcon} 
                />
                <TextInput
                  ref={passwordRef}
                  style={styles.inputField}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  secureTextEntry
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  onChangeText={(text) => {
                    setPassword(text);
                    if(passwordError) setPasswordError("");
                    if(generalError) setGeneralError(""); // Limpa erro geral ao escrever
                  }}
                  value={password}
                  returnKeyType="go"
                  onSubmitEditing={fazerLogin}
                />
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

              {/* --- MENSAGEM DE ERRO GERAL (ÚNICA) --- */}
              {generalError ? (
                <View style={styles.generalErrorContainer}>
                   <Ionicons name="alert-circle-outline" size={16} color="#FF4444" style={{marginRight: 4}} />
                   <Text style={styles.generalErrorText}>{generalError}</Text>
                </View>
              ) : null}

              <TouchableOpacity 
                onPress={() => Alert.alert("Recuperar", "Funcionalidade futura!")}
                style={{ alignSelf: 'flex-end', marginBottom: 20, marginTop: 5 }}
              >
                <Text style={{ color: '#3F88C5', fontWeight: '600', fontSize: 14 }}>
                  Não sabes a tua password?
                </Text>
              </TouchableOpacity>

              {/* Botão Entrar */}
              <Pressable
                onPress={fazerLogin}
                style={({ pressed }) => [
                  styles.buttonTouchable,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                ]}
              >
                <LinearGradient
                  colors={[colors.buttonGradientTop, colors.buttonGradientBottom]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Entrar</Text>
                </LinearGradient>
              </Pressable>

            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    alignItems: "center",
  },

  logoContainerOuter: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 30,
    borderRadius: 150, 
  },
  logoContainerInner: {
    backgroundColor: "#FFFFFF",
    width: 250,
    height: 250, 
    borderRadius: 125,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    overflow: 'hidden',
  },
  logoImage: {
    width: '200%',
    height: '200%',
    resizeMode: "contain",
  },

  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },

  tabsContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  tab: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#1D3C58',
  },
  activeTabText: {
    color: '#1D3C58',
    fontWeight: 'bold',
    fontSize: 16,
  },
  inactiveTabText: {
    color: '#A0A0A0',
    fontWeight: '600',
    fontSize: 16,
  },

  formContent: {
    padding: 25,
    alignItems: 'center',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F9FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 55,
    marginBottom: 5, 
    paddingHorizontal: 15,
    width: '100%',
  },
  
  inputError: {
    borderColor: '#FF4444',
    borderWidth: 1.5,
  },
  
  inputFocused: {
    borderColor: '#cde5fd',
    borderWidth: 2,
    backgroundColor: '#FFF', 
  },

  // Texto de erro específico (por baixo do input)
  errorText: {
    alignSelf: 'flex-start',
    color: '#FF4444',
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 5,
  },

  // --- ESTILOS DO ERRO GERAL ---
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 5,
  },
  generalErrorText: {
    color: '#FF4444',
    fontSize: 13,
    fontWeight: '600',
  },

  inputIcon: {
    marginRight: 10,
  },
  
  inputField: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#1D3C58',
    ...Platform.select({
      web: { outlineStyle: 'none' }
    })
  },

  buttonTouchable: {
    width: '100%',
    marginTop: 10,
    shadowColor: "#5FA4E6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonGradient: {
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
});
