import { NativeTabs } from 'expo-router/native-tabs';

import { strings } from '@/ui/strings';
import { colors, typography } from '@/ui/theme';

export default function TabsLayout() {
  return (
    <NativeTabs
      backBehavior="initialRoute"
      backgroundColor={colors.surface}
      iconColor={{ default: colors.textMuted, selected: colors.primary }}
      indicatorColor={colors.primarySoft}
      labelStyle={{
        default: { color: colors.textMuted, fontSize: typography.caption.fontSize },
        selected: { color: colors.primary, fontSize: typography.caption.fontSize },
      }}
      labelVisibilityMode="labeled"
      rippleColor={colors.primarySoft}
    >
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
