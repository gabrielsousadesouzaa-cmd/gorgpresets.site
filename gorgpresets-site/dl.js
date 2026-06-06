import https from 'https';

https.get('https://unpkg.com/ggcheckout-mcp/dist/api/client.js', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log("--- CLIENT.JS ---");
    console.log(data);
  });
});

https.get('https://unpkg.com/ggcheckout-mcp/dist/tools/checkouts.js', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log("--- CHECKOUTS.JS ---");
    console.log(data);
  });
});
