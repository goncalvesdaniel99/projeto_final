import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Platform, Image } from "react-native";
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

// Imports dos Ecrãs
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from "./src/screens/RegisterScreen";
import HomeScreen from './src/screens/HomeScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import ChatScreen from './src/screens/ChatScreen';
import MyGroupsScreen from './src/screens/MyGroupsScreen';
import GroupDetailsScreen from './src/screens/GroupDetailsScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import MeetingsScreen from './src/screens/MeetingsScreen';
import FilesScreen from "./src/screens/FilesScreen";
import GroupInfoScreen from './src/screens/GroupInfoScreen';
import ProfileScreen from './src/screens/ProfileScreen'; 
import HeaderMenu from './src/components/HeaderMenu';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState("Login");

  useEffect(() => {
    const verificarLogin = async () => {
      try {
        let token = null;
        if (Platform.OS === "web") {
          token = localStorage.getItem("token");
        } else {
          token = await AsyncStorage.getItem("token");
        }

        if (token) {
          setInitialRoute("Home");
        } else {
          setInitialRoute("Login");
        }
      } catch (e) {
        setInitialRoute("Login");
      } finally {
        setIsLoading(false);
      }
    };

    verificarLogin();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F6F9FC" }}>
        <ActivityIndicator size="large" color="#1D3C58" />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName={initialRoute}
          screenOptions={{
            headerTintColor: '#1D3C58',
            headerBackTitleVisible: false,
            headerTitle: () => null,
            
            // Fundo com o Logo Centrado
            headerBackground: () => (
              <View style={{ 
                flex: 1, 
                backgroundColor: '#F6F9FC', 
                justifyContent: 'center', 
                alignItems: 'center'
              }}>
                <Image 
                  source={require('./assets/icon.png')} 
                  style={{ width: 120, height: 40, resizeMode: 'contain' }} 
                />
              </View>
            ),

            // --- MENU GLOBAL ---
            // Define o menu para aparecer em TODAS as telas por defeito.
            headerRight: () => <HeaderMenu />,
          }}
        >

          {/* Login: Sem Cabeçalho */}
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }} 
          />

          {/* Registo: Cabeçalho simples, SEM Menu */}
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false }} 
          />

          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ headerBackVisible: false }} 
          />

          <Stack.Screen name="Groups" component={GroupsScreen} />
          
          {/* --- EXCEÇÃO DO MENU --- */}
          {/* Chat: Cabeçalho visível, mas headerRight anulado (sem menu) */}
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen} 
            options={{ headerRight: null }}
          />

          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen} 
            options={{ title: "O meu Perfil" }} 
          />

          {/* MyGroups: Herda o Menu Global */}
          <Stack.Screen 
            name="MyGroups" 
            component={MyGroupsScreen} 
            options={{ title: "StudyConnect" }} 
          />

          <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} />
          <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
          <Stack.Screen name="Reunioes" component={MeetingsScreen} />
          <Stack.Screen name="Files" component={FilesScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />

          <Stack.Screen 
            name="GroupInfo" 
            component={GroupInfoScreen} 
            options={{ title: "Detalhes do Grupo" }} 
          />

        </Stack.Navigator>
      </NavigationContainer>

      <Toast />
    </>
  );
}