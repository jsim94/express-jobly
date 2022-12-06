"use strict";
/** Database setup for jobly. */
const { Pool } = require("pg");
const { getDatabaseUri, DB_HOST, DB_PW } = require("./config");

let pool;

if (process.env.NODE_ENV === "production") {
  pool = new Pool({
    host: DB_HOST,
    password: "admin",
    database: getDatabaseUri(),
    ssl: {
      rejectUnauthorized: false,
    },
  });
} else {
  pool = new Pool({
    host: DB_HOST,
    password: "admin",
    database: getDatabaseUri(),
  });
}

module.exports = pool;
