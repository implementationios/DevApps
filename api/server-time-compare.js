// Portado 1:1 desde app.js (GET /api/server-time-compare) del Express original.
const { DateTime } = require("luxon");

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

  if (!isValidTimezone(tz)) {
    return res.status(400).json({ error: "Invalid timezone format" });
  }

  const nowLuxon = DateTime.now().setZone(tz);
  const nowNative = new Date().toLocaleString("en-US", { timeZone: tz });

  return res.json({
    timezone: tz,
    luxon: {
      iso: nowLuxon.toISO(),
      formatted: nowLuxon.toFormat("yyyy-MM-dd HH:mm:ss"),
      offset: nowLuxon.offset,
    },
    native: {
      localString: nowNative,
    },
    serverUtc: new Date().toISOString(),
  });
};
