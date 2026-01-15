import React, { useState, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, ImageBackground, Platform, RefreshControl, StatusBar,
  Animated, Easing, Dimensions, SafeAreaView 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; 

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

export default function HomeScreen({ navigation }) {
  const [myGroups, setMyGroups] = useState([]);
  const [nextMeeting, setNextMeeting] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Estudante");
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current; 
  const slideAnim = useRef(new Animated.Value(30)).current; 

  const BASE_URL = Platform.OS === 'android' ? "http://10.0.2.2:3000" : "http://localhost:3000";

  useFocusEffect(
    useCallback(() => {
      fetchData();
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: true })
      ]).start();
    }, [])
  );

  const fetchData = async () => {
    try {
      let token = await AsyncStorage.getItem('token');
      if(token) token = token.replace(/^"|"$/g, '');
      const storedName = await AsyncStorage.getItem('userName');
      if (storedName) setUserName(storedName.replace(/^"|"$/g, '').split(' ')[0]);

      if (!token) return;

      const resGroups = await fetch(`${BASE_URL}/groups/my`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (resGroups.ok) {
        const dataGroups = await resGroups.json();
        setMyGroups(dataGroups);
      }

      const resMeetings = await fetch(`${BASE_URL}/meetings/my`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (resMeetings.ok) {
        const dataMeetings = await resMeetings.json();
        const now = new Date();
        const validMeetings = dataMeetings.filter(m => {
            const dateStr = m.startsAt || (m.date && m.time ? `${m.date}T${m.time}:00` : null);
            return dateStr && new Date(dateStr) >= now;
        });
        if (validMeetings.length > 0) {
            validMeetings.sort((a, b) => new Date(a.startsAt || `${a.date}T${a.time}:00`) - new Date(b.startsAt || `${b.date}T${b.time}:00`));
            setNextMeeting(validMeetings[0]);
        } else {
            setNextMeeting(null);
        }
      }
    } catch (error) {
      console.log("Erro geral:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const RenderNextMeeting = () => {
    if (!nextMeeting) return null;
    const dateStrRaw = nextMeeting.startsAt || (nextMeeting.date && nextMeeting.time ? `${nextMeeting.date}T${nextMeeting.time}:00` : null);
    const dateObj = new Date(dateStrRaw);
    const dateStr = dateObj.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
    const timeStr = dateObj.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const groupTitle = nextMeeting.group?.disciplina || nextMeeting.groupName || "Grupo de Estudo";

    return (
      <TouchableOpacity 
        style={styles.meetingWidget}
        onPress={() => navigation.navigate("Chat", { groupId: nextMeeting.group?._id, groupName: groupTitle })}
        activeOpacity={0.9}
      >
        {/* Gradiente com mais brilho (Cyan para azul Royal) */}
        <LinearGradient 
          colors={['#00d2ff', '#3a7bd5']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={styles.meetingGradient}
        >
          <View style={styles.meetingContent}>
            <View style={styles.meetingIconContainer}>
               <Ionicons name="calendar" size={24} color="#fff" />
            </View>
            <View style={{flex: 1, marginLeft: 15}}>
              <Text style={styles.meetingLabel}>PRÓXIMA SESSÃO</Text>
              <Text style={styles.meetingTitle} numberOfLines={1}>{groupTitle}</Text>
              <Text style={styles.meetingTime}>{dateStr} • {timeStr}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="white" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      <ImageBackground 
        source={require('../../assets/wallpaper.jpg')} 
        style={styles.heroImage}
        imageStyle={{ borderRadius: 20 }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
          style={styles.heroGradient}
        >
          <Text style={styles.greetingTitle}>Olá, {userName}!</Text>
          <Text style={styles.heroSubtitle}>"O foco de hoje é o sucesso de amanhã." </Text>
        </LinearGradient>
      </ImageBackground>

      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <RenderNextMeeting />
      </Animated.View>

      <Text style={styles.sectionTitle}>Acesso Rápido</Text>
      <View style={styles.quickActionsGrid}>
          {[
            { label: 'Criar', icon: 'add-circle', color: '#4facfe', route: 'CreateGroup' },
            { label: 'Grupos', icon: 'people', color: '#43e97b', route: 'Groups' }, 
            { label: 'Agenda', icon: 'time', color: '#fa709a', route: 'Reunioes' },
            { label: 'Docs', icon: 'folder', color: '#f6d365', route: 'Files' }
          ].map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.actionCard} onPress={() => navigation.navigate(item.route)}>
                <LinearGradient 
                    colors={[item.color, item.color + 'AA']} 
                    style={styles.actionIconBg}
                >
                    <Ionicons name={item.icon} size={26} color="white" />
                </LinearGradient>
                <Text style={styles.actionLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
      </View>

      <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Os teus Grupos</Text>
      </View>
    </View>
  );

  const renderGroupItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.groupCard} 
      onPress={() => navigation.navigate('Chat', { groupId: item._id, groupName: item.disciplina, groupData: item })}
    >
      <View style={styles.groupCardContent}>
        {/* Cor castanha definida para todos os grupos */}
        <View style={[styles.groupInitial, { backgroundColor: '#795548' }]}>
          <Text style={styles.groupInitialText}>{item.disciplina.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={styles.groupTitle} numberOfLines={1}>{item.disciplina}</Text>
          <Text style={styles.groupSubtitle} numberOfLines={1}>{item.curso}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      
      <LinearGradient 
        colors={['#E2E8F0', '#F8FAFC', '#F1F5F9']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={styles.container}>
        <View style={styles.contentContainer}>
          {loading ? (
            <View style={styles.loadingCenter}>
                <ActivityIndicator size="large" color="#795548" />
            </View>
          ) : (
            <FlatList
              data={myGroups}
              keyExtractor={(item) => item._id}
              renderItem={renderGroupItem}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={styles.listPadding}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: isLargeScreen ? 800 : '100%' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listPadding: { padding: 20, paddingBottom: 40 },
  
  headerWrapper: { marginBottom: 10 },
  heroImage: { 
    width: '100%', height: 180, justifyContent: 'flex-end', marginBottom: 25, 
    borderRadius: 20, overflow: 'hidden', elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 
  },
  heroGradient: { padding: 20, width: '100%' },
  greetingTitle: { fontSize: 26, fontWeight: '700', color: 'white' },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },

  meetingWidget: { 
    marginBottom: 30, 
    borderRadius: 16, 
    overflow: 'hidden', 
    elevation: 8, 
    shadowColor: '#3a7bd5', 
    shadowOpacity: 0.3, 
    shadowRadius: 12 
  },
  meetingGradient: { padding: 20 },
  meetingContent: { flexDirection: 'row', alignItems: 'center' },
  meetingIconContainer: { 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.25)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  meetingLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  meetingTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginVertical: 2 },
  meetingTime: { color: 'white', fontSize: 13, fontWeight: '500' },

  quickActionsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  actionCard: { alignItems: 'center', width: '22%' },
  actionIconBg: { 
    width: 56, 
    height: 56, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOpacity: 0.1 
  },
  actionLabel: { marginTop: 8, fontSize: 12, fontWeight: '600', color: '#334155' },

  sectionTitle: { fontSize: 19, fontWeight: '700', color: '#1E293B', marginBottom: 12 },

  groupCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.8)', 
    marginBottom: 12, borderRadius: 16,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8
  },
  groupCardContent: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  groupInitial: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  groupInitialText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  groupTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  groupSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
});