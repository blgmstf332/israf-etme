import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GecmisIcerik } from '@/components/ekranlar/gecmis-icerik';
import { useIsrafetmeController } from '@/hooks/use-israfetme-controller';
import { styles } from '@/styles/israfetme-styles';

export default function GecmisSayfasi() {
  const c = useIsrafetmeController();
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <GecmisIcerik c={c} />
      </ScrollView>
    </SafeAreaView>
  );
}
