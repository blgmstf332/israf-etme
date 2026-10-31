import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { KarsilamaEkrani } from '@/components/karsilama-ekrani';
import { UygulamaProvider } from '@/context/uygulama-context';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <UygulamaProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <KarsilamaEkrani />
      </UygulamaProvider>
    </ThemeProvider>
  );
}
