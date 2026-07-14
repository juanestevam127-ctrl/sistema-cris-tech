async function testRenderform() {
  const apiKey = 'key-zEze7Eo2dJ3RBLiRtni2z2ANGM5GlHTqW6';
  const templateId = 'eager-sheep-bake-madly-1383';
  
  const renderData = {
      "data.text": "13/03/2026",
      "cliente.text": "TIAGO TESTE",
      "cpf_cnpj.text": "123.456.789-00",
      "endereco.text": "Rua Teste, 123",
      "cidade.text": "Cidade Teste",
      "estado.text": "SP",
      "email.text": "teste@teste.com",
      "telefone.text": "(11) 99999-9999",
      "tipo1.text": "Serviço Teste",
      "qntd1.text": "1",
      "valor1.text": "R$ 100,00",
      "numero_ordem_servico.text": "9999",
      "valor_total.text": "R$ 100,00",
  };

  try {
    const response = await fetch("https://get.renderform.io/api/v2/render", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template: templateId,
        data: renderData,
      }),
    });

    const result = await response.json();
    console.log("Renderform Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Renderform Error:", error);
  }
}

testRenderform();
