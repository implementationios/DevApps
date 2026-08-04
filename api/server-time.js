// Portado 1:1 desde app.js (GET /api/server-time) del Express original.
// Vercel expone req.query igual que Express, asi que la logica no cambia.
const { DateTime } = require("luxon");

const MANUAL_OFFSETS = {
  "America/Merida": -360,
  "America/Mexico_City": -360,
  "America/Bogota": -300,
  // agrega mas si lo necesitas
};

function isValidTimezone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = (req, res) => {
  const tz = req.query.timezone;

  if (!tz) {
    return res
      .status(400)
      .json({ error: "Timezone is required as a query param (e.g., ?timezone=America/New_York)" });
  }

  if (MANUAL_OFFSETS.hasOwnProperty(tz)) {
    const offsetMinutes = MANUAL_OFFSETS[tz];
    const nowUtc = new Date(Date.now());
    const localDate = new Date(nowUtc.getTime() - Math.abs(offsetMinutes) * 60000);

    const pad = (n) => (n < 10 ? "0" + n : n);
    const formatted =
      localDate.getUTCFullYear() +
      "-" +
      pad(localDate.getUTCMonth() + 1) +
      "-" +
      pad(localDate.getUTCDate()) +
      " " +
      pad(localDate.getUTCHours()) +
      ":" +
      pad(localDate.getUTCMinutes()) +
      ":" +
      pad(localDate.getUTCSeconds());

    return res.json({
      timezone: tz,
      datetime: localDate.toISOString(),
      timeServer: nowUtc.toISOString(),
      localTime: formatted,
      utcOffset: offsetMinutes,
    });
  }

  if (!isValidTimezone(tz)) {
    return res.status(400).json({ error: "Invalid timezone format" });
  }

  const now = DateTime.now().setZone(tz);

  return res.json({
    timezone: tz,
    datetime: now.toISO(),
    timeServer: new Date().toISOString(),
    localTime: now.toFormat("yyyy-MM-dd HH:mm:ss"),
    utcOffset: now.offset,
  });
};
