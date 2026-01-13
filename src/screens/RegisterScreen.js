import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, 
  ScrollView, Modal, FlatList, SafeAreaView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }) {
  // Dados do Formulário
  const [primeiroNome, setPrimeiroNome] = useState("");
  const [ultimoNome, setUltimoNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ano, setAno] = useState("");
  
  // Seleções
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [cursoSelecionado, setCursoSelecionado] = useState(null);

  // Dados da API
  const [listaEscolas, setListaEscolas] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingRegister, setLoadingRegister] = useState(false);

  // Controlos dos Modais de Seleção
  const [modalEscolaVisible, setModalEscolaVisible] = useState(false);
  const [modalCursoVisible, setModalCursoVisible] = useState(false);

  const getApiUrl = () => {
    if (Platform.OS === 'web') return "http://localhost:3000";
    if (Platform.OS === 'android') return "http://10.0.2.2:3000"; 
    return "http://localhost:3000"; 
  };
  const BASE_URL = getApiUrl();

  // --- 1. BUSCAR DADOS AO INICIAR ---
  useEffect(() => {
    const fetchEscolas = async () => {
      try {
        console.log("A carregar escolas...");
        const res = await fetch(`${BASE_URL}/auth/schools`);
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
            setListaEscolas(data);
        } else {
            Alert.alert("Aviso", "Não foram encontradas escolas. Verifica a ligação.");
        }
      } catch (e) {
        console.error(e);
        Alert.alert("Erro", "Erro ao ligar ao servidor.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchEscolas();
  }, []);

  // --- 2. FUNÇÃO DE REGISTO ---
  const handleRegister = async () => {
    if (!primeiroNome || !ultimoNome || !email || !password || !escolaSelecionada || !cursoSelecionado || !ano) {
      Alert.alert("Erro", "Por favor, preenche todos os campos.");
      return;
    }

    setLoadingRegister(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primeiroNome,
          ultimoNome,
          email,
          password,
          escola: escolaSelecionada,
          curso: cursoSelecionado,
          ano
        })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Sucesso", "Conta criada! Podes fazer login.", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert("Erro", data.error || "Algo correu mal.");
      }
    } catch (error) {
      Alert.alert("Erro", "Falha na conexão.");
    } finally {
      setLoadingRegister(false);
    }
  };

  // --- RENDERIZAR ITEM DOS MODAIS ---
  const renderOption = (item, type) => (
    <TouchableOpacity 
      style={styles.optionItem} 
      onPress={() => {
        if (type === 'escola') {
          setEscolaSelecionada(item.nome);
          setCursoSelecionado(null); // Reset ao curso se mudar escola
          setModalEscolaVisible(false);
        } else {
          setCursoSelecionado(item);
          setModalCursoVisible(false);
        }
      }}
    >
      <Text style={styles.optionText}>{type === 'escola' ? item.nome : item}</Text>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#F6F9FC'}}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
        <ScrollView contentContainerStyle={styles.container}>
          
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Junta-te à comunidade académica</Text>

          {/* NOMES */}
          <View style={styles.row}>
            <TextInput style={[styles.input, {flex:1, marginRight:5}]} placeholder="Nome Próprio" value={primeiroNome} onChangeText={setPrimeiroNome} />
            <TextInput style={[styles.input, {flex:1, marginLeft:5}]} placeholder="Apelido" value={ultimoNome} onChangeText={setUltimoNome} />
          </View>

          {/* EMAIL & PASS */}
          <TextInput style={styles.input} placeholder="Email Institucional" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

          {/* SELEÇÃO DE ESCOLA (Dinâmico) */}
          <View style={{marginBottom: 15}}>
              <Text style={styles.label}>Escola</Text>
              <TouchableOpacity 
                style={styles.selector} 
                onPress={() => setModalEscolaVisible(true)}
              >
                <Text style={escolaSelecionada ? styles.selectorText : styles.placeholderText}>
                  {escolaSelecionada || "Selecionar..."}
                </Text>
                {loadingData ? <ActivityIndicator size="small" color="#666"/> : <Ionicons name="caret-down" size={20} color="#666" />}
              </TouchableOpacity>
          </View>

          {/* SELEÇÃO DE CURSO (Depende da Escola) */}
          <View style={{marginBottom: 15}}>
              <Text style={styles.label}>Curso</Text>
              <TouchableOpacity 
                style={[styles.selector, !escolaSelecionada && styles.disabledSelector]} 
                onPress={() => escolaSelecionada && setModalCursoVisible(true)}
                disabled={!escolaSelecionada}
              >
                <Text style={cursoSelecionado ? styles.selectorText : styles.placeholderText}>
                  {cursoSelecionado || "Selecionar..."}
                </Text>
                <Ionicons name="caret-down" size={20} color="#666" />
              </TouchableOpacity>
          </View>

          {/* ANO */}
          <TextInput 
            style={styles.input} 
            placeholder="Ano Curricular (Ex: 1, 2, 3)" 
            keyboardType="numeric" 
            value={ano} 
            onChangeText={setAno} 
          />

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loadingRegister}>
            {loadingRegister ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Registar</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={{marginTop: 20}}>
            <Text style={styles.linkText}>Já tens conta? Faz Login</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- MODAL ESCOLAS --- */}
      <Modal visible={modalEscolaVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Escolhe a Escola</Text>
            {loadingData ? <ActivityIndicator color="#1D3C58" size="large" /> : (
              <FlatList 
                data={listaEscolas}
                keyExtractor={item => item.nome}
                renderItem={({item}) => renderOption(item, 'escola')}
              />
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalEscolaVisible(false)}>
              <Text style={{color:'red'}}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL CURSOS --- */}
      <Modal visible={modalCursoVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Escolhe o Curso</Text>
            <FlatList 
              // Filtra os cursos da escola selecionada
              data={listaEscolas.find(e => e.nome === escolaSelecionada)?.cursos || []}
              keyExtractor={item => item}
              renderItem={({item}) => renderOption(item, 'curso')}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalCursoVisible(false)}>
              <Text style={{color:'red'}}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 25, justifyContent: 'center', minHeight: '100%' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1D3C58', marginBottom: 5, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5, marginLeft: 2 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd', fontSize: 16 },
  
  selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  disabledSelector: { backgroundColor: '#F0F0F0', borderColor: '#EEE' },
  selectorText: { fontSize: 16, color: '#333' },
  placeholderText: { fontSize: 16, color: '#999' },

  button: { backgroundColor: '#1D3C58', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  linkText: { color: '#1D3C58', textAlign: 'center', fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#1D3C58' },
  optionItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
  optionText: { fontSize: 16, color: '#333' },
  closeBtn: { marginTop: 15, padding: 15, alignItems: 'center', backgroundColor: '#FFF0F0', borderRadius: 10 }
});