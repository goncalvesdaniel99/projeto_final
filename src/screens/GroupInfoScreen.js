import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Alert, ActivityIndicator, Platform 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function GroupInfoScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = Platform.OS === 'android' ? "http://10.0.2.2:3000" : "http://localhost:3000";

  // --- 1. LIMPAR O HEADER ---
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Detalhes do Grupo",
      headerRight: () => null, 
    });
  }, [navigation]);

  useEffect(() => {
    fetchGroupInfo();
  }, []);

  const fetchGroupInfo = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/groups/info/${groupId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setGroup(data);
      } else {
        console.log("Erro info:", data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // --- CORREÇÃO AQUI: Suporte para Web e Mobile ---
  const handleLeaveGroup = () => {
    console.log("Botão Sair Clicado!"); 
    
    if (Platform.OS === 'web') {
        const confirm = window.confirm("Tens a certeza que queres sair? Deixarás de ver as mensagens.");
        if (confirm) {
            confirmLeave();
        }
    } else {
        Alert.alert(
            "Sair do Grupo",
            "Tens a certeza que queres sair? Deixarás de ver as mensagens.",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Sair", 
                    style: "destructive", 
                    onPress: confirmLeave 
                }
            ]
        );
    }
  };

  const confirmLeave = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/groups/leave/${groupId}`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();

      if (res.ok) {
        // Sucesso
        if (Platform.OS === 'web') {
            window.alert(data.message || "Saíste do grupo.");
        } else {
            Alert.alert("Sucesso", data.message);
        }
        
        // Redireciona
        navigation.reset({
          index: 0,
          routes: [{ name: 'MyGroups' }],
        });
      } else {
        // Erro do backend
        const msg = data.error || data.message || "Erro ao sair.";
        if (Platform.OS === 'web') {
            window.alert(msg);
        } else {
            Alert.alert("Aviso", msg);
        }
      }
    } catch (error) {
      console.log(error);
      const msg = "Falha de conexão.";
      if (Platform.OS === 'web') {
          window.alert(msg);
      } else {
          Alert.alert("Erro", msg);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1D3C58" />
      </View>
    );
  }

  // Componente do Cabeçalho da Lista
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>{group?.disciplina}</Text>
      <Text style={styles.subtitle}>{group?.curso} • {group?.ano}º Ano</Text>
      <Text style={styles.ocupacao}>
        Membros: {group?.membros.length} / {group?.maxPessoas}
      </Text>
      <Text style={styles.sectionTitle}>Membros</Text>
    </View>
  );

  // Componente do Rodapé da Lista
  const renderFooter = () => (
    <View style={{ paddingBottom: 40, paddingTop: 20 }}>
      <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
        <Text style={styles.leaveText}>Sair do Grupo</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={group?.membros}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.nome ? item.nome.charAt(0).toUpperCase() : "?"}</Text>
            </View>
            <View>
              <Text style={styles.memberName}>{item.nome}</Text>
              <Text style={styles.memberEmail}>{item.email}</Text>
              {group?.criador._id === item._id && (
                <Text style={styles.adminBadge}>Administrador</Text>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F9FC', paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerContainer: { alignItems: 'center', marginVertical: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1D3C58', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 5 },
  ocupacao: { fontSize: 14, color: '#888', marginTop: 5, marginBottom: 20 },
  
  sectionTitle: { 
    fontSize: 18, fontWeight: 'bold', color: '#333', alignSelf: 'flex-start', marginBottom: 10 
  },
  
  memberCard: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', 
    padding: 10, borderRadius: 10, marginBottom: 10,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 1
  },
  avatar: { 
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F0FE', 
    justifyContent: 'center', alignItems: 'center', marginRight: 15 
  },
  avatarText: { fontSize: 18, color: '#1D3C58', fontWeight: 'bold' },
  memberName: { fontSize: 16, fontWeight: '600' },
  memberEmail: { fontSize: 12, color: '#666' },
  adminBadge: { fontSize: 10, color: 'orange', fontWeight: 'bold', marginTop: 2 },

  leaveButton: { 
    backgroundColor: '#FF3B30', padding: 15, 
    borderRadius: 10, alignItems: 'center' 
  },
  leaveText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});