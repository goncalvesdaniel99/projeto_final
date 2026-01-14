import React, { useState, useEffect } from "react";
import {
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
  View,
  KeyboardAvoidingView,
  LayoutAnimation,
  UIManager
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";

// Ativa animações no Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function CreateGroupScreen() {
  const navigation = useNavigation();

  // --- ESTADOS DE SELEÇÃO ---
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [grauSelecionado, setGrauSelecionado] = useState(null);
  const [curso, setCurso] = useState(null);
  const [ano, setAno] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [maxPessoas, setMaxPessoas] = useState("");

  // --- CONTROLO DE VISIBILIDADE ---
  const [showEscola, setShowEscola] = useState(false);
  const [showGrau, setShowGrau] = useState(false);
  const [showCurso, setShowCurso] = useState(false);

  // --- DADOS ---
  const [listaEscolas, setListaEscolas] = useState([]);
  const grausLista = ["Licenciatura", "CTeSP", "Mestrado", "Pós-Graduação"];
  const [listaCursosFiltrada, setListaCursosFiltrada] = useState([]); 
  const [disciplinasMap, setDisciplinasMap] = useState({});
  
  // --- LOADING STATES ---
  const [loadingEscolas, setLoadingEscolas] = useState(false);
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const API_URL = Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

  // 1. CARREGAR ESCOLAS
  useEffect(() => {
    const fetchEscolas = async () => {
      setLoadingEscolas(true);
      try {
        const res = await fetch(`${API_URL}/auth/schools`);
        const data = await res.json();
        if (Array.isArray(data)) setListaEscolas(data);
      } catch (error) {
        console.log("Erro ao carregar escolas:", error);
      } finally {
        setLoadingEscolas(false);
      }
    };
    fetchEscolas();
  }, []);

  // 2. ATUALIZAR LISTA DE CURSOS
  useEffect(() => {
    setCurso(null); 
    setDisciplina("");
    setAno("");

    if (escolaSelecionada) {
        const escolaObj = listaEscolas.find(e => e.nome === escolaSelecionada);
        if (escolaObj && escolaObj.cursos) {
            setListaCursosFiltrada(escolaObj.cursos);
        } else {
            setListaCursosFiltrada([]);
        }
    } else {
        setListaCursosFiltrada([]);
    }
  }, [escolaSelecionada, listaEscolas]); 

  // 3. CARREGAR DISCIPLINAS
  useEffect(() => {
    if (!curso) return;
    setDisciplinasMap({});
    setDisciplina("");
    setAno(""); 

    const fetchSubjects = async () => {
      setLoadingDisciplinas(true);
      try {
        const grauParam = grauSelecionado ? `&degree=${encodeURIComponent(grauSelecionado)}` : "";
        const res = await fetch(`${API_URL}/groups/subjects?course=${encodeURIComponent(curso)}${grauParam}`);
        const data = await res.json();
        setDisciplinasMap(data || {});
      } catch (error) {
        console.log("Erro ao carregar disciplinas:", error);
      } finally {
        setLoadingDisciplinas(false);
      }
    };
    fetchSubjects();
  }, [curso, grauSelecionado]); 

  const toggleDropdown = (setter, currentValue) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (!currentValue) {
        setShowEscola(false);
        setShowGrau(false);
        setShowCurso(false);
    }
    setter(!currentValue);
  };

  async function criarGrupo() {
    if (!escolaSelecionada || !grauSelecionado || !curso || !ano || !disciplina || !maxPessoas) {
      alert("Por favor, preenche todos os campos.");
      return;
    }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      await fetch(`${API_URL}/groups/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ curso, ano, disciplina, maxPessoas: Number(maxPessoas), grau: grauSelecionado }),
      });
      alert("Grupo criado com sucesso!");
      navigation.goBack();
    } catch (err) {
      alert("Erro de conexão.");
    } finally {
      setSubmitting(false);
    }
  }

  const disciplinasDoAno = ano ? (disciplinasMap[ano] || []) : [];

  return (
    <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} nestedScrollEnabled={true}>
        <Text style={styles.title}>Criar Grupo</Text>

        {/* === ESCOLA === */}
        <Text style={styles.label}>Escola</Text>
        <TouchableOpacity style={styles.selector} onPress={() => toggleDropdown(setShowEscola, showEscola)}>
            <Text style={escolaSelecionada ? styles.selectorText : styles.placeholder}>
                {escolaSelecionada || "Selecionar Escola..."}
            </Text>
            <Ionicons name={showEscola ? "chevron-up" : "chevron-down"} size={20} color="#666" />
        </TouchableOpacity>
        
        {/* LISTA DE ESCOLAS (SCROLLABLE) */}
        {showEscola && (
            <View style={styles.dropdownList}>
                <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 150 }}>
                    {listaEscolas.map((item) => (
                        <TouchableOpacity key={item.nome} style={styles.dropdownItem} onPress={() => {
                            setEscolaSelecionada(item.nome);
                            toggleDropdown(setShowEscola, true); 
                        }}>
                            <Text style={styles.itemText}>{item.nome}</Text>
                            {escolaSelecionada === item.nome && <Ionicons name="checkmark" size={18} color="#1D3C58"/>}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        )}

        {/* === GRAU === */}
        <Text style={styles.label}>Grau Académico</Text>
        <TouchableOpacity 
            style={[styles.selector, !escolaSelecionada && styles.disabled]} 
            onPress={() => escolaSelecionada && toggleDropdown(setShowGrau, showGrau)}
            disabled={!escolaSelecionada}
        >
            <Text style={grauSelecionado ? styles.selectorText : styles.placeholder}>
                {grauSelecionado || "Selecionar Grau..."}
            </Text>
            <Ionicons name={showGrau ? "chevron-up" : "chevron-down"} size={20} color="#666" />
        </TouchableOpacity>

        {/* LISTA DE GRAUS (SCROLLABLE) */}
        {showGrau && (
            <View style={styles.dropdownList}>
                <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 150 }}>
                    {grausLista.map((item) => (
                        <TouchableOpacity key={item} style={styles.dropdownItem} onPress={() => {
                            setGrauSelecionado(item);
                            toggleDropdown(setShowGrau, true); 
                        }}>
                            <Text style={styles.itemText}>{item}</Text>
                            {grauSelecionado === item && <Ionicons name="checkmark" size={18} color="#1D3C58"/>}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        )}

        {/* === CURSO === */}
        <Text style={styles.label}>Curso</Text>
        <TouchableOpacity 
            style={[styles.selector, (!escolaSelecionada) && styles.disabled]} 
            onPress={() => escolaSelecionada && toggleDropdown(setShowCurso, showCurso)}
            disabled={!escolaSelecionada}
        >
            <Text style={curso ? styles.selectorText : styles.placeholder}>
                {curso || "Selecionar Curso..."}
            </Text>
            <Ionicons name={showCurso ? "chevron-up" : "chevron-down"} size={20} color="#666" />
        </TouchableOpacity>

        {/* LISTA DE CURSOS (SCROLLABLE) */}
        {showCurso && (
            <View style={styles.dropdownList}>
                <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 150 }}>
                    {listaCursosFiltrada.length > 0 ? (
                        listaCursosFiltrada.map((item) => (
                            <TouchableOpacity key={item} style={styles.dropdownItem} onPress={() => {
                                setCurso(item);
                                toggleDropdown(setShowCurso, true); 
                            }}>
                                <Text style={styles.itemText}>{item}</Text>
                                {curso === item && <Ionicons name="checkmark" size={18} color="#1D3C58"/>}
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={{padding: 15}}><Text style={{color:'#999'}}>Nenhum curso disponível.</Text></View>
                    )}
                </ScrollView>
            </View>
        )}

        {/* --- ANO --- */}
        <Text style={styles.label}>Ano</Text>
        <View style={styles.yearContainer}>
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

        {/* --- DISCIPLINA --- */}
        <Text style={styles.label}>Disciplina</Text>
        {loadingDisciplinas ? (
            <ActivityIndicator color="#1D3C58" style={{marginTop:10}}/>
        ) : ano && disciplinasDoAno.length > 0 ? (
            <View style={styles.disciplinaBox}>
                <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                    {disciplinasDoAno.map((d, idx) => (
                        <TouchableOpacity 
                            key={idx} 
                            style={[styles.discOption, disciplina === d && styles.discSelected]}
                            onPress={() => setDisciplina(d)}
                        >
                            <Text style={{color: disciplina === d ? '#1D3C58' : '#333', fontWeight: disciplina === d ? 'bold' : 'normal', flex: 1}}>
                                {d}
                            </Text>
                            {disciplina === d && <Ionicons name="checkmark-circle" size={20} color="#1D3C58"/>}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        ) : (
            <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                    {ano ? "Nenhuma disciplina encontrada." : "Seleciona o Ano para ver as disciplinas."}
                </Text>
            </View>
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

        <TouchableOpacity 
            style={[styles.button, submitting && {opacity: 0.7}]} 
            onPress={criarGrupo}
            disabled={submitting}
        >
            {submitting ? <ActivityIndicator color="white"/> : <Text style={styles.buttonText}>Criar Grupo</Text>}
        </TouchableOpacity>

        </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F6F9FC" },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 20, color: '#1D3C58' },
  label: { fontSize: 15, marginTop: 15, marginBottom: 8, fontWeight: "600", color: '#444' },
  
  selector: { flexDirection: 'row', justifyContent:'space-between', alignItems:'center', padding: 15, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  disabled: { backgroundColor: '#F0F0F0', borderColor: '#EEE' },
  selectorText: { fontSize: 16, color: '#333', fontWeight:'500' },
  placeholder: { fontSize: 16, color: '#999' },

  dropdownList: {
    backgroundColor: 'white',
    marginTop: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    // Removemos a sombra para ficar mais limpo em lista, ou podes manter se gostares
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemText: { fontSize: 16, color: '#333' },

  yearContainer: { flexDirection:'row', justifyContent:'space-between' },
  yearChip: { flex: 1, paddingVertical: 12, alignItems:'center', backgroundColor: 'white', borderRadius: 25, marginHorizontal: 5, borderWidth:1, borderColor:'#E0E0E0' },
  yearChipSelected: { backgroundColor: '#1D3C58', borderColor: '#1D3C58' },
  yearText: { color: '#666', fontWeight:'600'},

  disciplinaBox: { backgroundColor:'white', borderRadius:12, borderWidth:1, borderColor:'#E0E0E0', overflow:'hidden', marginTop: 5 },
  discOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  discSelected: { backgroundColor: '#E3F2FD' },
  
  infoBox: { padding: 15, backgroundColor: '#F0F0F0', borderRadius: 10, alignItems: 'center' },
  infoText: { color: '#888', fontStyle: 'italic' },

  input: { borderWidth: 1, padding: 15, borderRadius: 12, backgroundColor: "white", borderColor: "#E0E0E0", fontSize: 16 },
  
  button: { backgroundColor: "#1D3C58", padding: 18, borderRadius: 12, marginTop: 30, alignItems:'center', marginBottom: 20 },
  buttonText: { color: "#FFF", fontWeight: "bold", fontSize: 18 },
});