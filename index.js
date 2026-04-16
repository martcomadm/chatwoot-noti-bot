require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 🔹 Función para enviar TEMPLATE de WhatsApp
async function sendTemplate(contentSid, variables) {
  try {
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

    console.log("✅ Mensaje enviado con template:", contentSid);
  } catch (error) {
    console.error("❌ Error enviando template:", error.response?.data || error.message);
  }
}

// 🔹 Webhook principal
app.post("/webhook/chatwoot", async (req, res) => {
  console.log("➡️ POST /webhook/chatwoot");

  const event = req.body.event;
  console.log("📩 Evento recibido:", event);

  try {
    // ===============================
    // 🟢 NUEVO MENSAJE
    // ===============================
    if (event === "message_created") {
      const mensaje = req.body.message?.content || "Sin mensaje";
      const nombre = req.body.meta?.sender?.name || "Cliente";

      console.log("📤 Notificando nuevo mensaje...");

      await sendTemplate(
        "HX199f64110199488a4e9f8cd1d1cfe50c", // Template nuevo mensaje
        {
          1: nombre,
          2: mensaje,
        }
      );
    }

    // ===============================
    // 🟡 CONVERSACIÓN ASIGNADA
    // ===============================
    if (event === "conversation_updated") {
      const assignee = req.body.meta?.assignee?.name;
      const contacto = req.body.meta?.sender?.name || "Cliente";

      // Solo cuando se asigna a alguien
      if (assignee) {
        console.log("📤 Notificando asignación...");

        await sendTemplate(
          "HX893d4fe0222bc376845904ccb112c866", // Template asignación
          {
            1: contacto,
          }
        );
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error general:", error.message);
    res.sendStatus(500);
  }
});

// 🔹 Puerto dinámico (IMPORTANTE para EasyPanel)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Bot corriendo en puerto ${PORT}`);
});
