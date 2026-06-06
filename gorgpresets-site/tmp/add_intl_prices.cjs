const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, '..', 'src', 'pages', 'Admin.tsx');
let admin = fs.readFileSync(adminPath, 'utf8');

// Exact marker from debug output
const marker1e = '                            </div>\r\n                         </div>\r\n\r\n                         {/* Regional Copy */}';

if (!admin.includes(marker1e)) {
  console.error('Marker still not found');
  // Try finding it with LF
  const lf = marker1e.replace(/\r\n/g, '\n');
  console.log('LF version found:', admin.includes(lf));
  process.exit(1);
}

const intlBlock = `                            </div>
                         </div>

                          {/* Preços Internacionais */}
                          <div className="bg-gradient-to-br from-blue-50/30 to-white rounded-[2rem] border border-black/[0.04] p-6 space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center shrink-0">
                                <Globe size={14} className="text-white" />
                              </div>
                              <div>
                                <h5 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-950">Preços Internacionais</h5>
                                <p className="text-[9px] text-gray-300 font-medium mt-0.5">Opcional — sobrepõe a conversão automática por taxa de câmbio</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">🇺🇸 Preço USD ($)</label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300">$</span>
                                  <input name="priceUSD" value={formData.priceUSD} onChange={handleInputChange} placeholder="9.99" className="w-full h-12 bg-white border border-black/[0.04] focus:border-[#d82828] rounded-xl pl-8 pr-4 outline-none font-black text-sm tracking-widest shadow-sm transition-all" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">🇪🇺 Preço EUR (€)</label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300">€</span>
                                  <input name="priceEUR" value={formData.priceEUR} onChange={handleInputChange} placeholder="8.99" className="w-full h-12 bg-white border border-black/[0.04] focus:border-[#d82828] rounded-xl pl-8 pr-4 outline-none font-black text-sm tracking-widest shadow-sm transition-all" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">🇺🇸 Original USD</label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300">$</span>
                                  <input name="originalPriceUSD" value={formData.originalPriceUSD} onChange={handleInputChange} placeholder="14.99" className="w-full h-12 bg-white border border-black/[0.04] focus:border-[#d82828] rounded-xl pl-8 pr-4 outline-none font-black text-sm tracking-widest shadow-sm transition-all" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">🇪🇺 Original EUR</label>
                                <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300">€</span>
                                  <input name="originalPriceEUR" value={formData.originalPriceEUR} onChange={handleInputChange} placeholder="13.99" className="w-full h-12 bg-white border border-black/[0.04] focus:border-[#d82828] rounded-xl pl-8 pr-4 outline-none font-black text-sm tracking-widest shadow-sm transition-all" />
                                </div>
                              </div>
                            </div>
                          </div>

                         {/* Regional Copy */}`;

admin = admin.replace(marker1e, intlBlock);
console.log('Intl block inserted:', admin.includes('Preços Internacionais') ? 'OK' : 'FAIL');

fs.writeFileSync(adminPath, admin, 'utf8');
console.log('Admin.tsx saved');

// ── 2. useProducts.ts ─────────────────────────────────────────────────────────
const productsPath = path.join(__dirname, '..', 'src', 'hooks', 'useProducts.ts');
let products = fs.readFileSync(productsPath, 'utf8');

if (!products.includes('priceUSD')) {
  products = products.replace(
    "    salesCount: parseInt(String(p.sales_count)) || 0,\n  };",
    "    salesCount: parseInt(String(p.sales_count)) || 0,\n    priceUSD: p.price_usd ? parseFloat(String(p.price_usd)) : null,\n    priceEUR: p.price_eur ? parseFloat(String(p.price_eur)) : null,\n    originalPriceUSD: p.original_price_usd ? parseFloat(String(p.original_price_usd)) : null,\n    originalPriceEUR: p.original_price_eur ? parseFloat(String(p.original_price_eur)) : null,\n  };"
  );
  console.log('useProducts.ts updated:', products.includes('priceUSD') ? 'OK' : 'FAIL');
} else {
  console.log('useProducts.ts already has priceUSD, skipping');
}
fs.writeFileSync(productsPath, products, 'utf8');

// ── 3. currencyStore.tsx ──────────────────────────────────────────────────────
const currencyPath = path.join(__dirname, '..', 'src', 'store', 'currencyStore.tsx');
let currencyStore = fs.readFileSync(currencyPath, 'utf8');

if (!currencyStore.includes('manualPrices')) {
  currencyStore = currencyStore.replace(
    '  formatCurrency: (valueInBrl: number) => string;',
    '  formatCurrency: (valueInBrl: number, manualPrices?: { priceUSD?: number | null; priceEUR?: number | null }) => string;'
  );

  currencyStore = currencyStore.replace(
    `  const formatCurrency = (valueInBrl: number) => {
    const converted = valueInBrl * (exchangeRates[currency] || 1);
    let locale = "pt-BR";
    if (currency === "USD") locale = "en-US";
    if (currency === "EUR") locale = "pt-PT";

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
    }).format(converted);
  };`,
    `  const formatCurrency = (valueInBrl: number, manualPrices?: { priceUSD?: number | null; priceEUR?: number | null }) => {
    let converted = valueInBrl * (exchangeRates[currency] || 1);
    if (currency === "USD" && manualPrices?.priceUSD) converted = manualPrices.priceUSD;
    if (currency === "EUR" && manualPrices?.priceEUR) converted = manualPrices.priceEUR;
    let locale = "pt-BR";
    if (currency === "USD") locale = "en-US";
    if (currency === "EUR") locale = "pt-PT";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
    }).format(converted);
  };`
  );
  console.log('currencyStore.tsx updated:', currencyStore.includes('manualPrices') ? 'OK' : 'FAIL');
} else {
  console.log('currencyStore.tsx already updated, skipping');
}
fs.writeFileSync(currencyPath, currencyStore, 'utf8');

console.log('\nSUCCESS: All files updated!');
