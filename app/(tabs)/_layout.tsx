import { Tabs } from 'expo-router';
import ConsumerTabBar from '../../components/nav/ConsumerTabBar';

export default function ConsumerTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <ConsumerTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="nearby" />
      <Tabs.Screen name="streak" />
      <Tabs.Screen name="my-deals" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
