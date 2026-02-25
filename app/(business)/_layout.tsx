import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

import BusinessTabBar from '../../components/nav/BusinessTabBar';

function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return (
    <View className="items-center justify-center w-6 h-6">
      <Text
        style={{ fontSize: 18, color: focused ? '#c8e000' : '#8a8a8f' }}
      >
        {symbol}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BusinessTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0c0c0f' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon symbol="⌂" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="deals"
        options={{
          title: 'Deals',
          tabBarIcon: ({ focused }) => <TabIcon symbol="%" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ focused }) => <TabIcon symbol="+" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scanner',
          tabBarIcon: ({ focused }) => <TabIcon symbol="▦" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon symbol="◯" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
