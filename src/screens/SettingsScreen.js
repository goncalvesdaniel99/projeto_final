import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen({ navigation }) {
  // Estados para os toggles (exemplo)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);

  // --- Função para apagar conta (Simulação) ---
  const handleDeleteAccount = () => {
    Alert.alert(
      "Apagar Conta",
      "Tens a certeza? Esta ação é irreversível e perderás todos os teus dados.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Apagar Definitivamente", 
          style: "destructive", 
          onPress: async () => {
            // Aqui chamarias a API para apagar: fetch(`${BASE_URL}/auth/delete`, ...)
            await AsyncStorage.clear();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }
        }
      ]
    );
  };

  // --- Componente de Item de Menu ---
  const SettingItem = ({ icon, title, subtitle, onPress, toggle, value, color = "#333" }) => (
    <TouchableOpacity 
      style={styles.itemContainer} 
      onPress={onPress} 
      disabled={!!toggle} // Se tiver toggle, o clique é no switch
    >
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={24} color="#1D3C58" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemTitle, { color }]}>{title}</Text>
        {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
      </View>
      {toggle ? (
        <Switch 
          trackColor={{ false: "#767577", true: "#1D3C58" }}
          thumbColor={value ? "#f4f3f4" : "#f4f3f4"}
          onValueChange={toggle}
          value={value}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Definições</Text>

      {/* --- SECÇÃO GERAL --- */}
      <Text style={styles.sectionHeader}>Geral</Text>
      <View style={styles.section}>
        <SettingItem 
          icon="notifications-outline" 
          title="Notificações" 
          subtitle="Receber alertas de mensagens"
          toggle={() => setNotificationsEnabled(!notificationsEnabled)}
          value={notificationsEnabled}
        />
        <SettingItem 
          icon="moon-outline" 
          title="Modo Escuro" 
          subtitle="Alterar aparência da app"
          toggle={() => setDarkMode(!darkMode)}
          value={darkMode}
        />
        <SettingItem 
          icon="eye-outline" 
          title="Perfil Público" 
          subtitle="Permitir que outros te encontrem"
          toggle={() => setPublicProfile(!publicProfile)}
          value={publicProfile}
        />
      </View>

      {/* --- SECÇÃO SUPORTE --- */}
      <Text style={styles.sectionHeader}>Suporte</Text>
      <View style={styles.section}>
        <SettingItem 
          icon="help-circle-outline" 
          title="Ajuda e Suporte" 
          onPress={() => Linking.openURL('mailto:suporte@estudajunto.pt')}
        />
        <SettingItem 
          icon="document-text-outline" 
          title="Termos e Condições" 
          onPress={() => Alert.alert("Info", "A abrir termos...")}
        />
        <SettingItem 
          icon="information-circle-outline" 
          title="Sobre a App" 
          subtitle="Versão 1.0.2"
          onPress={() => Alert.alert("EstudaJunto", "Desenvolvido por Daniel Lima")}
        />
      </View>

      {/* --- SECÇÃO PERIGO --- */}
      <Text style={styles.sectionHeader}>Conta</Text>
      <View style={styles.section}>
        <TouchableOpacity style={styles.itemContainer} onPress={handleDeleteAccount}>
          <View style={[styles.iconBox, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="trash-outline" size={24} color="#D32F2F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemTitle, { color: '#D32F2F' }]}>Eliminar Conta</Text>
            <Text style={styles.itemSubtitle}>Esta ação é permanente</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>EstudaJunto © 2026</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F9FC', padding: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1D3C58', marginBottom: 20 },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#888', marginBottom: 10, textTransform: 'uppercase', marginLeft: 5 },
  section: { backgroundColor: 'white', borderRadius: 12, padding: 5, marginBottom: 25, shadowColor: "#000", shadowOffset: {width:0, height:1}, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  
  itemContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  iconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  itemSubtitle: { fontSize: 12, color: '#999', marginTop: 2 },
  
  footerText: { textAlign: 'center', color: '#CCC', fontSize: 12, marginBottom: 40, marginTop: 10 }
});