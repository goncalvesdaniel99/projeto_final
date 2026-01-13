import React, { useState } from 'react';
import { 
  View, Text, TouchableOpacity, Modal, StyleSheet, 
  TouchableWithoutFeedback, Platform 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function HeaderMenu() {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();

  const handleLogout = async () => {
    setVisible(false);
    
    if (Platform.OS === 'web') {
        localStorage.clear();
    } else {
        await AsyncStorage.clear();
    }
    
    navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
    });
  };

  const navigateTo = (screen) => {
    setVisible(false);
    navigation.navigate(screen);
  };

  return (
    <View>
      {/* Botão Principal (Foto de Perfil) */}
      <TouchableOpacity onPress={() => setVisible(true)} style={{ marginRight: 15 }}>
        <Ionicons name="person-circle-outline" size={32} color="#1D3C58" />
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.modalOverlay}>
            
            <View style={styles.menuContainer}>
              
              <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Profile')}>
                <Ionicons name="person-outline" size={22} color="#333" style={styles.icon} />
                <Text style={styles.menuText}>O meu Perfil</Text>
              </TouchableOpacity>
              
              <View style={styles.divider} />

              <TouchableOpacity style={styles.menuItem} onPress={() => alert("Definições em breve")}>
                {/* --- MUDANÇA AQUI: ÍCONE DE RODA DENTADA (SETTINGS) --- */}
                <Ionicons name="settings-outline" size={22} color="#333" style={styles.icon} />
                <Text style={styles.menuText}>Definições</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={22} color="red" style={styles.icon} />
                <Text style={[styles.menuText, { color: 'red' }]}>Terminar Sessão</Text>
              </TouchableOpacity>
            
            </View>

          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    marginTop: Platform.OS === 'ios' ? 50 : 10,
    marginRight: 10,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 220,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 45, 
  }
});