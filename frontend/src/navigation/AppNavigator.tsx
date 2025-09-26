import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';

// Import your components
import LandingPage from '../components/landing/LandingPage';
import StudentDashboard from '../components/StudentDashboard';
import DonorDashboard from '../components/donor/DonorDashboard';
import AdminDashboard from '../components/admin/AdminDashboard';
import AdminLoginPage from '../components/admin/AdminLoginPage';
import PublicProfilePage from '../components/PublicProfilePage';
import AuthModal from '../components/auth/AuthModal';

// Define the stack navigator types
export type RootStackParamList = {
  Landing: undefined;
  StudentDashboard: { userData: any };
  DonorDashboard: { userData: any };
  AdminDashboard: { userData: any };
  AdminLogin: undefined;
  PublicProfile: { profileUrl: string };
  Auth: { type: 'login' | 'signup'; userType: 'student' | 'donor' | 'admin' };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  isLoggedIn: boolean;
  userData: any;
  userType: 'student' | 'donor' | 'admin';
  showAdminPortal: boolean;
  onLogout: () => void;
  onProfileUpdate: (profile: any) => void;
  onAdminLogin: (userData: any) => void;
  onBackToPublic: () => void;
}

const AppNavigator: React.FC<AppNavigatorProps> = ({
  isLoggedIn,
  userData,
  userType,
  showAdminPortal,
  onLogout,
  onProfileUpdate,
  onAdminLogin,
  onBackToPublic
}) => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Landing"
        screenOptions={{
          headerShown: false,
          animation: Platform.OS === 'ios' ? 'slide_from_right' : 'slide_from_right'
        }}
      >
        {/* Landing Page */}
        <Stack.Screen name="Landing" component={LandingPage} />
        
        {/* Public Profile Page */}
        <Stack.Screen 
          name="PublicProfile" 
          component={PublicProfilePage}
          options={{ headerShown: false }}
        />
        
        {/* Admin Login */}
        {showAdminPortal && (
          <Stack.Screen 
            name="AdminLogin" 
            component={AdminLoginPage}
            options={{ headerShown: false }}
          />
        )}
        
        {/* Authenticated User Dashboards */}
        {isLoggedIn && userData && (
          <>
            {userType === 'student' && (
              <Stack.Screen 
                name="StudentDashboard" 
                component={StudentDashboard}
                initialParams={{ userData }}
                options={{ headerShown: false }}
              />
            )}
            {userType === 'donor' && (
              <Stack.Screen 
                name="DonorDashboard" 
                component={DonorDashboard}
                initialParams={{ userData }}
                options={{ headerShown: false }}
              />
            )}
            {userType === 'admin' && (
              <Stack.Screen 
                name="AdminDashboard" 
                component={AdminDashboard}
                initialParams={{ userData }}
                options={{ headerShown: false }}
              />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 