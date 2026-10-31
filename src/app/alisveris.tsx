import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AlisverisEkrani } from '@/components/alisveris-ekrani';
import { useUygulama } from '@/context/uygulama-context';
import { yeniId } from '@/utils/urun-veri-modeli';

/**
 * 28A geçiş ekranı.
 * Rotanın kendisi gerçektir; ancak mevcut AlisverisEkrani
 * içindeki Modal henüz kaldırılmadı. Orijinal dosya paylaşıldığında
 * içerik bu rota üzerinde doğrudan gösterilebilir.
 * Bu adaptör var olan alışveriş kayıt biçimine dokunmaz.
 */
export default function AlisverisSayfasi() {
  const router = useRouter();
  const {
    veriler,
    setVeriler,
    alisverisRevizyonu,
  } = useUygulama();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Alışveriş listesi açılıyor...</Text>

      <AlisverisEkrani
        key={alisverisRevizyonu}
        visible={true}
        onClose={() => router.back()}
        stokUrunleri={veriler.urunler}
        onStogaAktar={(urun) => {
          setVeriler((onceki) => ({
            ...onceki,
            urunler: [
              ...onceki.urunler,
              {
                id: yeniId(),
                ...urun,
                eklenmeTarihi: new Date().toISOString(),
              },
            ],
          }));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5FAF5' },
  text: { margin: 24, color: '#667768' },
});
