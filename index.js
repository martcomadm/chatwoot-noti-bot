require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 🔍 DEBUG AL INICIAR
console.log("🔍 ===== DEBUG ENV =====");
console.log("TWILIO_SID:", process.env.TWILIO_SID ? "OK" : "❌ NO");
console.log("TWILIO_AUTH_TOKEN:", process.env.TWILIO_AUTH_TOKEN ? "OK" : "❌ NO");
console.log("TWILIO_FROM:", process.env.TWILIO_FROM || "❌ NO");
console.log("TWILIO_TO:", process.env.TWILIO_TO || "❌ NO");
console.log("PORT:", process.env.PORT || "NO DEFINIDO");
console.log("========================");

// 🔹 Función para enviar TEMPLATE
async function sendTemplate(contentSid, variables) {
  try {
    console.log("📦 Enviando a Twilio...");
    console.log("➡️ TO:", process.env.TWILIO_TO);
    console.log("➡️ FROM:", process.env.TWILIO_FROM);
    console.log("➡️ CONTENT SID:", contentSid);
    console.log("➡️ VARIABLES:", variables);

    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Messages.json`,
      {
        To: process.env.TWILIO_TO,
        From: process.env.TWILIO_FROM,
        ContentSid: contentSid,
        ContentVariables: JSON.stringify(variables),
      },
      {
        auth: {
          username: process.env.TWILIO_SID,
          password: process.env.TWILIO_AUTH_TOKEN,
        },
      }
    );

    console.log("✅ Mensaje enviado correctamente");
  } catch (error) {
    console.error("❌ ERROR TWILIO:");
    console.error(error.response?.data || error.message);
  }
}

// 🔹 Webhook
app.post("/webhook/chatwoot", async (req, res) => {
  console.log("➡️ POST /webhook/chatwoot");

  const event = req.body.event;
  console.log("📩 Evento:", event);
  console.log("📦 BODY:", JSON.stringify(req.body, null, 2));

  try {
    // 🟢 NUEVO MENSAJE
    if (event === "message_created") {
      const mensaje = req.body.message?.content || "Sin mensaje";
      const nombre = req.body.meta?.sender?.name || "Cliente";

      console.log("📤 Preparando template mensaje...");

      await sendTemplate(
        "HX199f64110199488a4e9f8cd1d1cfe50c",
        {
          1: nombre,
          2: mensaje,
        }
      );
    }

    // 🟡 ASIGNACIÓN
    if (event === "conversation_updated") {
      const assignee = req.body.meta?.assignee?.name;
      const contacto = req.body.meta?.sender?.name || "Cliente";

      if (assignee) {
        console.log("📤 Preparando template asignación...");

        await sendTemplate(
          "HX893d4fe0222bc376845904ccb112c866",
          {
            1: contacto,
          }
        );
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ ERROR GENERAL:", error.message);
    res.sendStatus(500);
  }
});

// 🔹 PUERTO
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Bot corriendo en puerto ${PORT}`);
});
