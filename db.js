"use strict";
/** Database setup for jobly. */
const { Pool, types } = require("pg");
const { getDatabaseUri, DB_HOST, DB_PW } = require("./config");

types.setTypeParser(1700, function (val) {
  return parseFloat(val);
});

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
