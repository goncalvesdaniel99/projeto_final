import React, { useState } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, 
  Platform, Alert 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function MyGroupsScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Define o URL correto automaticamente
  const API_URL = Platform.OS === 'android' 
    ? "http://10.0.2.2:3000" 
    : "http://localhost:3000";

  // Função para fazer Logout forçado
  const forcarLogout = async () => {
    if (Platform.OS === 'web') {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
    } else {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('userId');
    }
    navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
    });
  };

  const fetchMyGroups = async () => {
    setLoading(true);
    try {
      let token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log("Sem token, a fazer logout...");
        forcarLogout();
        return;
      }

      // Limpeza de segurança do token
      token = token.replace(/^"|"$/g, '');

      console.log("📡 A pedir grupos a:", `${API_URL}/groups/my`);

      const res = await fetch(`${API_URL}/groups/my`, {
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` 
        }
      });

      if (res.status === 401 || res.status === 403) {
        Alert.alert(
            "Sessão Expirada", 
            "Por favor entra novamente.",
            [{ text: "OK", onPress: () => forcarLogout() }]
        );
        return;
      }

      const data = await res.json();
      
      if (res.ok) {
        console.log("✅ Grupos recebidos:", data.length);
        setGroups(data);
      } else {
        console.log("❌ Erro ao buscar grupos:", data);
        Alert.alert("Erro", "Não foi possível carregar os grupos.");
      }
    } catch (error) {
      console.log("❌ Erro de conexão:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchMyGroups();
    }, [])
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      // 🔥 ALTERADO: Vai para o Chat, mas leva os dados do grupo (groupData)
      onPress={() => navigation.navigate('Chat', { 
        groupId: item._id, 
        groupName: item.disciplina,
        groupData: item // Importante para o botão de definições no Chat
      })}
    >
      <View style={styles.iconContainer}>
         <Text style={styles.iconText}>👥</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.groupName}>
            {item.disciplina || "Sem Nome"}
        </Text>
        <Text style={styles.groupDesc}>
            {item.curso} • {item.ano}º Ano
        </Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Os Meus Grupos</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#1D3C58" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50 }}>
                <Text style={styles.emptyText}>Ainda não pertences a nenhum grupo.</Text>
                <TouchableOpacity 
                    style={styles.createBtn}
                    onPress={() => navigation.navigate("CreateGroup")}
                >
                    <Text style={{color: '#fff', fontWeight: 'bold'}}>Criar Novo Grupo</Text>
                </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F9FC', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1D3C58', marginBottom: 20 },
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EEE'
  },
  iconContainer: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center',
    marginRight: 15
  },
  iconText: { fontSize: 20 },
  infoContainer: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  groupDesc: { fontSize: 12, color: '#666', marginTop: 2 },
  arrow: { fontSize: 24, color: '#CCC', fontWeight: 'bold', paddingBottom: 4 },
  emptyText: { textAlign: 'center', color: '#999', fontSize: 16, marginBottom: 20 },
  createBtn: {
      backgroundColor: '#1D3C58', padding: 10, borderRadius: 8
  }
});