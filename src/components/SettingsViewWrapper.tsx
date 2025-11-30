import { getThemePreference } from '@/lib/themes/actions';
import SettingsView from './SettingsView';

export default async function SettingsViewWrapper() {
  const currentTheme = await getThemePreference();
  return <SettingsView currentTheme={currentTheme} />;
}
