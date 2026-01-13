import React, { useState, useEffect } from "react";
import {
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { Ionicons } from '@expo/vector-icons';

export default function CreateGroupScreen({ navigation }) {
  // --- ESTADOS DE SELEÇÃO ---
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [curso, setCurso] = useState(null); // Agora inicia a null
  const [ano, setAno] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [maxPessoas, setMaxPessoas] = useState("");

  // --- DADOS DA API ---
  const [listaEscolas, setListaEscolas] = useState([]);
  const [disciplinasMap, setDisciplinasMap] = useState({});
  
  // --- LOADING STATES ---
  const [loadingEscolas, setLoadingEscolas] = useState(false);
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(false);

  // --- MODAIS ---
  const [modalEscolaVisible, setModalEscolaVisible] = useState(false);
  const [modalCursoVisible, setModalCursoVisible] = useState(false);

  const API_URL = Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

  // 1. CARREGAR ESCOLAS E CURSOS (Igual ao Registo)
  useEffect(() => {
    const fetchEscolas = async () => {
      setLoadingEscolas(true);
      try {
        const res = await fetch(`${API_URL}/auth/schools`);
        const data = await res.json();
        if (Array.isArray(data)) setListaEscolas(data);
      } catch (error) {
        Toast.show({ type: "error", text1: "Erro ao carregar escolas." });
      } finally {
        setLoadingEscolas(false);
      }
    };
    fetchEscolas();
  }, []);

  // 2. CARREGAR DISCIPLINAS (Quando escolhe o curso)
  useEffect(() => {
    if (!curso) return;
    
    // Resetar seleções anteriores
    setDisciplinasMap({});
    setDisciplina("");
    setAno(""); 

    const fetchSubjects = async () => {
      setLoadingDisciplinas(true);
      try {
        const res = await fetch(`${API_URL}/groups/subjects?course=${encodeURIComponent(curso)}`);
        const data = await res.json();
        setDisciplinasMap(data || {});
      } catch (error) {
        Toast.show({ type: "error", text1: "Erro ao carregar disciplinas." });
      } finally {
        setLoadingDisciplinas(false);
      }
    };
    fetchSubjects();
  }, [curso]);

  // Função de Criar Grupo
  async function criarGrupo() {
    if (!curso || !ano || !disciplina || !maxPessoas) {
      Toast.show({ type: "error", text1: "Preenche todos os campos." });
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
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
        Toast.show({ type: "error", text1: data.error || "Erro." });
        return;
      }

      Toast.show({ type: "success", text1: "Grupo criado!" });
      setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: "MyGroups" }] });
      }, 1000);
    } catch (err) {
      Toast.show({ type: "error", text1: "Erro de conexão." });
    }
  }

  // Renderizar itens dos Modais
  const renderOption = (item, type) => (
    <TouchableOpacity 
      style={styles.optionItem} 
      onPress={() => {
        if (type === 'escola') {
          setEscolaSelecionada(item.nome);
          setCurso(null);
          setModalEscolaVisible(false);
        } else {
          setCurso(item); // O item aqui é o nome do curso string
          setModalCursoVisible(false);
        }
      }}
    >
      <Text style={styles.optionText}>{type === 'escola' ? item.nome : item}</Text>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const disciplinasDoAno = ano ? (disciplinasMap[ano] || []) : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Criar Grupo</Text>

      {/* --- SELETOR ESCOLA --- */}
      <Text style={styles.label}>Escola</Text>
      <TouchableOpacity style={styles.selector} onPress={() => setModalEscolaVisible(true)}>
        <Text style={escolaSelecionada ? styles.selectorText : styles.placeholder}>
            {escolaSelecionada || "Selecionar Escola..."}
        </Text>
        <Ionicons name="caret-down" size={20} color="#666" />
      </TouchableOpacity>

      {/* --- SELETOR CURSO --- */}
      <Text style={styles.label}>Curso</Text>
      <TouchableOpacity 
        style={[styles.selector, !escolaSelecionada && styles.disabled]} 
        onPress={() => escolaSelecionada && setModalCursoVisible(true)}
        disabled={!escolaSelecionada}
      >
        <Text style={curso ? styles.selectorText : styles.placeholder}>
            {curso || "Selecionar Curso..."}
        </Text>
        <Ionicons name="caret-down" size={20} color="#666" />
      </TouchableOpacity>

      {/* --- SELETOR ANO --- */}
      <Text style={styles.label}>Ano</Text>
      <View style={{flexDirection:'row'}}>
        {[1, 2, 3].map((a) => (
          <TouchableOpacity
            key={a}
            style={[styles.yearChip, ano === a && styles.yearChipSelected]}
            onPress={() => { setAno(a); setDisciplina(""); }}
          >
            <Text style={[styles.yearText, ano === a && {color:'white'}]}>{a}º Ano</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* --- SELETOR DISCIPLINA --- */}
      <Text style={styles.label}>Disciplina</Text>
      {loadingDisciplinas ? (
        <ActivityIndicator color="#1D3C58" style={{marginTop:10}}/>
      ) : ano && disciplinasDoAno.length > 0 ? (
        <ScrollView style={{ maxHeight: 250, backgroundColor:'white', borderRadius:8, borderWidth:1, borderColor:'#eee' }} nestedScrollEnabled>
            {disciplinasDoAno.map((d, idx) => (
                <TouchableOpacity 
                    key={idx} 
                    style={[styles.discOption, disciplina === d && styles.discSelected]}
                    onPress={() => setDisciplina(d)}
                >
                    <Text style={{color: disciplina === d ? '#1D3C58' : '#333', fontWeight: disciplina === d ? 'bold' : 'normal'}}>
                        {d}
                    </Text>
                    {disciplina === d && <Ionicons name="checkmark" size={18} color="#1D3C58"/>}
                </TouchableOpacity>
            ))}
        </ScrollView>
      ) : (
        <Text style={styles.info}>{ano ? "Nenhuma disciplina encontrada." : "Seleciona o ano primeiro."}</Text>
      )}

      {/* --- MAX PESSOAS --- */}
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

      {/* --- MODAL ESCOLAS --- */}
      <Modal visible={modalEscolaVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Escolhe a Escola</Text>
                <FlatList data={listaEscolas} keyExtractor={i=>i.nome} renderItem={({item})=>renderOption(item, 'escola')}/>
                <TouchableOpacity style={styles.closeBtn} onPress={()=>setModalEscolaVisible(false)}><Text style={{color:'red'}}>Cancelar</Text></TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* --- MODAL CURSOS --- */}
      <Modal visible={modalCursoVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Escolhe o Curso</Text>
                <FlatList 
                    data={listaEscolas.find(e => e.nome === escolaSelecionada)?.cursos || []} 
                    keyExtractor={i=>i} 
                    renderItem={({item})=>renderOption(item, 'curso')}
                />
                <TouchableOpacity style={styles.closeBtn} onPress={()=>setModalCursoVisible(false)}><Text style={{color:'red'}}>Cancelar</Text></TouchableOpacity>
            </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F6F9FC" },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 20, color: '#1D3C58' },
  label: { fontSize: 15, marginTop: 15, marginBottom: 5, fontWeight: "600", color: '#444' },
  
  selector: { flexDirection: 'row', justifyContent:'space-between', padding: 15, backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  disabled: { backgroundColor: '#F0F0F0', borderColor: '#EEE' },
  selectorText: { fontSize: 16, color: '#333' },
  placeholder: { fontSize: 16, color: '#999' },

  yearChip: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: 'white', borderRadius: 20, marginRight: 10, borderWidth:1, borderColor:'#ddd' },
  yearChipSelected: { backgroundColor: '#1D3C58', borderColor: '#1D3C58' },
  yearText: { color: '#333', fontWeight:'600'},

  discOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection:'row', justifyContent:'space-between' },
  discSelected: { backgroundColor: '#E3F2FD' },

  input: { borderWidth: 1, padding: 15, borderRadius: 10, backgroundColor: "white", borderColor: "#ddd", fontSize: 16 },
  button: { backgroundColor: "#1D3C58", padding: 16, borderRadius: 10, marginTop: 30, alignItems:'center' },
  buttonText: { color: "#FFF", fontWeight: "bold", fontSize: 18 },
  info: { color: '#888', fontStyle: 'italic', marginTop: 5 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#1D3C58' },
  optionItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
  optionText: { fontSize: 16, color: '#333' },
  closeBtn: { marginTop: 15, padding: 15, alignItems: 'center', backgroundColor: '#FFF0F0', borderRadius: 10 }
});