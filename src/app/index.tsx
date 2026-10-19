import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Bir ürünün hangi bilgileri tutacağını tanımlıyoruz.
type Urun = {
  id: string;
  ad: string;
  sonTarih: string;
};

function tarihiDuzenle(giris: string): string | null {
  const parcalar = giris.trim().split(/\D+/);

  if (parcalar.length !== 3) {
    return null;
  }

  let gunMetni: string;
  let ayMetni: string;
  let yilMetni: string;

  // Kullanıcı YYYY.AA.GG biçiminde girdiyse
  if (parcalar[0].length === 4) {
    [yilMetni, ayMetni, gunMetni] = parcalar;
  } else {
    // Kullanıcı GG.AA.YYYY biçiminde girdiyse
    [gunMetni, ayMetni, yilMetni] = parcalar;
  }

  if (
    gunMetni.length < 1 ||
    gunMetni.length > 2 ||
    ayMetni.length < 1 ||
    ayMetni.length > 2 ||
    yilMetni.length !== 4
  ) {
    return null;
  }

  const gun = Number(gunMetni);
  const ay = Number(ayMetni);
  const yil = Number(yilMetni);

  const kontrol = new Date(Date.UTC(yil, ay - 1, gun));

  if (
    yil < 1000 ||
    kontrol.getUTCFullYear() !== yil ||
    kontrol.getUTCMonth() !== ay - 1 ||
    kontrol.getUTCDate() !== gun
  ) {
    return null;
  }

  return `${yil}-${String(ay).padStart(2, '0')}-${String(gun).padStart(2, '0')}`;
}

// Son tüketim tarihine kalan gün sayısını hesaplar.
function kalanGun(tarih: string): number | null {
  const eslesme = /^(\d{4}).(\d{2}).(\d{2})$/.exec(tarih);

  if (!eslesme) return null;

  const yil = Number(eslesme[1]);
  const ay = Number(eslesme[2]);
  const gun = Number(eslesme[3]);

  const hedef = new Date(Date.UTC(yil, ay - 1, gun));

  // 30 Şubat gibi geçersiz tarihleri engeller.
  if (
    hedef.getUTCFullYear() !== yil ||
    hedef.getUTCMonth() !== ay - 1 ||
    hedef.getUTCDate() !== gun
  ) {
    return null;
  }

  const bugun = new Date();
  const bugunUTC = Date.UTC(
    bugun.getFullYear(),
    bugun.getMonth(),
    bugun.getDate()
  );

  return Math.round(
    (hedef.getTime() - bugunUTC) / (24 * 60 * 60 * 1000)
  );
}

// Kullanıcıya gösterilecek tarih durumunu oluşturur.
function durumYazisi(tarih: string): string {
  const gun = kalanGun(tarih);

  if (gun === null) return 'Geçersiz tarih';
  if (gun < 0) return 'Son tüketim tarihi geçti';
  if (gun === 0) return 'Bugün son gün!';

  return `${gun} gün kaldı`;
}

export default function HomeScreen() {
  const [urunAdi, setUrunAdi] = useState('');
  const [tarih, setTarih] = useState('');
  const [urunler, setUrunler] = useState<Urun[]>([]);

  // Yeni ürün ekleme fonksiyonu
 const urunEkle = () => {
  const temizAd = urunAdi.trim();

  // Kullanıcının girdiği tarihi standart biçime dönüştür.
  const duzenliTarih = tarihiDuzenle(tarih);

  // Bilgileri doğrula.
  if (!temizAd || duzenliTarih === null) {
    Alert.alert(
      'Hatalı bilgi',
      'Geçerli bir ürün adı ve tarih giriniz. Örnek: 20.10.2026'
    );
    return;
  }

  // Yeni ürünü oluştur.
  const yeniUrun: Urun = {
    id: Date.now().toString(),
    ad: temizAd,
    sonTarih: duzenliTarih,
  };

  // Yeni ürünü listeye ekle.
  setUrunler((oncekiUrunler) => [
    ...oncekiUrunler,
    yeniUrun,
  ]);

  // Giriş kutularını temizle.
  setUrunAdi('');
  setTarih('');
};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>🌿 İsrafEtme</Text>
        <Text style={styles.subtitle}>
          Gıdalarını takip et, israfı önle!
        </Text>

        <Text style={styles.sectionTitle}>
          Yeni Ürün Ekle
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Ürün adı (Örn: Süt)"
          value={urunAdi}
          onChangeText={setUrunAdi}
        />

        <TextInput
          style={styles.input}
          placeholder="Son tüketim tarihi (GG.AA.YYYY)"
          value={tarih}
          onChangeText={setTarih}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={urunEkle}
        >
          <Text style={styles.buttonText}>
            + Ürün Ekle
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>
          Ürünlerim ({urunler.length})
        </Text>

        {urunler.length === 0 ? (
          <Text style={styles.emptyText}>
            Henüz ürün eklemedin.
          </Text>
        ) : (
          urunler.map((urun) => (
            <View key={urun.id} style={styles.card}>
              <Text style={styles.productName}>
                {urun.ad}
              </Text>
              <Text style={styles.date}>
                 Son tüketim: {urun.sonTarih.split('-').reverse().join('.')}
              </Text>
              <Text style={styles.warning}>
                {durumYazisi(urun.sonTarih)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FAF5',
  },
  content: {
    padding: 20,
    gap: 15,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#247A43',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 15,
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    fontSize: 16,
    color: '#222222',
  },
  button: {
    backgroundColor: '#247A43',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3EBE4',
    gap: 6,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222222',
  },
  date: {
    fontSize: 14,
    color: '#666666',
  },
  warning: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#E67E22',
  },
  emptyText: {
    color: '#777777',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 15,
  },
});