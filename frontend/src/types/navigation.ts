import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Register: undefined;
  About: undefined;
  Contact: undefined;
  Privacy: undefined;
  Terms: undefined;
};

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>; 