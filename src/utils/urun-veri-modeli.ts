// Eski kayıtlar ve yeni kayıtlar için ayrı anahtarlar
export const ESKI_STORAGE_KEY = 'israfetme_urunler_v1';
export const STORAGE_KEY = 'israfetme_veriler_v2';
export const KATEGORILER = [
  'Süt Ürünleri',
  'Sebze & Meyve',
  'Et & Balık',
  'Bakliyat & Tahıl',
  'İçecek',
  'Diğer',
] as const;
export const BIRIMLER = ['Adet', 'kg', 'g', 'L', 'mL'] as const;
export type Kategori = (typeof KATEGORILER)[number];
export type Birim = (typeof BIRIMLER)[number];
export type Urun = {
  id: string;
  ad: string;
  sonTarih: string;
  kategori: Kategori;
  miktar: number;
  birim: Birim;
  eklenmeTarihi?: string;
};
// YENİ: Bir ürünün nasıl değerlendirildiğini tutar.
export type IslemTuru = 'tuketildi' | 'israf';
// YENİ: İşlem geçmişindeki kayıt
export type GecmisKaydi = Urun & {
  kayitId: string;
  islem: IslemTuru;
  islemTarihi: string;
};
// YENİ: Uygulamanın kalıcı verileri
export type UygulamaVerisi = {
  urunler: Urun[];
  gecmis: GecmisKaydi[];
};
export type DurumTuru =
  | 'gecmis'
  | 'yaklasan'
  | 'normal'
  | 'gecersiz';
export const DURUM_RENKLERI = {
  gecmis: {
    arkaPlan: '#FFF0EF',
    kenar: '#F5C4C0',
    metin: '#B42318',
    etiket: '#FDE0DD',
  },
  yaklasan: {
    arkaPlan: '#FFF5E6',
    kenar: '#F4D1A2',
    metin: '#A56112',
    etiket: '#FFE5BC',
  },
  normal: {
    arkaPlan: '#EDF8EE',
    kenar: '#B9DEC3',
    metin: '#247A43',
    etiket: '#D7EFDC',
  },
  gecersiz: {
    arkaPlan: '#F2F2F2',
    kenar: '#CCCCCC',
    metin: '#666666',
    etiket: '#E5E5E5',
  },
};
// Benzersiz kayıt kimliği oluşturur.
export function yeniId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
// Girilen tarihi YYYY-AA-GG biçimine çevirir.
export function tarihiDuzenle(giris: string): string | null {
  const parcalar = giris.trim().split(/\D+/);
  if (parcalar.length !== 3) return null;
  let gunMetni: string;
  let ayMetni: string;
  let yilMetni: string;
  if (parcalar[0].length === 4) {
    [yilMetni, ayMetni, gunMetni] = parcalar;
  } else {
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
export function tarihiGoster(tarih: string): string {
  return tarih.split('-').reverse().join('.');
}
// Son tüketim tarihine kalan gün sayısı
export function kalanGun(tarih: string): number | null {
  const eslesme = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tarih);
  if (!eslesme) return null;
  const yil = Number(eslesme[1]);
  const ay = Number(eslesme[2]);
  const gun = Number(eslesme[3]);
  const hedef = new Date(Date.UTC(yil, ay - 1, gun));
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
// Tarih durumunu belirler.
export function durumBilgisi(tarih: string): {
  metin: string;
  tur: DurumTuru;
  etiket: string;
} {
  const gun = kalanGun(tarih);
  if (gun === null) {
    return {
      metin: 'Geçersiz tarih',
      tur: 'gecersiz',
      etiket: 'Kontrol gerekli',
    };
  }
  if (gun < 0) {
    return {
      metin: `Son tüketim tarihi ${Math.abs(gun)} gün önce geçti`,
      tur: 'gecmis',
      etiket: 'Tarihi geçmiş',
    };
  }
  if (gun === 0) {
    return {
      metin: 'Bugün son gün!',
      tur: 'yaklasan',
      etiket: 'Bugün son gün',
    };
  }
  if (gun <= 3) {
    return {
      metin: `${gun} gün kaldı`,
      tur: 'yaklasan',
      etiket: 'Yaklaşıyor',
    };
  }
  return {
    metin: `${gun} gün kaldı`,
    tur: 'normal',
    etiket: 'Süresi var',
  };
}
// Kullanıcının girdiği miktarı doğrular.
export function miktariDuzenle(giris: string): number | null {
  const metin = giris.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(metin)) {
    return null;
  }
  const sayi = Number(metin);
  if (!Number.isFinite(sayi) || sayi <= 0) {
    return null;
  }
  return sayi;
}
export function miktariGoster(miktar: number): string {
  return String(miktar).replace('.', ',');
}
// İşlem tarihini Türkçe gösterir.
export function islemTarihiniGoster(tarih: string): string {
  const tarihNesnesi = new Date(tarih);
  if (Number.isNaN(tarihNesnesi.getTime())) {
    return 'Bilinmiyor';
  }
  return tarihNesnesi.toLocaleDateString('tr-TR');
}
// Eski ve yeni ürünleri ortak veri tipine dönüştürür.
export function kayitlariDuzenle(veri: unknown): Urun[] {
  if (!Array.isArray(veri)) {
    throw new Error('Ürün listesi geçersiz.');
  }
  return veri.map((kayit: unknown) => {
    if (typeof kayit !== 'object' || kayit === null) {
      throw new Error('Ürün kaydı geçersiz.');
    }
    const urun = kayit as Record<string, unknown>;
    if (
      typeof urun.id !== 'string' ||
      typeof urun.ad !== 'string' ||
      typeof urun.sonTarih !== 'string'
    ) {
      throw new Error('Eksik ürün bilgisi.');
    }
    const kategori =
      KATEGORILER.find((item) => item === urun.kategori)
      ?? 'Diğer';
    const birim =
      BIRIMLER.find((item) => item === urun.birim)
      ?? 'Adet';
    const miktar =
      typeof urun.miktar === 'number' &&
      Number.isFinite(urun.miktar) &&
      urun.miktar > 0
        ? urun.miktar
        : 1;
    return {
      id: urun.id,
      ad: urun.ad,
      sonTarih: urun.sonTarih,
      kategori,
      miktar,
      birim,
      eklenmeTarihi:
        typeof urun.eklenmeTarihi === 'string' &&
        Number.isFinite(Date.parse(urun.eklenmeTarihi))
          ? urun.eklenmeTarihi
          : undefined,
    };
  });
}
// YENİ: İşlem geçmişindeki kayıtları doğrular.
export function gecmisiDuzenle(veri: unknown): GecmisKaydi[] {
  if (!Array.isArray(veri)) {
    throw new Error('İşlem geçmişi geçersiz.');
  }
  return veri.map((kayit: unknown) => {
    if (typeof kayit !== 'object' || kayit === null) {
      throw new Error('Geçmiş kaydı geçersiz.');
    }
    const nesne = kayit as Record<string, unknown>;
    const urun = kayitlariDuzenle([kayit])[0];
    if (
      typeof nesne.kayitId !== 'string' ||
      typeof nesne.islemTarihi !== 'string' ||
      (nesne.islem !== 'tuketildi' &&
        nesne.islem !== 'israf')
    ) {
      throw new Error('İşlem geçmişi bilgisi eksik.');
    }
    return {
      ...urun,
      kayitId: nesne.kayitId,
      islem: nesne.islem,
      islemTarihi: nesne.islemTarihi,
    };
  });
}
// YENİ: Kaydedilen uygulama verisini doğrular.
export function verileriDuzenle(veri: unknown): UygulamaVerisi {
  if (
    typeof veri !== 'object' ||
    veri === null ||
    Array.isArray(veri)
  ) {
    throw new Error('Uygulama verisi geçersiz.');
  }
  const kayit = veri as Record<string, unknown>;
  return {
    urunler: kayitlariDuzenle(kayit.urunler),
    gecmis: gecmisiDuzenle(kayit.gecmis),
  };
}
