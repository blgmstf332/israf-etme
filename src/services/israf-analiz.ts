/**
 * İsrafEtme 29A: yerel ve açıklanabilir, kural tabanlı analiz motoru.
 * Bu modül EĞİTİLMİŞ bir ML modeli veya kalibre edilmiş olasılık sunmaz.
 * Bu sürüm yalnızca mevcut stok ve kayıtlı tüketim/israf geçmişini okur.
 */
import type { GecmisKaydi, Urun } from '@/utils/urun-veri-modeli';

export type TemelBirim = 'Adet' | 'g' | 'mL';
export type RiskSeviyesi = 'kritik' | 'yuksek' | 'orta' | 'dusuk' | 'belirsiz';

export type UrunAnalizi = {
  anahtar: string;
  ad: string;
  birim: TemelBirim;
  stokMiktari: number;
  stokKayitSayisi: number;
  enYakinSonGun: number | null;
  seviye: RiskSeviyesi;
  gerekceler: string[];
  tuketilen30Gun: number;
  israf30Gun: number;
  gecmisIslemSayisi: number;
  tuketimIslemSayisi: number;
  israfOrani: number | null;
  haftalikTuketim: number | null;
  alisverisOnerisi: number | null;
  alisverisAciklamasi: string;
};

type BirimOzet = {
  anahtar: string;
  ad: string;
  birim: TemelBirim;
  stokMiktari: number;
  stokKayitSayisi: number;
  enYakinSonGun: number | null;
  tuketilen30Gun: number;
  israf30Gun: number;
  gecmisIslemSayisi: number;
  tuketimIslemSayisi: number;
  enEskiTuketimZamani: number | null;
};

const GUN_MS = 24 * 60 * 60 * 1000;

export function urunAdiAnahtari(ad: string): string {
  // Kasıtlı olarak marka adlarını veya ürün türlerini tahmin ederek birleştirmiyoruz.
  return ad.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
}

export function birimDonustur(birim: Urun['birim'], miktar: number): { birim: TemelBirim; miktar: number } {
  if (birim === 'kg') return { birim: 'g', miktar: miktar * 1000 };
  if (birim === 'L') return { birim: 'mL', miktar: miktar * 1000 };
  return { birim, miktar };
}

function sonTariheKalanGun(tarih: string, simdi: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tarih);
  if (!m) return null;
  const y = Number(m[1]);
  const ay = Number(m[2]);
  const gun = Number(m[3]);
  const hedef = new Date(Date.UTC(y, ay - 1, gun));
  if (hedef.getUTCFullYear() !== y || hedef.getUTCMonth() !== ay - 1 || hedef.getUTCDate() !== gun) {
    return null;
  }
  const bugun = Date.UTC(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());
  return Math.round((hedef.getTime() - bugun) / GUN_MS);
}

function uygunMiktar(miktar: number): boolean {
  return Number.isFinite(miktar) && miktar > 0;
}

/**
 * 30 günlük kayıt penceresi. 7 günlük miktar ancak >=3 tüketim işlemi
 * ve >=14 güne yayılan gözlem varsa hesaplanır. Gerçek satın alma
 * kayıtları bulunmadığından bu bir satış/alışveriş tahmin modeli değildir.
 */
export function israfAnalizleriniHesapla(
  urunler: Urun[],
  gecmis: GecmisKaydi[],
  simdi: Date = new Date()
): UrunAnalizi[] {
  const gruplar = new Map<string, BirimOzet>();
  const simdiZamani = simdi.getTime();
  const altSinir = simdiZamani - 30 * GUN_MS;

  function grupAl(ad: string, birim: TemelBirim): BirimOzet {
    const adAnahtari = urunAdiAnahtari(ad);
    const anahtar = `${adAnahtari}::${birim}`;
    let grup = gruplar.get(anahtar);
    if (!grup) {
      grup = {
        anahtar, ad: ad.trim(), birim, stokMiktari: 0, stokKayitSayisi: 0,
        enYakinSonGun: null, tuketilen30Gun: 0, israf30Gun: 0,
        gecmisIslemSayisi: 0, tuketimIslemSayisi: 0,
        enEskiTuketimZamani: null,
      };
      gruplar.set(anahtar, grup);
    }
    return grup;
  }

  for (const urun of urunler) {
    if (!urun.ad.trim() || !uygunMiktar(urun.miktar)) continue;
    const donusum = birimDonustur(urun.birim, urun.miktar);
    const grup = grupAl(urun.ad, donusum.birim);
    grup.stokMiktari += donusum.miktar;
    grup.stokKayitSayisi += 1;
    const gun = sonTariheKalanGun(urun.sonTarih, simdi);
    if (gun !== null) {
      grup.enYakinSonGun = grup.enYakinSonGun === null ? gun : Math.min(grup.enYakinSonGun, gun);
    }
  }

  for (const kayit of gecmis) {
    const zaman = new Date(kayit.islemTarihi).getTime();
    if (!Number.isFinite(zaman) || zaman < altSinir || zaman > simdiZamani) continue;
    if (!kayit.ad.trim() || !uygunMiktar(kayit.miktar)) continue;
    const donusum = birimDonustur(kayit.birim, kayit.miktar);
    const grup = grupAl(kayit.ad, donusum.birim);
    if (kayit.islem === 'tuketildi') {
      grup.tuketilen30Gun += donusum.miktar;
      grup.tuketimIslemSayisi += 1;
      grup.enEskiTuketimZamani = grup.enEskiTuketimZamani === null
        ? zaman : Math.min(zaman, grup.enEskiTuketimZamani);
    } else if (kayit.islem === 'israf') {
      grup.israf30Gun += donusum.miktar;
    } else {
      continue;
    }
    grup.gecmisIslemSayisi += 1;
  }

  const oncelik: Record<RiskSeviyesi, number> = {
    kritik: 0, yuksek: 1, orta: 2, dusuk: 3, belirsiz: 4,
  };

  return Array.from(gruplar.values()).map((grup): UrunAnalizi => {
    const gerekceler: string[] = [];
    const toplamIslenen = grup.tuketilen30Gun + grup.israf30Gun;
    const israfOrani = toplamIslenen > 0 && grup.gecmisIslemSayisi >= 3
      ? grup.israf30Gun / toplamIslenen : null;
    const gun = grup.enYakinSonGun;
    let seviye: RiskSeviyesi = grup.stokKayitSayisi > 0 ? 'dusuk' : 'belirsiz';

    if (grup.stokKayitSayisi > 0 && gun !== null) {
      if (gun < 0) {
        seviye = 'kritik';
        gerekceler.push('Bir ürünün son tüketim tarihi geçmiş. Tüketmeden önce gıda güvenliğini değerlendir.');
      } else if (gun <= 2) {
        seviye = 'yuksek';
        gerekceler.push(gun === 0 ? 'Bir ürünün son tüketim tarihi bugün.' : `En yakın son tüketim tarihine ${gun} gün kaldı.`);
      } else if (gun <= 7) {
        seviye = 'orta';
        gerekceler.push(`En yakın son tüketim tarihine ${gun} gün kaldı.`);
      } else {
        gerekceler.push(`En yakın son tüketim tarihine ${gun} gün var.`);
      }
    }
    if (israfOrani !== null && grup.israf30Gun > 0) {
      const oran = Math.round(israfOrani * 100);
      gerekceler.push(`Son 30 gündeki kayıtlı işlem miktarının %${oran} kadarı israf olarak işaretlendi.`);
      if (seviye !== 'kritik' && grup.stokKayitSayisi > 0) {
        if (israfOrani >= 0.4) seviye = 'yuksek';
        else if (israfOrani >= 0.2 && seviye === 'dusuk') seviye = 'orta';
      }
    }
    if (gerekceler.length === 0) {
      gerekceler.push(grup.stokKayitSayisi > 0
        ? 'Yakın tarihli israf veya son tarih uyarısı tespit edilmedi.'
        : 'Stokta bulunmuyor; yalnızca geçmiş işlem kayıtları var.');
    }

    let haftalikTuketim: number | null = null;
    let alisverisOnerisi: number | null = null;
    let alisverisAciklamasi = 'Henüz yeterli kayıt yok. En az 14 güne yayılan 3 tüketim işlemi gerekiyor.';
    if (grup.tuketimIslemSayisi >= 3 && grup.enEskiTuketimZamani !== null) {
      const gozlemGunu = Math.min(30, Math.max(1, Math.ceil((simdiZamani - grup.enEskiTuketimZamani) / GUN_MS)));
      if (gozlemGunu >= 14) {
        haftalikTuketim = (grup.tuketilen30Gun / gozlemGunu) * 7;
        if (gun !== null && gun <= 7 && grup.stokKayitSayisi > 0) {
          alisverisAciklamasi = 'Stokta son tarihi 7 gün içinde dolacak ürün var. Önce eldeki ürünleri değerlendir; kesin alışveriş miktarı hesaplanmadı.';
        } else {
          alisverisOnerisi = Math.max(0, haftalikTuketim - grup.stokMiktari);
          alisverisAciklamasi = 'Son 30 gündeki kayıtlı tüketim hızına ve mevcut stok miktarına göre, gelecek 7 gün için yaklaşık ilave ihtiyaç. Gerçek satın alma geçmişi içermez.';
        }
      }
    }
    return {
      anahtar: grup.anahtar, ad: grup.ad, birim: grup.birim,
      stokMiktari: grup.stokMiktari, stokKayitSayisi: grup.stokKayitSayisi,
      enYakinSonGun: gun, seviye, gerekceler,
      tuketilen30Gun: grup.tuketilen30Gun, israf30Gun: grup.israf30Gun,
      gecmisIslemSayisi: grup.gecmisIslemSayisi,
      tuketimIslemSayisi: grup.tuketimIslemSayisi,
      israfOrani, haftalikTuketim, alisverisOnerisi, alisverisAciklamasi,
    };
  }).sort((a, b) => oncelik[a.seviye] - oncelik[b.seviye] || a.ad.localeCompare(b.ad, 'tr'));
}

export function miktariYaz(miktar: number, birim: TemelBirim): string {
  const deger = (sayi: number, hane: number) => Number(sayi.toFixed(hane)).toLocaleString('tr-TR', { maximumFractionDigits: hane });
  if (birim === 'g' && Math.abs(miktar) >= 1000) return `${deger(miktar / 1000, 2)} kg`;
  if (birim === 'mL' && Math.abs(miktar) >= 1000) return `${deger(miktar / 1000, 2)} L`;
  return `${deger(miktar, birim === 'Adet' ? 2 : 0)} ${birim}`;
}
