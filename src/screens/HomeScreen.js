import React, { useState, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, ImageBackground, Platform, RefreshControl, StatusBar,
  Animated, Easing
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; 

export default function HomeScreen({ navigation }) {
  const [myGroups, setMyGroups] = useState([]);
  const [nextMeeting, setNextMeeting] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Estudante");
  const [refreshing, setRefreshing] = useState(false);

  // --- ANIMAÇÕES ---
  const fadeAnim = useRef(new Animated.Value(0)).current; 
  const slideAnim = useRef(new Animated.Value(50)).current; 

  const getApiUrl = () => {
    if (Platform.OS === 'web') return "http://localhost:3000";
    if (Platform.OS === 'android') return "http://10.0.2.2:3000"; 
    return "http://localhost:3000"; 
  };
  const BASE_URL = getApiUrl();

  useFocusEffect(
    useCallback(() => {
      fetchData();
      // Animação suave ao entrar
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        })
      ]).start();
    }, [])
  );

  const fetchData = async () => {
    try {
      let token = Platform.OS === 'web' ? localStorage.getItem('token') : await AsyncStorage.getItem('token');
      if(token) token = token.replace(/^"|"$/g, '');

      // 1. Buscar Nome
      const storedName = Platform.OS === 'web' ? localStorage.getItem('userName') : await AsyncStorage.getItem('userName');
      if (storedName) setUserName(storedName.replace(/^"|"$/g, '').split(' ')[0]);

      if (!token) return;

      // --- GRUPOS ---
      const resGroups = await fetch(`${BASE_URL}/groups/my`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (resGroups.status === 401) {
         console.log("Sessão expirada");
         return; 
      }

      if (resGroups.ok) {
        const dataGroups = await resGroups.json();
        setMyGroups(dataGroups);
      }

      // --- REUNIÕES (Rota Corrigida: /my/all) ---
      const resMeetings = await fetch(`${BASE_URL}/meetings/my/all`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (resMeetings.ok) {
        const dataMeetings = await resMeetings.json();
        
        // Backend já devolve filtrado (futuras) e ordenado (mais próxima primeiro).
        // Basta pegar a primeira da lista.
        if (Array.isArray(dataMeetings) && dataMeetings.length > 0) {
          setNextMeeting(dataMeetings[0]);
        } else {
          setNextMeeting(null);
        }
      }

    } catch (error) {
      console.log("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // --- WIDGET PRÓXIMA REUNIÃO (Design Original) ---
  const RenderNextMeeting = () => {
    if (!nextMeeting) return null;
    
    // Usa startsAt vindo da nova rota
    const dateObj = new Date(nextMeeting.startsAt);
    const dateStr = dateObj.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' });
    const timeStr = dateObj.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    // Nome do grupo pode vir em 'group.disciplina' (se populado) ou usar um fallback
    const groupTitle = nextMeeting.group?.disciplina || "Grupo de Estudo";
    const locationStr = nextMeeting.location || "Online";

    return (
      <TouchableOpacity 
        style={styles.meetingWidget}
        // Ao clicar, vai para o Chat desse grupo específico
        onPress={() => navigation.navigate("Chat", { 
            group: nextMeeting.group, 
            groupId: nextMeeting.group._id,
            groupName: nextMeeting.group.disciplina 
        })}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#1D3C58', '#3498DB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.meetingGradient}
        >
          <View style={styles.meetingHeader}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
              <Ionicons name="time" size={18} color="#FFD700" style={{marginRight:5}} />
              <Text style={styles.meetingLabel}>Próxima Sessão de Estudo</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </View>
          
          <Text style={styles.meetingTitle}>{groupTitle}</Text>
          
          <View style={styles.meetingInfoRow}>
            <Text style={styles.meetingTime}>{dateStr} às {timeStr}</Text>
            <View style={styles.meetingLocationBadge}>
               <Ionicons name="location" size={12} color="#1D3C58"/>
               <Text style={styles.meetingLocationText}>
                 {locationStr.length > 15 ? locationStr.substring(0,15)+'...' : locationStr}
               </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // --- HEADER PRINCIPAL ---
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      
      <ImageBackground 
        source={require('../../assets/wallpaper.jpg')} 
        style={styles.heroImage}
        imageStyle={{ borderRadius: 20 }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={styles.heroGradient}
        >
          <Text style={styles.greeting}>Olá, {userName}!</Text>
          <Text style={styles.motivationalPhrase}>
            "O foco de hoje é o sucesso de amanhã." 🚀
          </Text>
        </LinearGradient>
      </ImageBackground>

      {/* Widget Dinâmico */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <RenderNextMeeting />
      </Animated.View>

      {/* Ações Rápidas */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Acesso Rápido</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CreateGroup')}>
            <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="add-circle" size={28} color="#2196F3" />
            </View>
            <Text style={styles.actionText}>Criar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Groups')}>
            <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="search" size={28} color="#4CAF50" />
            </View>
            <Text style={styles.actionText}>Explorar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Reunioes')}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="calendar" size={28} color="#FF9800" />
            </View>
            <Text style={styles.actionText}>Agenda</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Files')}> 
            <View style={[styles.iconCircle, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="folder-open" size={28} color="#9C27B0" />
            </View>
            <Text style={styles.actionText}>Docs</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Os teus Grupos</Text>
    </View>
  );

  const renderGroupItem = ({ item, index }) => {
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('Chat', { groupId: item._id, groupName: item.disciplina })}
        activeOpacity={0.7}
      >
        <LinearGradient
           colors={['#FFFFFF', '#F8F9FA']}
           style={styles.cardGradient}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.cardIcon, { backgroundColor: getRandomColor(index) }]}>
              <Text style={styles.cardIconText}>{item.disciplina.charAt(0).toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.disciplina}</Text>
            <Text style={styles.cardSubtitle}>
              {item.curso} • <Ionicons name="people" size={12}/> {item.membros?.length || 1}
            </Text>
          </View>

          <View style={styles.arrowContainer}>
             <Ionicons name="chevron-forward" size={18} color="#B0BEC5" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const getRandomColor = (index) => {
    const colors = ['#1D3C58', '#E67E22', '#27AE60', '#8E44AD', '#C0392B', '#2980B9'];
    return colors[index % colors.length];
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F9FC" />
      
      {loading ? (
        <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#1D3C58" />
        </View>
      ) : (
        <FlatList
          data={myGroups}
          keyExtractor={(item) => item._id}
          renderItem={renderGroupItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <ImageBackground 
                    source={{uri: 'https://cdn-icons-png.flaticon.com/512/7486/7486744.png'}} 
                    style={{width: 100, height: 100, opacity:0.5}} 
                />
                <Text style={styles.emptyText}>Sem grupos ativos</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Groups')} style={styles.emptyButton}>
                    <Text style={styles.emptyButtonText}>Procurar Grupos</Text>
                </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F9FC' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // HERO
  headerContainer: { marginBottom: 15 },
  heroImage: { width: '100%', height: 200, justifyContent: 'flex-end', marginBottom: 20, borderRadius: 24, overflow: 'hidden', elevation: 10, shadowColor:'#000', shadowOffset:{width:0, height:5}, shadowOpacity:0.3, shadowRadius:5 },
  heroGradient: { padding: 20, width: '100%' },
  greeting: { color: 'white', fontSize: 26, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width:0, height:1}, textShadowRadius: 3 },
  motivationalPhrase: { color: '#ECF0F1', fontSize: 14, marginTop: 5, fontStyle: 'italic', fontWeight:'500' },

  // WIDGET NEXT MEETING
  meetingWidget: { marginBottom: 25, borderRadius: 16, overflow: 'hidden', elevation: 5, shadowColor: '#1D3C58', shadowOffset: {width:0, height:4}, shadowOpacity:0.2, shadowRadius:4 },
  meetingGradient: { padding: 15 },
  meetingHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  meetingLabel: { color: '#BDC3C7', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  meetingTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  meetingInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meetingTime: { color: 'white', fontSize: 14, fontWeight: '600' },
  meetingLocationBadge: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignItems: 'center' },
  meetingLocationText: { color: '#1D3C58', fontSize: 11, fontWeight: 'bold', marginLeft: 3 },

  // QUICK ACTIONS
  quickActionsContainer: { marginBottom: 20 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5 },
  actionBtn: { alignItems: 'center', width: '22%' },
  iconCircle: { width: 58, height: 58, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: {width:0, height:2} },
  actionText: { fontSize: 12, color: '#555', fontWeight: '600' },

  // SECTION TITLE
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 15, marginLeft: 5 },
  
  // CARD GRUPO
  card: { marginBottom: 14, borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width:0, height:2 }, backgroundColor: 'white' },
  cardGradient: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16 },
  cardLeft: { marginRight: 15 },
  cardIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardIconText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cardSubtitle: { fontSize: 13, color: '#7F8C8D', marginTop: 3 },
  arrowContainer: { backgroundColor: '#F0F3F4', padding: 5, borderRadius: 8 },

  // EMPTY STATE
  emptyContainer: { alignItems: 'center', marginTop: 30, padding: 20 },
  emptyText: { fontSize: 16, color: '#7F8C8D', marginTop: 15, fontWeight: 'bold' },
  emptyButton: { marginTop: 15, backgroundColor: '#1D3C58', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25 },
  emptyButtonText: { color: 'white', fontWeight: 'bold' },
});