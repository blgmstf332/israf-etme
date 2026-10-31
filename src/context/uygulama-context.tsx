import Storage from 'expo-sqlite/kv-store';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from 'react';
import { Alert } from 'react-native';

import {
  ESKI_STORAGE_KEY,
  STORAGE_KEY,
  kayitlariDuzenle,
  verileriDuzenle,
  type UygulamaVerisi,
} from '@/utils/urun-veri-modeli';

type UygulamaContextDegeri = {
  veriler: UygulamaVerisi;
  setVeriler: Dispatch<SetStateAction<UygulamaVerisi>>;
  yuklendi: boolean;
  yuklemeHatasi: boolean;
  kayitSirasi: { current: Promise<void> };
};

const UygulamaContext =
  createContext<UygulamaContextDegeri | null>(null);

export function UygulamaProvider({
  children,
}: PropsWithChildren) {
  const [veriler, setVeriler] =
    useState<UygulamaVerisi>({
      urunler: [],
      gecmis: [],
    });

  const [yuklendi, setYuklendi] = useState(false);
  const [yuklemeHatasi, setYuklemeHatasi] =
    useState(false);

  const kayitSirasi =
    useRef<Promise<void>>(Promise.resolve());

  // Mevcut SQLite anahtarından stok ve geçmiş kayıtlarını oku.
  // Önceki sürümden gelen kayıtlar için geçiş desteğini koru.
  useEffect(() => {
    let aktif = true;

    async function verileriYukle() {
      try {
        const yeniKayit =
          await Storage.getItem(STORAGE_KEY);

        if (!aktif) return;

        if (yeniKayit !== null) {
          const veri: unknown = JSON.parse(yeniKayit);
          setVeriler(verileriDuzenle(veri));
        } else {
          const eskiKayit =
            await Storage.getItem(ESKI_STORAGE_KEY);

          if (!aktif) return;

          const eskiUrunler =
            eskiKayit !== null
              ? kayitlariDuzenle(JSON.parse(eskiKayit))
              : [];

          setVeriler({
            urunler: eskiUrunler,
            gecmis: [],
          });
        }

        setYuklendi(true);
      } catch (hata) {
        if (!aktif) return;

        console.error('Veriler yüklenemedi:', hata);
        setYuklemeHatasi(true);

        Alert.alert(
          'Veri hatası',
          'Kayıtlı veriler okunamadı. Uygulamayı yeniden başlat.'
        );
      }
    }

    void verileriYukle();

    return () => {
      aktif = false;
    };
  }, []);

  // Mevcut uygulamadaki yazma kuyruğunu koru.
  useEffect(() => {
    if (!yuklendi) return;

    const kaydedilecekVeri = JSON.stringify(veriler);

    kayitSirasi.current = kayitSirasi.current
      .catch(() => {})
      .then(() =>
        Storage.setItem(STORAGE_KEY, kaydedilecekVeri)
      );

    kayitSirasi.current.catch((hata) => {
      console.error('Veriler kaydedilemedi:', hata);

      Alert.alert(
        'Hata',
        'Değişiklikler kaydedilemedi.'
      );
    });
  }, [veriler, yuklendi]);

  return (
    <UygulamaContext.Provider
      value={{
        veriler,
        setVeriler,
        yuklendi,
        yuklemeHatasi,
        kayitSirasi,
      }}
    >
      {children}
    </UygulamaContext.Provider>
  );
}

export function useUygulama() {
  const context = useContext(UygulamaContext);

  if (context === null) {
    throw new Error(
      'useUygulama, UygulamaProvider içerisinde kullanılmalı.'
    );
  }

  return context;
}
