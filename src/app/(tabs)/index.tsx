import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnaSayfaIcerik } from '@/components/ekranlar/ana-sayfa-icerik';
import { useIsrafetmeController } from '@/hooks/use-israfetme-controller';
import { styles } from '@/styles/israfetme-styles';

export default function AnaSayfa() {
  const c = useIsrafetmeController();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AnaSayfaIcerik c={c} />
      </ScrollView>
    </SafeAreaView>
  );
}
