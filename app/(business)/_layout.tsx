import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

const Feather = require('@expo/vector-icons/Feather').default;

import BusinessTabBar from '../../components/nav/BusinessTabBar';

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      tabBar={(props) => <BusinessTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0c0c0f' }, // Fallback; BusinessTabBar overrides
        animation: 'shift',
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('nav.home', 'Dashboard'),
          tabBarIcon: ({ focused }) => (
            <Feather name="home" size={22} color={focused ? '#c8e000' : '#8a8a8f'} />
          ),
        }}
      />
      <Tabs.Screen
        name="deals"
        options={{
          title: t('nav.deals', 'Deals'),
          tabBarIcon: ({ focused }) => (
            <Feather name="tag" size={22} color={focused ? '#c8e000' : '#8a8a8f'} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t('nav.create', 'Create'),
          animation: 'slide_from_bottom',
          tabBarIcon: ({ focused }) => (
            <Feather name="plus-circle" size={22} color={focused ? '#c8e000' : '#8a8a8f'} />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: t('nav.scanner', 'Scanner'),
          tabBarIcon: ({ focused }) => (
            <Feather name="camera" size={22} color={focused ? '#c8e000' : '#8a8a8f'} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile', 'Profile'),
          tabBarIcon: ({ focused }) => (
            <Feather name="user" size={22} color={focused ? '#c8e000' : '#8a8a8f'} />
          ),
        }}
      />
    </Tabs>
  );
}
