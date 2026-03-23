import https from 'https';

const API_KEY = process.env.VITE_GGCHECKOUT_API_KEY || 'ggck_live_944cd66af0e11b6a6336a43e77f922541cce4f76d5e8683dfda0bac6b0023f05';
const API_URL = 'api.ggcheckout.com'; // Wait, let me just try both without www and with www

const requestOptions = (path, method = 'GET') => ({
  hostname: 'www.ggcheckout.com',
  path: path,
  method: method,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

function doRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch(e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  try {
    console.log("Getting business ID...");
    const me = await doRequest(requestOptions('/api/me'));
    console.log("ME:", me);
    if (!me.businessId) throw new Error("No businessId");

    const slug = `cart-${Date.now()}`;
    console.log("Creating checkout:", slug);
    const checkout = await doRequest(requestOptions('/api/checkouts', 'POST'), {
      title: "Seu Pedido - Gorg Presets",
      id: slug,
      price: 199.90,
      uuidOwnwer: me.businessId,
      paymentMethods: {},
      checkout: {}
    });
    console.log("CHECKOUT:", checkout);
  } catch (err) {
    console.error("ERROR:", err);
  }
}

test();
