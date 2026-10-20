
import * as Notifications from 'expo-notifications';
import Storage from 'expo-sqlite/kv-store';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const TERCIH_KEY = 'israfetme_bildirim_aktif_v1';
const KANAL_ID = 'israfetme-son-tarih';

// 3 gün önce, 1 gün önce ve son gün
const HATIRLATMA_GUNLERI = [3, 1, 0] as const;

type Urun = {
  id: string;
  ad: string;
  sonTarih: string;
};

type Props = {
  urunler: Urun[];
  yuklendi: boolean;
};

type Plan = {
  anahtar: string;
  urunAdi: string;
  kacGunOnce: number;
  tarih: Date;
};

// Uygulama açıkken de bildirim gösterilsin.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Android'de bildirim kanalı oluşturur.
async function kanalHazirla() {
 return;
}

// YYYY-MM-DD tarihini doğrular ve yerel saatte 09.00'a ayarlar.
function sonGunTarihi(metin: string): Date | null {
  const eslesme = /^(\d{4})-(\d{2})-(\d{2})$/.exec(metin);

  if (!eslesme) return null;

  const yil = Number(eslesme[1]);
  const ay = Number(eslesme[2]);
  const gun = Number(eslesme[3]);

  const tarih = new Date(yil, ay - 1, gun, 9, 0, 0, 0);

  if (
    tarih.getFullYear() !== yil ||
    tarih.getMonth() !== ay - 1 ||
    tarih.getDate() !== gun
  ) {
    return null;
  }

  return tarih;
}

// Ürünlerden gelecekteki hatırlatma planlarını hazırlar.
function planlariOlustur(urunler: Urun[]): Map<string, Plan> {
  const sonuc = new Map<string, Plan>();
  const simdi = Date.now();

  for (const urun of urunler) {
    const sonGun = sonGunTarihi(urun.sonTarih);

    if (sonGun === null) continue;

    for (const kacGunOnce of HATIRLATMA_GUNLERI) {
      const bildirimTarihi = new Date(sonGun);

      // Takvim günü çıkarılır; yaz/kış saati farkına duyarlıdır.
      bildirimTarihi.setDate(
        bildirimTarihi.getDate() - kacGunOnce
      );

      // Geçmiş saatlere bildirim oluşturmayız.
      if (bildirimTarihi.getTime() <= simdi) continue;

      // Ürün adı, tarih veya saat değişirse anahtar da değişir.
      const anahtar = [
        urun.id,
        urun.ad,
        urun.sonTarih,
        kacGunOnce,
        bildirimTarihi.getTime(),
      ].join('|');

      sonuc.set(anahtar, {
        anahtar,
        urunAdi: urun.ad,
        kacGunOnce,
        tarih: bildirimTarihi,
      });
    }
  }

  return sonuc;
}

// Sadece İsrafEtme ürün hatırlatmalarını günceller.
async function planlariEsitle(
  urunler: Urun[],
  etkin: boolean
): Promise<number> {
  const hedefler = etkin
    ? planlariOlustur(urunler)
    : new Map<string, Plan>();

  const tumBildirimler =
    await Notifications.getAllScheduledNotificationsAsync();

  const mevcutAnahtarlar = new Set<string>();

  // Silinen, tüketilen veya tarihi değişen ürünleri temizle.
  for (const bildirim of tumBildirimler) {
    const veri = bildirim.content.data;

    if (veri?.israfEtmeTur !== 'sonTarih') continue;

    const anahtar =
      typeof veri.anahtar === 'string' ? veri.anahtar : '';

    if (
      !hedefler.has(anahtar) ||
      mevcutAnahtarlar.has(anahtar)
    ) {
      await Notifications.cancelScheduledNotificationAsync(
        bildirim.identifier
      );
    } else {
      mevcutAnahtarlar.add(anahtar);
    }
  }

  // Yeni veya eksik hatırlatmaları oluştur.
  for (const plan of hedefler.values()) {
    if (mevcutAnahtarlar.has(plan.anahtar)) continue;

    let baslik = '🌿 Son tüketim tarihi yaklaşıyor';
    let mesaj = '';

    if (plan.kacGunOnce === 0) {
      baslik = '⚠️ Bugün son gün!';
      mesaj =
        `${plan.urunAdi} ürününün son tüketim tarihi bugün.`;
    } else {
      mesaj =
        `${plan.urunAdi} için ${plan.kacGunOnce} gün kaldı. ` +
        'İsraf etmeden değerlendir!';
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: baslik,
        body: mesaj,
        sound: 'default',
        data: {
          israfEtmeTur: 'sonTarih',
          anahtar: plan.anahtar,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: plan.tarih,
      },
    });
  }

  return hedefler.size;
}

export function BildirimYoneticisi({
  urunler,
  yuklendi,
}: Props) {
  const [hazir, setHazir] = useState(false);
  const [etkin, setEtkin] = useState(false);
  const [mesgul, setMesgul] = useState(false);
  const [planSayisi, setPlanSayisi] = useState<number | null>(
    null
  );
  const [hata, setHata] = useState('');

  // Ürün değişiklikleri sırasında işleri sırayla çalıştır.
  const islemSirasi = useRef<Promise<void>>(Promise.resolve());

  // Daha önce kullanıcının verdiği tercihi hatırla.
  useEffect(() => {
    let aktif = true;

    async function tercihiOku() {
      try {
        const kayit = await Storage.getItem(TERCIH_KEY);

        if (!aktif) return;

        setEtkin(kayit === '1');
        setHazir(true);
      } catch (error) {
        console.error('Bildirim tercihi okunamadı:', error);

        if (aktif) {
          setHata('Bildirim ayarı okunamadı.');
        }
      }
    }

    tercihiOku();

    return () => {
      aktif = false;
    };
  }, []);

  // Stok ekleme, düzenleme, silme ve tüketim sonrası
  // planlanmış bildirimleri otomatik eşitle.
  useEffect(() => {
    if (!hazir || !yuklendi) return;

    islemSirasi.current = islemSirasi.current
      .catch(() => {})
      .then(async () => {
        await kanalHazirla();

        if (etkin) {
          const izin = await Notifications.getPermissionsAsync();

          if (!izin.granted) {
            setPlanSayisi(null);
            setHata(
              'Telefonun bildirim izni kapalı. ' +
              'Android ayarlarından izin vermelisin.'
            );
            return;
          }
        }

        const sayi = await planlariEsitle(urunler, etkin);

        setPlanSayisi(sayi);
        setHata('');
      });

    islemSirasi.current.catch((error) => {
      console.error('Bildirimler planlanamadı:', error);
      setHata('Hatırlatmalar güncellenirken hata oluştu.');
    });
  }, [hazir, yuklendi, urunler, etkin]);

  // Bildirim iznini kullanıcı isterse talep et.
  const bildirimleriAc = async () => {
    if (!hazir || !yuklendi || mesgul) return;

    setMesgul(true);

    try {
      await kanalHazirla();

      let izin = await Notifications.getPermissionsAsync();

      if (!izin.granted) {
        izin = await Notifications.requestPermissionsAsync();
      }

      if (!izin.granted) {
        Alert.alert(
          'Bildirim izni gerekli',
          'Hatırlatmalar için Android bildirim iznini açmalısın.'
        );
        return;
      }

      await Storage.setItem(TERCIH_KEY, '1');

      setEtkin(true);
      setHata('');
    } catch (error) {
      console.error('Bildirimler açılamadı:', error);
      Alert.alert('Hata', 'Bildirimler etkinleştirilemedi.');
    } finally {
      setMesgul(false);
    }
  };

  // Yalnızca uygulamamızın ürün hatırlatmalarını kapat.
  const bildirimleriKapat = async () => {
    if (mesgul) return;

    setMesgul(true);

    try {
      await Storage.setItem(TERCIH_KEY, '0');
      setEtkin(false);
      setHata('');

      // Kullanıcının kapanma isteğini hemen uygula.
      await islemSirasi.current.catch(() => {});
      await planlariEsitle([], false);

      setPlanSayisi(0);
    } catch (error) {
      console.error('Bildirimler kapatılamadı:', error);
      Alert.alert('Hata', 'Bildirimler kapatılamadı.');
    } finally {
      setMesgul(false);
    }
  };

  // 5 saniye sonra test bildirimi gönder.
  const testBildirimi = async () => {
    if (!etkin || mesgul) return;

    setMesgul(true);

    try {
      const izin = await Notifications.getPermissionsAsync();

      if (!izin.granted) {
        Alert.alert(
          'Bildirim izni yok',
          'Android ayarlarından bildirim iznini aç.'
        );
        return;
      }

      await kanalHazirla();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌿 İsrafEtme Test Bildirimi',
          body: 'Harika! Bildirim sistemimiz çalışıyor.',
          sound: 'default',
          data: { israfEtmeTur: 'test' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
        },
      });

      Alert.alert(
        'Test planlandı',
        '5 saniye içinde bir bildirim gelmesi gerekiyor.'
      );
    } catch (error) {
      console.error('Test bildirimi hatası:', error);
      Alert.alert('Hata', 'Test bildirimi oluşturulamadı.');
    } finally {
      setMesgul(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        🔔 Son Tüketim Hatırlatmaları
      </Text>

      <Text style={styles.description}>
        Ürünlerin için 3 gün önce, 1 gün önce ve son tüketim
        gününde saat 09.00 civarında hatırlatma al.
      </Text>

      <Text
        style={[
          styles.status,
          { color: etkin ? '#247A43' : '#777777' },
        ]}
      >
        {etkin ? '● Hatırlatmalar açık' : '● Hatırlatmalar kapalı'}
      </Text>

      {etkin && planSayisi !== null && (
        <Text style={styles.detail}>
          Planlanmış hatırlatma: {planSayisi}
        </Text>
      )}

      {hata !== '' && (
        <Text style={styles.error}>{hata}</Text>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.button,
            etkin ? styles.offButton : styles.onButton,
            (!hazir || !yuklendi || mesgul) &&
              styles.disabledButton,
          ]}
          onPress={
            etkin ? bildirimleriKapat : bildirimleriAc
          }
          disabled={!hazir || !yuklendi || mesgul}
        >
          <Text
            style={[
              styles.buttonText,
              etkin ? styles.offText : styles.onText,
            ]}
          >
            {etkin ? 'Bildirimleri Kapat' : 'Bildirimleri Aç'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.testButton,
            (!etkin || mesgul) && styles.disabledButton,
          ]}
          onPress={testBildirimi}
          disabled={!etkin || mesgul}
        >
          <Text style={styles.testText}>
            5 sn Test
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CFE1D2',
    padding: 16,
    gap: 11,
    marginTop: 12,
  },
  title: {
    color: '#247A43',
    fontSize: 17,
    fontWeight: 'bold',
  },
  description: {
    color: '#666666',
    fontSize: 13,
    lineHeight: 20,
  },
  status: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  detail: {
    color: '#444444',
    fontSize: 13,
  },
  error: {
    color: '#B42318',
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 3,
  },
  button: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 7,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onButton: {
    backgroundColor: '#247A43',
  },
  offButton: {
    backgroundColor: '#FCE5E3',
  },
  testButton: {
    backgroundColor: '#E3F0FF',
    flex: 0.65,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
  },
  onText: {
    color: '#FFFFFF',
  },
  offText: {
    color: '#B42318',
  },
  testText: {
    color: '#1565C0',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
