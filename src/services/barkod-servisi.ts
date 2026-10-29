
type UrunBilgisi = {
  ad: string;
  barkod: string;
};

type ApiUrunu = {
  product_name?: unknown;
  product_name_tr?: unknown;
  brands?: unknown;
};

type ApiYaniti = {
  product?: ApiUrunu | null;
};

export async function barkoddanUrunBul(
  barkod: string
): Promise<UrunBilgisi | null> {
  if (!/^\d{8,14}$/.test(barkod)) {
    throw new Error('Geçersiz barkod numarası.');
  }

  const url =
    'https://world.openfoodfacts.org/api/v3/product/' +
    encodeURIComponent(barkod) +
    '?fields=product_name,product_name_tr,brands&lc=tr';

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'IsrafEtme/1.0 (https://github.com/blgmstf332/israf-etme)',
      },
      signal: controller.signal,
    });

    // Veri tabanında bulunmayan ürün.
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `Ürün sorgulanamadı. HTTP ${response.status}`
      );
    }

    const veri: ApiYaniti = await response.json();
    const urun = veri.product;

    if (!urun) return null;

    // Türkçe ürün adı varsa öncelikli kullan.
    const turkceAd =
      typeof urun.product_name_tr === 'string'
        ? urun.product_name_tr.trim()
        : '';

    const genelAd =
      typeof urun.product_name === 'string'
        ? urun.product_name.trim()
        : '';

    const ad = turkceAd || genelAd;

    if (ad === '') return null;

    const marka =
      typeof urun.brands === 'string'
        ? urun.brands.split(',')[0].trim()
        : '';

    // Marka adı ürün adında yoksa başına ekle.
    const tamAd =
      marka &&
      !ad.toLocaleLowerCase('tr-TR').includes(
        marka.toLocaleLowerCase('tr-TR')
      )
        ? `${marka} ${ad}`
        : ad;

    return {
      ad: tamAd,
      barkod,
    };
  } finally {
    clearTimeout(timeout);
  }
}
