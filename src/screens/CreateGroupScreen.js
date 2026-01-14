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
  UIManager,
  Alert,
  SafeAreaView,
  Pressable,
  ImageBackground,
  Modal,
  StatusBar,
  Dimensions
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// Imagem temática para o fundo do formulário
const FORM_BG_IMAGE = { uri: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?q=80&w=2070&auto=format&fit=crop" };

export default function CreateGroupScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [grauSelecionado, setGrauSelecionado] = useState(null);
  const [curso, setCurso] = useState(null);
  const [ano, setAno] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [maxPessoas, setMaxPessoas] = useState("");

  const [openDropdown, setOpenDropdown] = useState(null); 
  const [listaEscolas, setListaEscolas] = useState([]);
  const grausLista = ["Licenciatura", "CTeSP", "Mestrado", "Pós-Graduação"];
  const [listaCursosFiltrada, setListaCursosFiltrada] = useState([]); 
  const [disciplinasMap, setDisciplinasMap] = useState({});
  
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdGroupData, setCreatedGroupData] = useState(null);

  const API_URL = Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

  useEffect(() => {
    const fetchEscolas = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/schools`);
        if(res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) setListaEscolas(data);
        } else {
             setListaEscolas([
                { nome: 'ESTG - Tecnologia e Gestão', id: 'ESTG'},
                { nome: 'ESE - Educação', id: 'ESE'},
                { nome: 'ESA - Agrária', id: 'ESA'},
                { nome: 'ESS - Saúde', id: 'ESS'},
                { nome: 'ESCE - Ciências Empresariais', id: 'ESCE'},
                { nome: 'ESDL - Desporto e Lazer', id: 'ESDL'}
            ]);
        }
      } catch (error) { console.log(error); }
    };
    fetchEscolas();
  }, []);

  useEffect(() => {
    setCurso(null); setDisciplina(""); setAno(""); setListaCursosFiltrada([]);
    if (escolaSelecionada && grauSelecionado) {
        const escolaObj = listaEscolas.find(e => e.nome === escolaSelecionada);
        const schoolId = escolaObj ? (escolaObj.id || escolaObj.nome) : escolaSelecionada;
        const fetchCursos = async () => {
            setLoadingData(true);
            try {
                const res = await fetch(`${API_URL}/groups/list-courses?school=${encodeURIComponent(schoolId)}&degree=${encodeURIComponent(grauSelecionado)}`);
                const data = await res.json();
                if (Array.isArray(data)) setListaCursosFiltrada(data);
            } catch (error) { console.log(error); } finally { setLoadingData(false); }
        };
        fetchCursos();
    }
  }, [escolaSelecionada, grauSelecionado]);

  useEffect(() => {
    if (!curso) return;
    setDisciplinasMap({}); setDisciplina(""); setAno(""); 
    const fetchSubjects = async () => {
      setLoadingData(true);
      try {
        const grauParam = grauSelecionado ? `&degree=${encodeURIComponent(grauSelecionado)}` : "";
        const res = await fetch(`${API_URL}/groups/subjects?course=${encodeURIComponent(curso)}${grauParam}`);
        const data = await res.json();
        setDisciplinasMap(data || {});
      } catch (error) { console.log(error); } finally { setLoadingData(false); }
    };
    fetchSubjects();
  }, [curso]); 

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const getAnosPossiveis = () => {
      if (grauSelecionado === 'Mestrado' || grauSelecionado === 'CTeSP') return [1, 2];
      return [1, 2, 3];
  };

  const disciplinasDoAno = ano ? (disciplinasMap[ano] || []) : [];

  async function criarGrupo() {
    if (!escolaSelecionada || !grauSelecionado || !curso || !ano || !disciplina || !maxPessoas) {
      Alert.alert("Campos incompletos", "Por favor, preenche todos os campos.");
      return;
    }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/groups/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ curso, ano, disciplina, maxPessoas: Number(maxPessoas), grau: grauSelecionado }),
      });
      const data = await res.json();
      if(res.ok) {
        setCreatedGroupData(data.grupo);
        setShowSuccessModal(true);
      } else { 
          Alert.alert("Erro", data.error || "Falha ao criar grupo."); 
      }
    } catch (err) { 
        Alert.alert("Erro", "Sem conexão."); 
    } finally { 
        setSubmitting(false); 
    }
  }

  const handleSuccessNavigation = () => {
      setShowSuccessModal(false);
      if (createdGroupData) {
        navigation.replace("Chat", { id: createdGroupData._id, group: createdGroupData, title: createdGroupData.disciplina });
      } else {
        navigation.goBack();
      }
  };

  const SelectionField = ({ label, value, placeholder, icon, isOpen, onPress, disabled, children }) => (
    <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity 
            style={[styles.selectInput, isOpen && styles.selectInputActive, disabled && styles.disabledInput]} 
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.8}
        >
            <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={18} color={value ? "#1D3C58" : "#A0AEC0"} />
                </View>
                <Text style={value ? styles.selectTextSelected : styles.selectTextPlaceholder} numberOfLines={1}>
                    {value || placeholder}
                </Text>
            </View>
            {loadingData && isOpen ? <ActivityIndicator size="small" color="#1D3C58"/> : 
                <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color="#718096"/>
            }
        </TouchableOpacity>
        {isOpen && <View style={styles.dropdownContainer}>{children}</View>}
    </View>
  );

  return (
    <View style={{flex:1}}>
        <StatusBar barStyle="dark-content" />
        
        <LinearGradient 
            colors={['#E2E8F0', '#F8FAFC', '#F1F5F9']} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
        />

        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
                    <Ionicons name="arrow-back" size={22} color="#1D3C58" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Novo Grupo</Text>
                <View style={{width: 40}} />
            </View>

            <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* FORM CARD COM FUNDO DE IMAGEM */}
                    <View style={styles.formCardContainer}>
                        <ImageBackground 
                            source={FORM_BG_IMAGE} 
                            style={styles.formCardBackground} 
                            imageStyle={{ borderRadius: 24, opacity: 0.12 }} // Imagem suave para não atrapalhar
                        >
                            <View style={styles.formInner}>
                                <SelectionField 
                                    label="Instituição" 
                                    value={escolaSelecionada} 
                                    placeholder="Selecione a Escola" 
                                    icon="school"
                                    isOpen={openDropdown === 'escola'}
                                    onPress={() => toggleDropdown('escola')}
                                >
                                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                                        {listaEscolas.map((item, i) => (
                                            <TouchableOpacity key={i} style={styles.dropdownItem} onPress={() => { setEscolaSelecionada(item.nome); toggleDropdown(null); }}>
                                                <Text style={styles.itemText}>{item.nome}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </SelectionField>

                                <SelectionField 
                                    label="Grau Académico" 
                                    value={grauSelecionado} 
                                    placeholder="Ex: Licenciatura" 
                                    icon="ribbon"
                                    isOpen={openDropdown === 'grau'}
                                    onPress={() => toggleDropdown('grau')}
                                    disabled={!escolaSelecionada}
                                >
                                    {grausLista.map((item, i) => (
                                        <TouchableOpacity key={i} style={styles.dropdownItem} onPress={() => { setGrauSelecionado(item); toggleDropdown(null); }}>
                                            <Text style={styles.itemText}>{item}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </SelectionField>

                                <SelectionField 
                                    label="Curso" 
                                    value={curso} 
                                    placeholder="Nome do Curso" 
                                    icon="book"
                                    isOpen={openDropdown === 'curso'}
                                    onPress={() => toggleDropdown('curso')}
                                    disabled={!grauSelecionado}
                                >
                                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                                        {listaCursosFiltrada.map((item, i) => (
                                            <TouchableOpacity key={i} style={styles.dropdownItem} onPress={() => { setCurso(item); toggleDropdown(null); }}>
                                                <Text style={styles.itemText}>{item}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </SelectionField>

                                {curso && (
                                    <View style={styles.fieldContainer}>
                                        <Text style={styles.label}>Ano Curricular</Text>
                                        <View style={styles.rowYears}>
                                            {getAnosPossiveis().map((yr) => (
                                                <Pressable 
                                                    key={yr}
                                                    style={[styles.yearPill, ano === yr && styles.yearPillSelected]}
                                                    onPress={() => { setAno(yr); setDisciplina(""); setOpenDropdown(null); }}
                                                >
                                                    <Text style={[styles.yearText, ano === yr && styles.yearTextSelected]}>{yr}º</Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                <SelectionField 
                                    label="Unidade Curricular" 
                                    value={disciplina} 
                                    placeholder="Nome da Disciplina" 
                                    icon="library"
                                    isOpen={openDropdown === 'disciplina'}
                                    onPress={() => toggleDropdown('disciplina')}
                                    disabled={!ano}
                                >
                                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                                        {disciplinasDoAno.map((d, i) => (
                                            <TouchableOpacity key={i} style={styles.dropdownItem} onPress={() => { setDisciplina(d); toggleDropdown(null); }}>
                                                <Text style={styles.itemText}>{d}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </SelectionField>

                                <View style={styles.fieldContainer}>
                                    <Text style={styles.label}>Membros (Limite)</Text>
                                    <View style={styles.selectInput}> 
                                        <View style={styles.iconContainer}><Ionicons name="people" size={18} color="#1D3C58"/></View>
                                        <TextInput
                                            style={styles.textInput} 
                                            keyboardType="numeric"
                                            onChangeText={setMaxPessoas}
                                            value={maxPessoas}
                                            placeholder="Ex: 5"
                                            placeholderTextColor="#A0AEC0"
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    style={[styles.submitBtn, submitting && {opacity: 0.8}]} 
                                    onPress={criarGrupo}
                                    disabled={submitting}
                                >
                                    {submitting ? <ActivityIndicator color="white"/> : (
                                        <Text style={styles.submitText}>Criar Grupo</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ImageBackground>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>

        <Modal visible={showSuccessModal} transparent={true} animationType="fade">
            <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                    <View style={styles.checkCircle}><Ionicons name="checkmark" size={32} color="white"/></View>
                    <Text style={styles.modalTitle}>Grupo Criado!</Text>
                    <Text style={styles.modalSubtitle}>Tudo pronto para começarem a estudar.</Text>
                    <TouchableOpacity style={styles.modalBtn} onPress={handleSuccessNavigation}>
                        <Text style={styles.modalBtnText}>Ir para o Chat</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 20, marginVertical: 15, alignSelf: 'center', width: '100%', maxWidth: 750
  },
  backCircle: { 
    width: 38, height: 38, backgroundColor: '#FFF', borderRadius: 19, 
    alignItems: 'center', justifyContent: 'center', elevation: 3, shadowOpacity: 0.1, shadowRadius: 5
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1D3C58' },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, alignItems: 'center', paddingTop: 10 },
  
  formCardContainer: { 
    width: '100%', maxWidth: 750, backgroundColor: '#FFF', borderRadius: 24,
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 15, overflow: 'hidden'
  },
  formCardBackground: { width: '100%' },
  formInner: { padding: 24, backgroundColor: 'rgba(255, 255, 255, 0.88)' },
  
  fieldContainer: { marginBottom: 18 },
  label: { fontSize: 11, fontWeight: '800', color: '#718096', marginBottom: 6, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  selectInput: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', 
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, height: 48 
  },
  selectInputActive: { borderColor: '#1D3C58', borderWidth: 1.5 },
  disabledInput: { opacity: 0.5 },
  iconContainer: { marginRight: 10 },
  selectTextPlaceholder: { color: '#A0AEC0', flex: 1, fontSize: 15 },
  selectTextSelected: { color: '#2D3748', fontWeight: '600', flex: 1, fontSize: 15 },
  textInput: { flex: 1, color: '#2D3748', fontWeight: '600', fontSize: 15 },
  
  dropdownContainer: { 
    backgroundColor: '#FFF', marginTop: 4, borderRadius: 10, 
    borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', elevation: 3
  },
  dropdownScroll: { maxHeight: 150 },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F7FAFC' },
  itemText: { color: '#4A5568', fontSize: 15 },
  
  rowYears: { flexDirection: 'row', gap: 10 },
  yearPill: { 
    flex: 1, height: 42, backgroundColor: '#FFF', borderRadius: 10, 
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' 
  },
  yearPillSelected: { backgroundColor: '#1D3C58', borderColor: '#1D3C58' },
  yearText: { color: '#718096', fontWeight: 'bold' },
  yearTextSelected: { color: '#FFF' },
  
  submitBtn: { 
    backgroundColor: '#1D3C58', height: 52, borderRadius: 12, 
    alignItems: 'center', justifyContent: 'center', marginTop: 15, elevation: 4 
  },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  modalCard: { backgroundColor: '#FFF', width: '90%', maxWidth: 750, borderRadius: 25, padding: 25, alignItems: 'center' },
  checkCircle: { width: 56, height: 56, backgroundColor: '#4CAF50', borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1D3C58', marginBottom: 8 },
  modalSubtitle: { color: '#718096', textAlign: 'center', marginBottom: 20, fontSize: 14 },
  modalBtn: { backgroundColor: '#1D3C58', width: '100%', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { color: '#FFF', fontWeight: 'bold' }
});