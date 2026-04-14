require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 🔹 Puerto dinámico (IMPORTANTE para EasyPanel)
const PORT = process.env.PORT || 3001;

// 🔹 Ruta de prueba
app.get("/", (req, res) => {
  res.send("✅ Bot activo");
});

// 🔹 Logger global (para debug)
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// 🔹 Webhook Chatwoot
app.post("/webhook/chatwoot", async (req, res) => {
  const event = req.body.event;

  console.log("📩 Evento recibido:", event);

  try {
    if (event === "message_created") {
      const mensaje = req.body.message?.content || "Mensaje vacío";
      const nombre = req.body.meta?.sender?.name || "Cliente";

      await sendWhatsApp(`💬 ${nombre} dice:\n${mensaje}`);
    }

    if (event === "conversation_created") {
      const nombre = req.body.meta?.sender?.name || "Cliente";

      await sendWhatsApp(`🆕 Nueva conversación de: ${nombre}`);
    }

    if (event === "conversation_updated") {
      const agente = req.body.conversation?.meta?.assignee?.name;

      if (agente) {
        await sendWhatsApp(`👤 Conversación asignada a: ${agente}`);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// 🔹 Función Twilio
async function sendWhatsApp(text) {
  console.log("📤 Enviando mensaje:", text);

  await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Messages.json`,
    new URLSearchParams({
      From: process.env.TWILIO_FROM,
      To: process.env.TWILIO_TO,
      Body: text,
    }),
    {
      auth: {
        username: process.env.TWILIO_SID,
        password: process.env.TWILIO_AUTH_TOKEN,
      },
    }
  );

  console.log("✅ Mensaje enviado correctamente");
}

// 🔹 Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Bot corriendo en puerto ${PORT}`);
});
