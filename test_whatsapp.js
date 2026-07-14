async function testWhatsApp() {
  const url = "https://evolution-evolution-api.5rqumh.easypanel.host/message/sendMedia/CrisTech";
  const apiKey = "3E977D89D253-4FC5-A1E5-E270C2FDC4D3";
  
  const payload = {
    number: "5511999999999", // Test number, might fail if invalid but checking API response
    mediatype: "image",
    mimetype: "image/png",
    media: "https://cdn.renderform.io/req-73f1-0af3e-166ff0e7f02bd.jpg", // The image generated in the previous step
    fileName: "OrdemDeServico.png",
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("WhatsApp Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("WhatsApp Error:", error);
  }
}

testWhatsApp();
