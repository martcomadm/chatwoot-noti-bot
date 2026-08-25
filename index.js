require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());

// 🔐 TWILIO
const client = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = 'whatsapp:+5215662751852';

// 🧠 MAPA DE AGENTES
const agentes = {
  16: 'whatsapp:+5215625856642',
  17: 'whatsapp:+5215533970724',
  18: 'whatsapp:+5215664586278',
  19: 'whatsapp:+5215541743893',
  20: 'whatsapp:+5215656820241',
  23: 'whatsapp:+5215638691213',
  24: 'whatsapp:+5217297329867',
  25: 'whatsapp:+5215661700066',
  26: 'whatsapp:+5215570513544',
  27: 'whatsapp:+5215646033372',
  28: 'whatsapp:+5215549569516',
  30: 'whatsapp:+5215528023733',
  31: 'whatsapp:+5215513747267',
  32: 'whatsapp:+5215659182715',
  34: 'whatsapp:+5215564356459',
  35: 'whatsapp:+5215661010556',
  36: 'whatsapp:+5215534958925',
  37: 'whatsapp:+5215586785929',
  38: 'whatsapp:+5215563323834',
  39: 'whatsapp:+5215543878955',
  40: 'whatsapp:+5219992069125',
  42: 'whatsapp:+5215625968786',
  43: 'whatsapp:+5215636882382',
  46: 'whatsapp:+5215563323834',
  47: 'whatsapp:+5215645012913',
  48: 'whatsapp:+5215641006202',
  50: 'whatsapp:+5219982574070',
  51: 'whatsapp:+5219986025570',
  // ← AGREGA AQUÍ
};

// 🧠 CONTROL
const notificadosMensaje = new Set();
const notificadosAsignacion = new Set();

app.post('/webhook/chatwoot', async (req, res) => {
  const data = req.body;

  console.log("🔥 EVENTO:", data.event);

  try {

    // =====================================================
    // 🔥 1. DETECTAR ASIGNACIÓN REAL
    // =====================================================
    if (data.event === 'conversation_updated') {

      const cambios = data.changed_attributes || [];

      const cambioAsignacion = cambios.find(c => c.assignee_id);

      if (cambioAsignacion) {

        const agenteId = cambioAsignacion.assignee_id.current_value;
        const numeroAgente = agentes[agenteId];
        const convId = data.id;

        if (!numeroAgente) {
          console.log("⚠️ Agente sin número:", agenteId);
          return res.sendStatus(200);
        }

        if (notificadosAsignacion.has(convId)) {
          return res.sendStatus(200);
        }

        console.log("👤 Enviando asignación a", agenteId);

        await client.messages.create({
          from: FROM,
          to: numeroAgente,
          contentSid: 'HX66719ac2ff5eaf71cf9dfed0cfb22fd7',
          contentVariables: "{}"
        });

        notificadosAsignacion.add(convId);

        console.log("✅ Asignación enviada");
      }

      return res.sendStatus(200);
    }

    // =====================================================
    // 🔥 2. MENSAJES ENTRANTES
    // =====================================================
    if (data.event === 'message_created') {

      if (data.message_type !== 'incoming') {
        return res.sendStatus(200);
      }

      const agenteId = data.conversation?.meta?.assignee?.id;
      const numeroAgente = agentes[agenteId];
      const convId = data.conversation?.id;

      if (!agenteId || !numeroAgente) {
        console.log("⚠️ Sin agente válido");
        return res.sendStatus(200);
      }

      const clave = `${convId}-${data.id}`;

      if (notificadosMensaje.has(clave)) {
        return res.sendStatus(200);
      }

      console.log("📩 Notificando mensaje a", agenteId);

      await client.messages.create({
        from: FROM,
        to: numeroAgente,
        contentSid: 'HX75c4a950a34d91bcc8984b923228e169',
        contentVariables: "{}"
      });

      notificadosMensaje.add(clave);

      console.log("✅ Mensaje enviado");
    }

  } catch (error) {
    console.error("❌ ERROR:", error.message);
  }

  res.sendStatus(200);
});

// 🚀 SERVER
app.listen(3000, () => {
  console.log("🚀 Bot corriendo en puerto 3000");
});
