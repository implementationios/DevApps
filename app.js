var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const { DateTime } = require('luxon');

var app = express();
let isHeroku = process.env.DYNO !== undefined;
//isHeroku = true; // for local testing
const mainDir = isHeroku ? "dist" : "public";

app.use(express.json());

function isValidTimezone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, mainDir)));


// Endpoint para obtener la hora del servidor
const MANUAL_OFFSETS = {
  "America/Merida": -360,
  "America/Mexico_City": -360,
  "America/Bogota": -300,
  // agrega más si lo necesitas
};

app.get('/api/server-time', function(req, res) {
  const tz = req.query.timezone;

  if (!tz) {
    return res.status(400).json({ error: 'Timezone is required as a query param (e.g., ?timezone=America/New_York)' });
  }

  // Si el timezone está en MANUAL_OFFSETS, usar el offset manual
  if (MANUAL_OFFSETS.hasOwnProperty(tz)) {
    const offsetMinutes = MANUAL_OFFSETS[tz];
    const nowUtc = new Date(Date.now());
    const localDate = new Date(nowUtc.getTime() - Math.abs(offsetMinutes) * 60000);

    function pad(n) { return n < 10 ? '0' + n : n; }
    const formatted = localDate.getUTCFullYear() + '-' +
      pad(localDate.getUTCMonth() + 1) + '-' +
      pad(localDate.getUTCDate()) + ' ' +
      pad(localDate.getUTCHours()) + ':' +
      pad(localDate.getUTCMinutes()) + ':' +
      pad(localDate.getUTCSeconds());

    return res.json({
      timezone: tz,
      datetime: localDate.toISOString(),
      timeServer: nowUtc.toISOString(),
      localTime: formatted,
      utcOffset: offsetMinutes
    });
  }

  // Si no, usar el cálculo estándar con Luxon
  if (!isValidTimezone(tz)) {
    return res.status(400).json({ error: 'Invalid timezone format' });
  }

  const now = DateTime.now().setZone(tz);
  
  return res.json({
    timezone: tz,
    datetime: now.toISO(),
    timeServer: new Date().toISOString(),
    localTime: now.toFormat("yyyy-MM-dd HH:mm:ss"),
    utcOffset: now.offset
  });
});

app.get('/api/server-time-compare', function(req, res) {
  const tz = req.query.timezone;

  if (!tz) {
    return res.status(400).json({ error: 'Timezone is required as a query param (e.g., ?timezone=America/New_York)' });
  }

  if (!isValidTimezone(tz)) {
    return res.status(400).json({ error: 'Invalid timezone format' });
  }

  const nowLuxon = DateTime.now().setZone(tz);
  const nowNative = new Date().toLocaleString('en-US', { timeZone: tz });

  return res.json({
    timezone: tz,
    luxon: {
      iso: nowLuxon.toISO(),
      formatted: nowLuxon.toFormat("yyyy-MM-dd HH:mm:ss"),
      offset: nowLuxon.offset
    },
    native: {
      localString: nowNative
    },
    serverUtc: new Date().toISOString()
  });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.get('/', (req, res) => {
   res.sendFile(path.join(__dirname, 'index.html'));
});

module.exports = app;
