import { NativeTabs } from 'expo-router/native-tabs';

import { strings } from '@/ui/strings';

export default function TabsLayout() {
  return (
    <NativeTabs backBehavior="initialRoute">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon md="today" />
        <NativeTabs.Trigger.Label>{strings.tabs.today}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Icon md="history" />
        <NativeTabs.Trigger.Label>{strings.tabs.history}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon md="settings" />
        <NativeTabs.Trigger.Label>{strings.tabs.settings}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
