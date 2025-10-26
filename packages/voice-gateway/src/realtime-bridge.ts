// ---------- src/realtime-bridge.ts ----------
import WebSocket from "ws";
import fetch from "node-fetch";

type SquareSlot = { start_at: string, end_at: string, service_variation_id?: string };

export function createRealtimeBridge(twilioWS: WebSocket, req: any) {
  const OPENAI_API_KEY  = process.env.OPENAI_API_KEY!;
  const model = "gpt-4o-realtime-preview"; // รุ่น realtime ล่าสุด

  // เชื่อม OpenAI Realtime ผ่าน WS
  const oai = new WebSocket(
    `wss://api.openai.com/v1/realtime?model=${model}`,
    {
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1"
      }
    }
  );

  // เมื่อเชื่อมต่อสำเร็จ ตั้ง session: โหมดเสียง + voice + audio_format g711_ulaw (โทรศัพท์) + Tool
  oai.on("open", () => {
    oai.send(JSON.stringify({
      type: "session.update",
      session: {
        instructions:
          "You are FortuneOne AI Receptionist (EN/TH) for a massage & waxing spa in NYC. " +
          "Speak shortly, one question at a time. Verify service/date/time/name/phone. " +
          "Offer nearest available slots. Policies: close 22:00, last booking 21:00, cancel >=3h.",
        modalities: ["audio","text"],
        input_audio_format: "g711_ulaw",
        output_audio_format: "g711_ulaw",
        voice: "verse",         // เสียงโมเดลของ OpenAI (ต้องการ ElevenLabs ค่อยสลับใน v2)
        tool_choice: "auto",
        tools: [
          {
            type: "function",
            name: "find_availability",
            description: "Get available time slots on a given date for a specific service.",
            parameters: {
              type: "object",
              properties: {
                service: { type: "string" },
                date: { type: "string", description: "YYYY-MM-DD in spa local time" }
              },
              required: ["service","date"]
            }
          },
          {
            type: "function",
            name: "create_booking",
            description: "Create a booking in Square at a specified start time.",
            parameters: {
              type: "object",
              properties: {
                name:  { type: "string" },
                phone: { type: "string" },
                service: { type: "string" },
                start: { type: "string", description: "ISO8601 start time in spa timezone" }
              },
              required: ["name","phone","service","start"]
            }
          }
        ]
      }
    }));
  });

  // Twilio → OpenAI: รีเลย์เสียง (base64 μ-law) เป็น input buffer
  let lastAppend = 0;
  twilioWS.on("message", (buf) => {
    try {
      const msg = JSON.parse(buf.toString());
      if (msg.event === "media" && msg.media?.payload) {
        oai.send(JSON.stringify({
          type: "input_audio_buffer.append",
          audio: msg.media.payload,            // base64 μ-law
          audio_format: "g711_ulaw"            // ❗️สำคัญ: แจ้งฟอร์แมต
        }));
        lastAppend = Date.now();
      }
      // ทริกเกอร์ให้โมเดลตอบทุก ๆ ~900ms หลังมีเสียงเข้า (low-latency)
      if (Date.now() - lastAppend > 900) {
        oai.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
        oai.send(JSON.stringify({ type: "response.create", response: { modalities: ["audio"] }}));
        lastAppend = Infinity;
      }
    } catch {}
  });

  // OpenAI → Twilio: ส่งเสียงกลับ (μ-law base64) เป็นเฟรม media
  oai.on("message", (raw) => {
    try {
      const evt = JSON.parse(raw.toString());
      if (evt.type === "response.output_audio.delta") {
        twilioWS.send(JSON.stringify({ event: "media", media: { payload: evt.audio } }));
      }
      if (evt.type === "response.completed") {
        // โมเดลจบท่อนตอบหนึ่งครั้งแล้ว
      }
      // Function calling → เรียก Square แล้วส่งผลกลับ
      if (evt.type === "response.function_call") {
        runSquare(evt.name, evt.arguments).then(result => {
          oai.send(JSON.stringify({
            type: "response.function_call_result",
            call_id: evt.call_id,
            result
          }));
        }).catch(err => {
          oai.send(JSON.stringify({
            type: "response.function_call_result",
            call_id: evt.call_id,
            result: { error: String(err?.message || err) }
          }));
        });
      }
    } catch (e) {
      console.error("[OAI] parse error", e);
    }
  });

  // ความปลอดภัยของคอนเนกชัน
  const keep = setInterval(() => { try { twilioWS.ping(); } catch {} ; try { oai.ping(); } catch {} }, 10000);
  const cleanup = () => { clearInterval(keep); try{ oai.close(); }catch{}; try{ twilioWS.close(); }catch{}; };
  oai.on("close", cleanup); twilioWS.on("close", cleanup);
  oai.on("error", () => {}); twilioWS.on("error", () => {});
}

// ---------- Square Tools ----------
async function runSquare(name: string, args: any) {
  if (name === "find_availability") {
    return findAvailability(args?.service, args?.date);
  }
  if (name === "create_booking") {
    return createBooking(args?.name, args?.phone, args?.service, args?.start);
  }
  return { error: "unknown_tool" };
}

async function findAvailability(service: string, date: string) {
  // ตัวอย่าง: โค้ดนี้เป็นโครง; ให้ Comet ใช้ endpoints /v2/bookings/availability
  // หากไม่มี service mapping ให้คืน slot mock ไว้ก่อนเพื่อ E2E
  return { slots: [] as SquareSlot[], note: "TODO: wire to Square availability API" };
}

async function createBooking(name: string, phone: string, service: string, start: string) {
  // ตัวอย่าง: โครงสร้างจองผ่าน Square /v2/bookings
  return { ok: false, note: "TODO: implement Square booking API" };
}
// ---------- END FILE ----------
