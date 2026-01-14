import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
  SafeAreaView,
  StatusBar,
  Dimensions
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

const API_BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

export default function FilesScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [groupsFiles, setGroupsFiles] = useState([]);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    carregarFicheiros();
  }, [navigation]);

  async function carregarFicheiros() {
    try {
      setLoading(true);
      let token = await AsyncStorage.getItem("token");
      if (!token) return;
      token = token.replace(/^"|"$/g, '');

      const resGroups = await fetch(`${API_BASE_URL}/groups/my`, {
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
      });

      const grupos = await resGroups.json();
      if (!resGroups.ok || !Array.isArray(grupos)) {
        setGroupsFiles([]);
        return;
      }

      const results = await Promise.all(
        grupos.map(async (g) => {
          try {
            const resFiles = await fetch(`${API_BASE_URL}/files/group/${g._id}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const files = await resFiles.json();
            return { group: g, files: Array.isArray(files) ? files : [] };
          } catch (err) {
            return { group: g, files: [] };
          }
        })
      );

      const mapped = results.map(({ group, files }) => ({
        groupId: group._id,
        groupLabel: group.disciplina || "Sem Nome",
        courseLabel: `${group.curso || ""} ${group.ano || ""}º Ano`,
        files,
      }));

      setGroupsFiles(mapped);
    } catch (err) {
      Alert.alert("Erro", "Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  function toggleGroup(groupId) {
    setExpanded((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }

  async function downloadFile(file) {
    try {
      let token = await AsyncStorage.getItem("token");
      if (token) token = token.replace(/^"|"$/g, '');
      const url = `${API_BASE_URL}/files/${file._id}/download`;

      if (Platform.OS === "web") {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = file.originalName || file.title || "ficheiro";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        Linking.openURL(`${url}?token=${token}`);
      }
    } catch (err) {
      Alert.alert("Erro", "Não foi possível descarregar.");
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient 
        colors={['#E2E8F0', '#F8FAFC', '#F1F5F9']} 
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
                <Ionicons name="arrow-back" size={22} color="#1D3C58" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Documentos</Text>
            <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.centeredWrapper}>
            {loading ? (
              <ActivityIndicator size="large" color="#795548" style={{ marginTop: 50 }} />
            ) : groupsFiles.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="folder-open-outline" size={60} color="#CBD5E1" />
                <Text style={styles.emptyText}>Ainda não tens ficheiros partilhados.</Text>
              </View>
            ) : (
              groupsFiles.map((g) => (
                <View key={g.groupId} style={styles.groupBox}>
                  <TouchableOpacity
                    style={styles.groupHeader}
                    onPress={() => toggleGroup(g.groupId)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.groupHeaderLeft}>
                        <View style={styles.iconBox}>
                            <Ionicons name="folder" size={20} color="#795548" />
                        </View>
                        <View>
                            <Text style={styles.groupTitle}>{g.groupLabel}</Text>
                            <Text style={styles.groupSub}>{g.courseLabel}</Text>
                        </View>
                    </View>
                    <Ionicons 
                        name={expanded[g.groupId] ? "chevron-up" : "chevron-down"} 
                        size={20} color="#94A3B8" 
                    />
                  </TouchableOpacity>

                  {expanded[g.groupId] && (
                    <View style={styles.groupContent}>
                      {g.files.length === 0 ? (
                        <Text style={styles.emptyTextGroup}>Nenhum ficheiro neste grupo.</Text>
                      ) : (
                        g.files.map((f) => (
                          <View key={f._id} style={styles.fileRow}>
                            <View style={styles.fileIcon}>
                                <Ionicons name="document-text" size={24} color="#1D3C58" />
                            </View>
                            <View style={styles.fileInfo}>
                              <Text style={styles.fileTitle} numberOfLines={1}>{f.title}</Text>
                              <Text style={styles.fileMeta}>
                                {f.uploader?.nome?.split(' ')[0] || "User"} • {new Date(f.createdAt).toLocaleDateString('pt-PT')}
                              </Text>
                            </View>

                            <TouchableOpacity
                              style={styles.downloadButton}
                              onPress={() => downloadFile(f)}
                            >
                              <Ionicons name="download-outline" size={20} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
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
  scrollContent: { paddingBottom: 40 },
  centeredWrapper: { alignSelf: 'center', width: '100%', maxWidth: 750, paddingHorizontal: 20 },
  
  groupBox: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 20,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10
  },
  groupHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  groupHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { backgroundColor: 'rgba(121, 85, 72, 0.1)', padding: 8, borderRadius: 10 },
  groupTitle: { fontSize: 16, fontWeight: "800", color: '#1D3C58' },
  groupSub: { fontSize: 12, color: "#64748B", fontWeight: '500' },
  
  groupContent: {
    backgroundColor: 'rgba(248, 250, 252, 0.5)',
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)'
  },
  fileRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: '#FFF', padding: 12, borderRadius: 14,
    marginBottom: 8, elevation: 1, shadowOpacity: 0.02
  },
  fileIcon: { marginRight: 12 },
  fileInfo: { flex: 1 },
  fileTitle: { fontSize: 14, fontWeight: "700", color: '#1E293B' },
  fileMeta: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  
  downloadButton: {
    backgroundColor: "#1D3C58",
    width: 36, height: 36, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  emptyContainer: { alignItems: 'center', marginTop: 50, opacity: 0.5 },
  emptyText: { fontSize: 15, color: "#64748B", marginTop: 10, textAlign: 'center' },
  emptyTextGroup: { fontSize: 13, color: "#94A3B8", textAlign: 'center', paddingVertical: 10, fontStyle: 'italic' },
});