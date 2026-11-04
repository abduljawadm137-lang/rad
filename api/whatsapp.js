const SHOP = {
  name: "صيدلية النور",
  hours: "من 9 الصبح لـ 11 بالليل",
  address: "شارع التحرير، الدقي",
  menu: [
    { n: "فيتامين سي", p: 85 },
    { n: "كمامات (علبة)", p: 40 },
    { n: "مسكن للصداع", p: 30 },
    { n: "كريم مرطب", p: 120 },
  ],
};

const SYSTEM = `إنت مساعد واتساب لـ "${SHOP.name}". رد بالعربي المصري، بجمل قصيرة ومهذبة.
مواعيد الشغل: ${SHOP.hours}. العنوان: ${SHOP.address}.
المنتجات والأسعار (بالجنيه):
${SHOP.menu.map((m) => `- ${m.n}: ${m.p}`).join("\n")}
قواعد:
- جاوب بس من المعلومات اللي فوق. لو مش متأكد قول "هسأل صاحب المحل وأرد عليك".
- لو العميل عايز يطلب، اسأله عن الكمية والعنوان، وأكد الإجمالي.
- ماتديش نصايح طبية أو جرعات أدوية، وحوّل العميل للصيدلي.`;

async function askClaude(text) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-5-5",
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content: text }],
    }),
  });
  const data = await r.json();
  return data.content?.[0]?.text || "ثواني وهرد عليك.";
}

async function sendWhatsApp(to, body) {
  await fetch(
    `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        text: { body },
      }),
    }
  );
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": ch } = req.query;
    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      return res.status(200).send(ch);
    }
    return res.status(403).end();
  }

  try {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (msg?.type === "text") {
      const reply = await askClaude(msg.text.body);
      await sendWhatsApp(msg.from, reply);
    }
  } catch (e) {
    console.error(e);
  }
  res.status(200).end();
        }
