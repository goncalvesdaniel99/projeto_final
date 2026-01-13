import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>

      <Text style={styles.title}>Menu Principal</Text>

      <View style={styles.grid}>

        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate("Groups")}
        >
          <Text style={styles.cardTitle}>Grupos</Text>
          <Text style={styles.cardSub}>Ver todos os grupos disponíveis</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate("MyGroups")}
        >
          <Text style={styles.cardTitle}>Meus Grupos</Text>
          <Text style={styles.cardSub}>Grupos onde és membro</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate('Reunioes')}
        >
          <Text style={styles.cardTitle}>Reuniões</Text>
          <Text style={styles.cardSub}>Datas de estudo marcadas</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate("Files")}
        >
          <Text style={styles.cardTitle}>Ficheiros</Text>
          <Text style={styles.cardSub}>Documentos partilhados</Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: "#f9f9f9"
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },
  card: {
    width: "48%",
    backgroundColor: "#e8e8e8",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  cardSub: {
    fontSize: 14,
    marginTop: 5,
    color: "#555"
  }
});
