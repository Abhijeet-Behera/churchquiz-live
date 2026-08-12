const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '../.env')
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const {
  registerSocketHandlers
} = require('./socketHandlers');

const app = express();
const server = http.createServer(app);


/* =========================================================
   CORS
   ========================================================= */

const productionOrigins = (
  process.env.ALLOWED_ORIGINS || ''
)
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  ...productionOrigins
];


function isOriginAllowed(origin) {
  /*
   * Requests without an Origin header include
   * server-to-server requests and local health checks.
   */
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  /*
   * Development LAN support:
   * http://192.168.x.x:5173
   * http://10.x.x.x:5174
   * etc.
   */
  if (
    /^http:\/\/(?:[0-9]{1,3}\.){3}[0-9]{1,3}:(?:5173|5174)$/.test(
      origin
    )
  ) {
    return true;
  }

  return false;
}


/* =========================================================
   SOCKET.IO
   ========================================================= */

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(
          new Error(
            'Not allowed by CORS'
          )
        );
      }
    },

    methods: [
      'GET',
      'POST'
    ]
  }
});


/* =========================================================
   EXPRESS CORS
   ========================================================= */

app.use((req, res, next) => {
  const origin =
    req.headers.origin;

  if (isOriginAllowed(origin)) {
    if (origin) {
      res.setHeader(
        'Access-Control-Allow-Origin',
        origin
      );
    }

    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, OPTIONS'
    );

    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});


app.use(express.json());


/* =========================================================
   STATIC CLIENT
   ========================================================= */

const clientDistPath =
  path.join(
    __dirname,
    '../client/dist'
  );

app.use(
  express.static(
    clientDistPath
  )
);


/* =========================================================
   HEALTH CHECK
   ========================================================= */

app.get(
  '/api/health',
  (req, res) => {
    res.json({
      status: 'ok',
      time:
        new Date().toISOString()
    });
  }
);


/* =========================================================
   SOCKET CONNECTIONS
   ========================================================= */

io.on(
  'connection',
  socket => {
    registerSocketHandlers(
      io,
      socket
    );
  }
);


/* =========================================================
   SPA FALLBACK
   ========================================================= */

app.get(
  '*',
  (req, res) => {
    const indexPath =
      path.join(
        clientDistPath,
        'index.html'
      );

    if (
      fs.existsSync(
        indexPath
      )
    ) {
      res.sendFile(
        indexPath
      );
    } else {
      res
        .status(200)
        .send(
          'ChurchQuiz Live API Server Running'
        );
    }
  }
);


/* =========================================================
   SERVER START
   ========================================================= */

const PORT =
  process.env.PORT ||
  3000;

if (require.main === module) {
  server.listen(
    PORT,
    '0.0.0.0',
    () => {
      console.log(
        `ChurchQuiz Live server running on port ${PORT}`
      );

      console.log(
        `SERVER: http://localhost:${PORT}`
      );

      console.log(
        'HOST: http://localhost:5173'
      );

      console.log(
        'PLAYER: http://localhost:5174'
      );

      console.log(
        `Clerk backend auth: ${process.env.CLERK_SECRET_KEY
          ? 'configured'
          : 'MISSING CLERK_SECRET_KEY'
        }`
      );
    }
  );
}


module.exports = {
  app,
  server,
  io
};