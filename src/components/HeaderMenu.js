import React, { useState, useRef, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, Modal, StyleSheet, 
  Platform, SafeAreaView, Animated, Dimensions, Easing, Image 
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function HeaderMenu() {
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(width)).current;
  
  const [photo, setPhoto] = useState(null);
  const [initials, setInitials] = useState("");
  
  const navigation = useNavigation();
  const API_URL = Platform.OS === 'android' ? "http://10.0.2.2:3000" : "http://localhost:3000";

  // --- ATUALIZAÇÃO INTELIGENTE ---
  // O useFocusEffect garante que os dados recarregam sempre que o ecrã ganha foco
  useFocusEffect(
    useCallback(() => {
      loadUserData();
      // Opcional: Sincronizar com o servidor em background para garantir dados frescos
      fetchRemoteData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const storedPhoto = Platform.OS === 'web' ? localStorage.getItem('userPhoto') : await AsyncStorage.getItem('userPhoto');
      const storedName = Platform.OS === 'web' ? localStorage.getItem('userName') : await AsyncStorage.getItem('userName');

      if (storedPhoto) {
          setPhoto(storedPhoto);
      } else {
          setPhoto(null);
      }
      
      if (storedName) {
        const cleanName = storedName.replace(/^"|"$/g, '').trim();
        const names = cleanName.split(' ');
        if (names.length >= 2) {
            setInitials((names[0][0] + names[names.length - 1][0]).toUpperCase());
        } else if (names.length === 1) {
            setInitials(names[0][0].toUpperCase());
        }
      }
    } catch (e) { console.log(e); }
  };

  const fetchRemoteData = async () => {
    try {
        let token = Platform.OS === 'web' ? localStorage.getItem('token') : await AsyncStorage.getItem('token');
        if(!token) return;
        token = token.replace(/^"|"$/g, '');

        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            const user = await res.json();
            // Atualiza localmente se o servidor tiver dados mais recentes
            if (user.foto) {
                const photoUrl = user.foto.startsWith('http') ? user.foto : `${API_URL}${user.foto}`;
                // Só atualiza se for diferente para evitar "piscar"
                if (photoUrl !== photo) {
                    setPhoto(photoUrl);
                    if(Platform.OS === 'web') localStorage.setItem('userPhoto', photoUrl);
                    else AsyncStorage.setItem('userPhoto', photoUrl);
                }
            }
        }
    } catch (error) {
        console.log("Modo offline: a usar dados locais.");
    }
  };

  // --- ANIMAÇÕES MENU ---
  const openMenu = () => {
    setVisible(true);
    loadUserData(); // Garante atualização ao abrir
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.poly(4)),
    }).start();
  };

  const closeMenu = (callback) => {
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      if (callback) callback();
    });
  };

  const handleLogout = async () => {
    closeMenu(async () => {
      if (Platform.OS === 'web') localStorage.clear();
      else await AsyncStorage.clear();
      
      setPhoto(null);
      setInitials("");
      
      navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
      });
    });
  };

  const navigateTo = (screen) => {
    closeMenu(() => navigation.navigate(screen));
  };

  return (
    <View>
      {/* Ícone de Avatar no Header */}
      <TouchableOpacity onPress={openMenu} style={{ marginRight: 15 }}>
        {photo ? (
          // Adicionamos key={photo} para forçar o componente a redesenhar se o URL mudar
          <Image key={photo} source={{ uri: photo }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            {initials ? (
                <Text style={styles.avatarText}>{initials}</Text>
            ) : (
                <Ionicons name="person" size={20} color="#1D3C58" />
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Modal Lateral */}
      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        onRequestClose={() => closeMenu()}
      >
        <View style={styles.overlayContainer}>
          <TouchableOpacity style={styles.backdrop} onPress={() => closeMenu()} />
          
          <Animated.View 
            style={[
              styles.slidingMenu, 
              { transform: [{ translateX: slideAnim }] }
            ]}
          >
            <SafeAreaView style={{ flex: 1 }}>
              
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Menu</Text>
                <TouchableOpacity onPress={() => closeMenu()} style={styles.closeBtn}>
                  <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.menuItems}>
                
                <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Profile')}>
                  <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="person" size={24} color="#1565C0" />
                  </View>
                  <View style={{flex:1}}>
                    <Text style={styles.itemTitle}>O meu Perfil</Text>
                    <Text style={styles.itemSub}>Ver e editar dados</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <View style={[styles.iconBox, { backgroundColor: '#FFEBEE' }]}>
                    <Ionicons name="log-out" size={24} color="#D32F2F" />
                  </View>
                  <View style={{flex:1}}>
                    <Text style={[styles.itemTitle, { color: '#D32F2F' }]}>Terminar Sessão</Text>
                    <Text style={styles.itemSub}>Sair da conta</Text>
                  </View>
                </TouchableOpacity>

              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarImage: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#1D3C58', backgroundColor: '#eee'
  },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#1D3C58'
  },
  avatarText: {
    color: '#1D3C58', fontWeight: 'bold', fontSize: 16
  },
  overlayContainer: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', flexDirection: 'row', justifyContent: 'flex-end',
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  slidingMenu: {
    width: '85%', maxWidth: 400, height: '100%',
    backgroundColor: '#F9F9F9',
    shadowColor: "#000", shadowOffset: { width: -2, height: 0 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5,
  },
  menuHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE', backgroundColor: 'white',
  },
  menuTitle: { fontSize: 24, fontWeight: 'bold', color: '#1D3C58' },
  closeBtn: { padding: 5, borderRadius: 20, backgroundColor: '#F0F0F0' },
  menuItems: { padding: 20 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset:{width:0, height:2}
  },
  iconBox: {
    width: 45, height: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15,
  },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  itemSub: { fontSize: 12, color: '#888', marginTop: 2 },
  divider: { height: 20 },
});