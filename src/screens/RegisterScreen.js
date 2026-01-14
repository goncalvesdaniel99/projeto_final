import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, 
  ScrollView, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message'; 

export default function RegisterScreen({ navigation }) {
  // DADOS PRINCIPAIS
  const [primeiroNome, setPrimeiroNome] = useState("");
  const [ultimoNome, setUltimoNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ano, setAno] = useState(null);
  
  // INFORMAÇOES ESCOLA
  const [escola, setEscola] = useState(null);
  const [grau, setGrau] = useState(null); 
  const [curso, setCurso] = useState(null); 

  // ESTADOS DE ERRO
  const [primeiroNomeError, setPrimeiroNomeError] = useState("");
  const [ultimoNomeError, setUltimoNomeError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [escolaError, setEscolaError] = useState("");
  const [grauError, setGrauError] = useState("");
  const [cursoError, setCursoError] = useState("");
  const [anoError, setAnoError] = useState("");

  // VISIBILIDADE DOS DROPDOWNS
  const [openEscola, setOpenEscola] = useState(false);
  const [openGrau, setOpenGrau] = useState(false);
  const [openCurso, setOpenCurso] = useState(false);
  const [openAno, setOpenAno] = useState(false);

  // ESTADO DE FOCO 
  const [focusedInput, setFocusedInput] = useState(null);

  // DADOS API
  const [dadosAPI, setDadosAPI] = useState([]); 
  const [loadingData, setLoadingData] = useState(true);
  const [loadingRegister, setLoadingRegister] = useState(false);

  // Cores
  const colors = {
    backgroundTop: '#EBF7FF',
    backgroundBottom: '#A8D8FF',
    darkBlue: '#1D3C58',
    buttonGradientTop: '#5FA4E6',
    buttonGradientBottom: '#3F88C5',
    inputBorder: '#E0E0E0',
    white: '#FFFFFF',
    error: '#FF4444',
    focusBorder: '#cde5fd'
  };

  const getApiUrl = () => {
    if (Platform.OS === 'web') return "http://localhost:3000";
    if (Platform.OS === 'android') return "http://10.0.2.2:3000"; 
    return "http://localhost:3000"; 
  };
  const BASE_URL = getApiUrl();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/schools`);
        const data = await res.json();
        if(Array.isArray(data)) setDadosAPI(data);
      } catch (e) {
        Alert.alert("Erro", "Falha ao carregar escolas.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // LÓGICA DE DADOS 
  const escolaObj = dadosAPI.find(item => item.nome === escola);
  const listaGraus = escolaObj && escolaObj.graus ? Object.keys(escolaObj.graus) : [];
  const listaCursos = (escolaObj && grau && escolaObj.graus[grau]) ? escolaObj.graus[grau] : [];

  let listaAnos = [];
  if (grau) {
    if (grau.includes("Licenciatura")) listaAnos = ["1", "2", "3"];
    else if (grau.includes("Mestrado") || grau.includes("CTeSP")) listaAnos = ["1", "2"];
    else if (grau.includes("Pós-Graduação")) listaAnos = ["1"];
    else listaAnos = ["1"];
  }

  const closeAllDropdowns = () => {
    setOpenEscola(false); setOpenGrau(false); setOpenCurso(false); setOpenAno(false);
  };

  // VALIDAÇÃO E REGISTO 
  const handleRegister = async () => {
    setPrimeiroNomeError(""); setUltimoNomeError(""); setEmailError("");
    setPasswordError(""); setEscolaError(""); setGrauError(""); 
    setCursoError(""); setAnoError("");

    let isValid = true;

    if (!primeiroNome.trim()) { setPrimeiroNomeError("Obrigatório"); isValid = false; }
    if (!ultimoNome.trim()) { setUltimoNomeError("Obrigatório"); isValid = false; }
    if (!email.trim()) { setEmailError("Obrigatório"); isValid = false; }
    if (!password.trim()) { setPasswordError("Obrigatório"); isValid = false; }
    
    if (!escola) { setEscolaError("Selecione uma escola"); isValid = false; }
    if (!grau) { setGrauError("Selecione um grau"); isValid = false; }
    if (!curso) { setCursoError("Selecione um curso"); isValid = false; }
    if (!ano) { setAnoError("Selecione um ano"); isValid = false; }

    if (!isValid) return;

    setLoadingRegister(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primeiroNome, ultimoNome, email, password, escola, grau, curso, ano })
      });
      const data = await response.json();
      
      // 2. LÓGICA DE SUCESSO AUTOMÁTICO
      if (response.ok) {
        Toast.show({
            type: 'success',
            text1: 'Conta criada com sucesso!',
            text2: 'A redirecionar para o login...',
            position: 'top',
            visibilityTime: 2000,
        });

        setTimeout(() => {
            navigation.navigate("Login");
        }, 1500);

      } else {
        if(data.error && data.error.includes("Email")) {
             setEmailError(data.error);
        } else {
             Alert.alert("Erro", data.error || "Erro no registo.");
        }
      }
    } catch (error) { Alert.alert("Erro", "Falha na conexão."); } 
    finally { setLoadingRegister(false); }
  };

  return (
    <LinearGradient
      colors={[colors.backgroundTop, colors.backgroundBottom]}
      style={styles.mainContainer}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

          {/* LOGO */}
          <View style={styles.logoContainerOuter}>
            <View style={styles.logoContainerInner}>
              <Image source={require('../../assets/logo.png')} style={styles.logoImage} />
            </View>
          </View>

          {/* CARTÃO BRANCO */}
          <View style={styles.cardContainer}>
            
            {/* ABAS DO TOPO */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate("Login")}>
                <Text style={styles.inactiveTabText}>Iniciar Sessão</Text>
              </TouchableOpacity>
              <View style={[styles.tab, styles.activeTab]}>
                <Text style={styles.activeTabText}>Criar Conta</Text>
              </View>
            </View>

            {/* CONTEÚDO DO FORMULÁRIO */}
            <View style={styles.formContent}>

              {/* Nomes (Lado a Lado) */}
              <View style={styles.row}>
                <View style={{flex:1, marginRight:5}}>
                  <View style={[
                      styles.inputContainer, 
                      primeiroNomeError ? styles.inputError : null,
                      (!primeiroNomeError && focusedInput === 'primeiroNome') ? styles.inputFocused : null
                  ]}>
                    <TextInput 
                      style={styles.inputField} 
                      placeholder="Nome" 
                      placeholderTextColor="#999" 
                      value={primeiroNome} 
                      onFocus={() => setFocusedInput('primeiroNome')}
                      onBlur={() => setFocusedInput(null)}
                      onChangeText={(t) => {setPrimeiroNome(t); if(primeiroNomeError) setPrimeiroNomeError("")}} 
                    />
                  </View>
                  {primeiroNomeError ? <Text style={styles.errorText}>{primeiroNomeError}</Text> : null}
                </View>

                <View style={{flex:1, marginLeft:5}}>
                  <View style={[
                      styles.inputContainer, 
                      ultimoNomeError ? styles.inputError : null,
                      (!ultimoNomeError && focusedInput === 'ultimoNome') ? styles.inputFocused : null
                  ]}>
                    <TextInput 
                      style={styles.inputField} 
                      placeholder="Apelido" 
                      placeholderTextColor="#999" 
                      value={ultimoNome} 
                      onFocus={() => setFocusedInput('ultimoNome')}
                      onBlur={() => setFocusedInput(null)}
                      onChangeText={(t) => {setUltimoNome(t); if(ultimoNomeError) setUltimoNomeError("")}} 
                    />
                  </View>
                  {ultimoNomeError ? <Text style={styles.errorText}>{ultimoNomeError}</Text> : null}
                </View>
              </View>

              {/* Email */}
              <View style={[
                  styles.inputContainer, 
                  emailError ? styles.inputError : null,
                  (!emailError && focusedInput === 'email') ? styles.inputFocused : null
              ]}>
                <Ionicons 
                    name="mail-outline" 
                    size={20} 
                    color={emailError ? colors.error : (focusedInput === 'email' ? colors.darkBlue : "#999")} 
                    style={styles.inputIcon} 
                />
                <TextInput 
                  style={styles.inputField} 
                  placeholder="Email" 
                  placeholderTextColor="#999" 
                  value={email} 
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  onChangeText={(t) => {setEmail(t); if(emailError) setEmailError("")}} 
                  keyboardType="email-address" 
                  autoCapitalize="none"
                />
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

              {/* Password */}
              <View style={[
                  styles.inputContainer, 
                  passwordError ? styles.inputError : null,
                  (!passwordError && focusedInput === 'password') ? styles.inputFocused : null
              ]}>
                <Ionicons 
                    name="lock-closed-outline" 
                    size={20} 
                    color={passwordError ? colors.error : (focusedInput === 'password' ? colors.darkBlue : "#999")} 
                    style={styles.inputIcon} 
                />
                <TextInput 
                  style={styles.inputField} 
                  placeholder="Password" 
                  placeholderTextColor="#999" 
                  secureTextEntry 
                  value={password} 
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  onChangeText={(t) => {setPassword(t); if(passwordError) setPasswordError("")}} 
                />
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

              {/* 1. SELETOR DE ESCOLA */}
              <Text style={styles.label}>Escola</Text>
              <TouchableOpacity 
                style={[
                    styles.selector, 
                    escolaError ? styles.inputError : null,
                    (!escolaError && openEscola) ? styles.inputFocused : null
                ]} 
                onPress={() => {closeAllDropdowns(); setOpenEscola(!openEscola);}}
              >
                <Text style={escola ? styles.selectorText : styles.placeholderText}>{escola || "Selecionar..."}</Text>
                {loadingData ? <ActivityIndicator size="small"/> : <Ionicons name="caret-down" size={20} color={escolaError ? colors.error : (openEscola ? colors.darkBlue : "#666")} />}
              </TouchableOpacity>
              {escolaError ? <Text style={styles.errorText}>{escolaError}</Text> : null}
              
              {openEscola && (
                <View style={styles.dropdownContainer}>
                  <ScrollView nestedScrollEnabled style={{maxHeight: 150}}>
                    {dadosAPI.map((item, i) => (
                      <TouchableOpacity key={i} style={styles.dropdownItem} onPress={() => {
                          setEscola(item.nome); setGrau(null); setCurso(null); setAno(null); 
                          setEscolaError(""); 
                          closeAllDropdowns();
                      }}>
                        <Text style={styles.optionText}>{item.nome}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* 2. SELETOR DE GRAU */}
              <Text style={styles.label}>Grau Académico</Text>
              <TouchableOpacity 
                style={[
                    styles.selector, 
                    !escola && styles.disabledSelector, 
                    grauError ? styles.inputError : null,
                    (!grauError && openGrau) ? styles.inputFocused : null
                ]} 
                onPress={() => {closeAllDropdowns(); setOpenGrau(!openGrau);}} 
                disabled={!escola}
              >
                <Text style={grau ? styles.selectorText : styles.placeholderText}>{grau || "Selecionar..."}</Text>
                <Ionicons name="caret-down" size={20} color={grauError ? colors.error : (openGrau ? colors.darkBlue : "#666")} />
              </TouchableOpacity>
              {grauError ? <Text style={styles.errorText}>{grauError}</Text> : null}

              {openGrau && (
                <View style={styles.dropdownContainer}>
                  <ScrollView nestedScrollEnabled style={{maxHeight: 150}}>
                    {listaGraus.map((g, i) => (
                      <TouchableOpacity key={i} style={styles.dropdownItem} onPress={() => {
                          setGrau(g); setCurso(null); setAno(null); 
                          setGrauError(""); 
                          closeAllDropdowns();
                      }}>
                        <Text style={styles.optionText}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* 3. SELETOR DE CURSO */}
              <Text style={styles.label}>Curso</Text>
              <TouchableOpacity 
                style={[
                    styles.selector, 
                    !grau && styles.disabledSelector, 
                    cursoError ? styles.inputError : null,
                    (!cursoError && openCurso) ? styles.inputFocused : null
                ]} 
                onPress={() => {closeAllDropdowns(); setOpenCurso(!openCurso);}} 
                disabled={!grau}
              >
                <Text style={curso ? styles.selectorText : styles.placeholderText}>{curso || "Selecionar..."}</Text>
                <Ionicons name="caret-down" size={20} color={cursoError ? colors.error : (openCurso ? colors.darkBlue : "#666")} />
              </TouchableOpacity>
              {cursoError ? <Text style={styles.errorText}>{cursoError}</Text> : null}

              {openCurso && (
                <View style={styles.dropdownContainer}>
                  <ScrollView nestedScrollEnabled style={{maxHeight: 200}}>
                    {listaCursos.map((c, i) => (
                      <TouchableOpacity key={i} style={styles.dropdownItem} onPress={() => {
                          const nomeCurso = c.nome ? c.nome : c;
                          setCurso(nomeCurso); 
                          setCursoError(""); 
                          closeAllDropdowns();
                      }}>
                        <Text style={styles.optionText}>{c.nome ? c.nome : c}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* 4. SELETOR DE ANO */}
              <Text style={styles.label}>Ano Curricular</Text>
              <TouchableOpacity 
                style={[
                    styles.selector, 
                    !grau && styles.disabledSelector, 
                    anoError ? styles.inputError : null,
                    (!anoError && openAno) ? styles.inputFocused : null
                ]} 
                onPress={() => {closeAllDropdowns(); setOpenAno(!openAno);}} 
                disabled={!grau}
              >
                <Text style={ano ? styles.selectorText : styles.placeholderText}>{ano ? `${ano}º Ano` : "Selecionar..."}</Text>
                <Ionicons name="caret-down" size={20} color={anoError ? colors.error : (openAno ? colors.darkBlue : "#666")} />
              </TouchableOpacity>
              {anoError ? <Text style={styles.errorText}>{anoError}</Text> : null}

              {openAno && (
                <View style={styles.dropdownContainer}>
                  {listaAnos.length > 0 ? (
                    <ScrollView nestedScrollEnabled style={{maxHeight: 150}}>
                      {listaAnos.map((a, i) => (
                        <TouchableOpacity key={i} style={styles.dropdownItem} onPress={() => { 
                            setAno(a); 
                            setAnoError(""); 
                            closeAllDropdowns(); 
                        }}>
                          <Text style={styles.optionText}>{a}º Ano</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : <View style={styles.dropdownItem}><Text style={{color:'#999'}}>Selecione um grau primeiro</Text></View>}
                </View>
              )}

              {/* Botão Registar */}
              <TouchableOpacity onPress={handleRegister} style={{marginTop: 25, width: '100%'}}>
                <LinearGradient
                  colors={[colors.buttonGradientTop, colors.buttonGradientBottom]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {loadingRegister ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Registar</Text>}
                </LinearGradient>
              </TouchableOpacity>

            </View>
          </View>
          
          <View style={{height: 50}} />

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 20, alignItems: "center" },

  // --- LOGO ---
  logoContainerOuter: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 8,
    marginBottom: 30, borderRadius: 150, 
  },
  logoContainerInner: {
    backgroundColor: "#FFFFFF", width: 250, height: 250, borderRadius: 125,
    justifyContent: 'center', alignItems: 'center', padding: 20, overflow: 'hidden',
  },
  logoImage: { width: '200%', height: '200%', resizeMode: "contain" },

  // --- CARTÃO ---
  cardContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 400,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, overflow: 'hidden',
  },

  // --- ABAS ---
  tabsContainer: { flexDirection: 'row', width: '100%', backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  tab: { flex: 1, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  activeTab: { backgroundColor: '#FFFFFF', borderBottomWidth: 3, borderBottomColor: '#1D3C58' },
  activeTabText: { color: '#1D3C58', fontWeight: 'bold', fontSize: 16 },
  inactiveTabText: { color: '#A0A0A0', fontWeight: '600', fontSize: 16 },

  // --- CONTEÚDO ---
  formContent: { padding: 25 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },

  // --- INPUTS ---
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F9FC',
    borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0',
    height: 50, marginBottom: 5, paddingHorizontal: 15,
  },
  
  // ESTILOS DE ESTADO (ERRO / FOCO)
  inputError: { borderColor: '#FF4444', borderWidth: 1.5 },
  
  inputFocused: { 
    borderColor: '#cde5fd', 
    borderWidth: 2, 
    backgroundColor: '#FFF' 
  },
  
  errorText: { color: '#FF4444', fontSize: 11, marginBottom: 10, marginLeft: 2 },

  inputIcon: { marginRight: 10 },
  inputField: { 
    flex: 1, height: '100%', fontSize: 16, color: '#1D3C58',
    ...Platform.select({ web: { outlineStyle: 'none' } }) 
  },

  // --- DROPDOWNS ---
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5, marginTop: 5 },
  selector: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F6F9FC', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 5
  },
  disabledSelector: { backgroundColor: '#F0F0F0', borderColor: '#EEE' },
  selectorText: { fontSize: 16, color: '#333' },
  placeholderText: { fontSize: 16, color: '#999' },
  dropdownContainer: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ddd',
    borderTopWidth: 0, borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
    marginTop: -5, paddingVertical: 5, marginBottom: 15
  },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  optionText: { fontSize: 16, color: '#333' },

  // --- BOTÃO ---
  buttonGradient: { height: 55, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
});
