import React, { useState, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, Modal, StyleSheet, 
  Platform, SafeAreaView, Animated, Dimensions, Easing 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function HeaderMenu() {
  const [visible, setVisible] = useState(false);
  // Valor inicial da animação: largura do ecrã (fora do ecrã à direita)
  const slideAnim = useRef(new Animated.Value(width)).current;
  
  const navigation = useNavigation();

  // --- FUNÇÃO PARA ABRIR (ANIMAÇÃO) ---
  const openMenu = () => {
    setVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0, // Vai para a posição 0 (ecrã visível)
      duration: 300, // Rapidez da animação (ms)
      useNativeDriver: true,
      easing: Easing.out(Easing.poly(4)), // Efeito suave no final
    }).start();
  };

  // --- FUNÇÃO PARA FECHAR (ANIMAÇÃO INVERSA) ---
  const closeMenu = (callback) => {
    Animated.timing(slideAnim, {
      toValue: width, // Volta para fora do ecrã (direita)
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      if (callback) callback();
    });
  };

  const handleLogout = async () => {
    closeMenu(async () => {
      if (Platform.OS === 'web') {
          localStorage.clear();
      } else {
          await AsyncStorage.clear();
      }
      
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
      {/* Botão de Abrir */}
      <TouchableOpacity onPress={openMenu} style={{ marginRight: 15 }}>
        <Ionicons name="person-circle-outline" size={32} color="#1D3C58" />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent={true} // Importante para ver o fundo enquanto anima
        animationType="none" // Desligamos a animação nativa para usar a nossa
        onRequestClose={() => closeMenu()}
      >
        {/* Fundo Escuro (Overlay) - Clicar aqui fecha o menu */}
        <View style={styles.overlayContainer}>
          <TouchableOpacity style={styles.backdrop} onPress={() => closeMenu()} />
          
          {/* O Menu que desliza */}
          <Animated.View 
            style={[
              styles.slidingMenu, 
              { transform: [{ translateX: slideAnim }] }
            ]}
          >
            <SafeAreaView style={{ flex: 1 }}>
              
              {/* Cabeçalho do Menu */}
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Menu</Text>
                <TouchableOpacity onPress={() => closeMenu()} style={styles.closeBtn}>
                  <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
              </View>

              {/* Itens do Menu */}
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

                <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); alert("Em breve!"); }}>
                  <View style={[styles.iconBox, { backgroundColor: '#F3E5F5' }]}>
                    <Ionicons name="settings" size={24} color="#7B1FA2" />
                  </View>
                  <View style={{flex:1}}>
                    <Text style={styles.itemTitle}>Definições</Text>
                    <Text style={styles.itemSub}>Preferências da app</Text>
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
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)', // Fundo semitransparente escuro
    flexDirection: 'row',
    justifyContent: 'flex-end', // Alinha o menu à direita
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject, // Ocupa todo o espaço atrás para detetar clique
  },
  slidingMenu: {
    width: '100%', // Podes mudar para '85%' se quiseres ver um pouco do fundo
    height: '100%',
    backgroundColor: '#F9F9F9',
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: 'white',
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D3C58',
  },
  closeBtn: {
    padding: 5,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  menuItems: {
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset:{width:0, height:2}
  },
  iconBox: {
    width: 45, height: 45, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 15,
  },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  itemSub: { fontSize: 12, color: '#888', marginTop: 2 },
  divider: { height: 20 },
});