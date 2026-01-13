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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

export default function FilesScreen() {
  const [loading, setLoading] = useState(false);
  const [groupsFiles, setGroupsFiles] = useState([]); // [{ groupId, groupLabel, files: [...] }]
  const [expanded, setExpanded] = useState({}); // { [groupId]: true/false }

  useEffect(() => {
    carregarFicheiros();
  }, []);

  async function carregarFicheiros() {
    try {
      setLoading(true);
      
      // 1) OBTER E LIMPAR O TOKEN
      let token = await AsyncStorage.getItem("token");
      
      if (!token) {
        console.error("❌ ERRO: Nenhum token encontrado no AsyncStorage.");
        Alert.alert("Erro", "Precisas de fazer login novamente.");
        return;
      }

      // TRUQUE: Remove aspas extra se existirem
      token = token.replace(/^"|"$/g, '');

      // 2) Buscar grupos
      const resGroups = await fetch(`${API_BASE_URL}/groups/my`, {
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
      });

      const grupos = await resGroups.json();

      if (!resGroups.ok) {
        if (resGroups.status === 401) Alert.alert("Sessão Expirada", "Faz login novamente.");
        return;
      }

      if (!Array.isArray(grupos) || grupos.length === 0) {
        setGroupsFiles([]);
        return;
      }

      // 3) Buscar ficheiros
      const results = await Promise.all(
        grupos.map(async (g) => {
          try {
            const url = `${API_BASE_URL}/files/group/${g._id}`;
            const resFiles = await fetch(url, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            const files = await resFiles.json();

            if (!resFiles.ok) {
              return { group: g, files: [] };
            }

            return { group: g, files: Array.isArray(files) ? files : [] };
          } catch (err) {
            console.error(`❌ ERRO FETCH GRUPO ${g._id}:`, err);
            return { group: g, files: [] };
          }
        })
      );

      const mapped = results.map(({ group, files }) => {
        const label = `${group.curso || ""} ${group.ano || ""}º - ${
          group.disciplina || ""
        }`.trim();

        return {
          groupId: group._id,
          groupLabel: label || "Grupo sem nome",
          files,
        };
      });

      setGroupsFiles(mapped);

    } catch (err) {
      console.error("❌ ERRO GERAL (CATCH):", err);
      Alert.alert("Erro", "Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  function toggleGroup(groupId) {
    setExpanded((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }

  async function downloadFile(file) {
    try {
      let token = await AsyncStorage.getItem("token");
      if (token) {
        // IMPORTANTE: Limpar as aspas também aqui para o download funcionar
        token = token.replace(/^"|"$/g, '');
      }

      const url = `${API_BASE_URL}/files/${file._id}/download`;

      if (Platform.OS === "web") {
        // WEB: fazemos fetch com Authorization e criamos um blob
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          Alert.alert("Erro", "Não foi possível descarregar o ficheiro.");
          return;
        }

        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = file.originalName || file.title || "ficheiro";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        // MOBILE: abrimos no browser do sistema enviando o token na URL
        const urlWithToken = `${url}?token=${token}`;
        Linking.openURL(urlWithToken);
      }
    } catch (err) {
      console.log("ERRO AO DESCARREGAR FICHEIRO:", err);
      Alert.alert("Erro", "Não foi possível descarregar o ficheiro.");
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>A carregar ficheiros...</Text>
      </View>
    );
  }

  if (!loading && groupsFiles.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          Ainda não existem ficheiros partilhados nos teus grupos.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Ficheiros Partilhados</Text>

      {groupsFiles.map((g) => (
        <View key={g.groupId} style={styles.groupBox}>
          <TouchableOpacity
            style={styles.groupHeader}
            onPress={() => toggleGroup(g.groupId)}
          >
            <Text style={styles.groupTitle}>{g.groupLabel}</Text>
            <Text style={styles.groupArrow}>
              {expanded[g.groupId] ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {expanded[g.groupId] && (
            <View style={styles.groupContent}>
              {g.files.length === 0 ? (
                <Text style={styles.emptyTextGroup}>
                  Nenhum ficheiro partilhado neste grupo.
                </Text>
              ) : (
                g.files.map((f) => (
                  <View key={f._id} style={styles.fileRow}>
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileTitle}>{f.title}</Text>
                      <Text style={styles.fileMeta}>
                        {f.uploader?.nome || "Desconhecido"} •{" "}
                        {f.createdAt
                          ? new Date(f.createdAt).toLocaleString("pt-PT")
                          : ""}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.downloadButton}
                      onPress={() => downloadFile(f)}
                    >
                      <Text style={styles.downloadButtonText}>
                        Descarregar
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },
  groupBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  groupArrow: {
    fontSize: 18,
  },
  groupContent: {
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  fileInfo: {
    flex: 1,
    marginRight: 8,
  },
  fileTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  fileMeta: {
    fontSize: 12,
    color: "#666",
  },
  downloadButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  downloadButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  emptyTextGroup: {
    fontSize: 13,
    color: "#777",
  },
});