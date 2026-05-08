const axios = require('axios');
const fs = require('fs');

const QUIZLET_URL = 'https://quizlet.com/de/935540215/almanca-flash-cards/';

async function fetchWords() {
  try {
    console.log('Kelime listesi çekiliyor...');
    const response = await axios.get(QUIZLET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'de,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      timeout: 30000
    });
    
    const html = response.data;
    
    // Sayfadaki script tag'lerinden dataSet'i bul
    const jsonMatch = html.match(/window\.__NEXT_DATA__\s*=\s*({.*?});/s);
    let kelimeler = [];
    
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        // Quizlet'in sayfa yapısına göre kelimeleri bul
        if (data.props && data.props.pageProps && data.props.pageProps.initialSet) {
          const terms = data.props.pageProps.initialSet.terms;
          kelimeler = terms.map((term, index) => ({
            id: index + 1,
            almanca: term.term,
            turkce: term.definition
          }));
        }
      } catch(e) {
        console.log('JSON parse hatası:', e.message);
      }
    }
    
    // Eğer bulamadıysak regex ile dene
    if (kelimeler.length === 0) {
      const termPattern = /\"term\":\"([^\"]+)\"/g;
      const defPattern = /\"definition\":\"([^\"]+)\"/g;
      const terms = [...html.matchAll(termPattern)].map(m => m[1]);
      const defs = [...html.matchAll(defPattern)].map(m => m[1]);
      
      kelimeler = terms.map((term, index) => ({
        id: index + 1,
        almanca: term.replace(/\\/g, ''),
        turkce: defs[index]?.replace(/\\/g, '') || ''
      })).filter(k => k.almanca && k.turkce);
    }
    
    if (kelimeler.length === 0) {
      // Son çare: PDF'ten bildiğimiz kelimeleri elle ekle
      console.log('Otomatik çekme başarısız, manuel listeye geçiliyor...');
      kelimeler = [
        { id: 1, almanca: "fremd", turkce: "yabancı" },
        { id: 2, almanca: "Gerüche", turkce: "koku" },
        { id: 3, almanca: "herkommen", turkce: "buraya gelmek" },
        { id: 4, almanca: "fühlen", turkce: "hissetmek" },
        { id: 5, almanca: "wohl", turkce: "hoş, iyi" }
      ];
    }
    
    // Sonucu kaydet
    const output = {
      son_guncelleme: new Date().toISOString(),
      toplam_kelime: kelimeler.length,
      kaynak: QUIZLET_URL,
      tum_kelimeler: kelimeler
    };
    
    fs.writeFileSync('tum_kelimeler.json', JSON.stringify(output, null, 2));
    console.log(`✅ ${kelimeler.length} kelime başarıyla kaydedildi!`);
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

fetchWords();
