"use strict";

const db = require("../db.js");
const User = require("../models/user");
const Company = require("../models/company");
const Job = require("../models/job");
const { createToken } = require("../helpers/tokens");

async function commonBeforeAll() {
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM users");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM companies");

  await Company.create({
    handle: "c1",
    name: "C1",
    numEmployees: 1,
    description: "Desc1",
    logoUrl: "http://c1.img",
  });
  await Company.create({
    handle: "c2",
    name: "C2",
    numEmployees: 2,
    description: "Desc2",
    logoUrl: "http://c2.img",
  });
  await Company.create({
    handle: "c3",
    name: "C3",
    numEmployees: 3,
    description: "Desc3",
    logoUrl: "http://c3.img",
  });

  await User.register({
    username: "u1",
    firstName: "U1F",
    lastName: "U1L",
    email: "user1@user.com",
    password: "password1",
    isAdmin: true,
  });
  await User.register({
    username: "u2",
    firstName: "U2F",
    lastName: "U2L",
    email: "user2@user.com",
    password: "password2",
    isAdmin: false,
  });
  await User.register({
    username: "u3",
    firstName: "U3F",
    lastName: "U3L",
    email: "user3@user.com",
    password: "password3",
    isAdmin: false,
  });
  const j1 = await Job.create({
    title: "j1",
    salary: 20000,
    equity: 0,
    companyHandle: "c1",
  });
  const j2 = await Job.create({
    title: "j2",
    salary: 40000,
    equity: 0.8,
    companyHandle: "c1",
  });
  const j3 = await Job.create({
    title: "j3",
    salary: 60000,
    equity: 0,
    companyHandle: "c2",
  });
  await Job.create({
    title: "j4",
    salary: 80000,
    equity: 0.4,
    companyHandle: "c3",
  });

  await db.query(
    `INSERT INTO jobs_tech (
        job_id,
        tech_name)
      VALUES
        (${j1.id}, 'python'),
        (${j1.id}, 'javascript'),
        (${j1.id}, 'react'),
        (${j2.id}, 'python'),
        (${j2.id}, 'javascript'),
        (${j2.id}, 'python'),
        (${j3.id}, 'perl'),
        (${j3.id}, 'javascript'),
        (${j3.id}, 'angular')`
  );

  await db.query(
    `INSERT INTO users_tech (
        username,
        tech_name)
      VALUES
        ('u1', 'python'),
        ('u1', 'javascript'),
        ('u1', 'react'),
        ('u2', 'python'),
        ('u2', 'perl'),
        ('u2', 'angular')`
  );

  await User.applyForJob({ username: "u1", jobId: j1.id }, "applied");
  await User.applyForJob({ username: "u1", jobId: j2.id }, "applied");
}

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}

async function getJob1Id() {
  const res = await db.query(
    ` SELECT id
      FROM jobs
      WHERE title = 'j1'`
  );
  return res.rows[0].id;
}

const u1Token = createToken({ username: "u1", isAdmin: true });
const u2Token = createToken({ username: "u2", isAdmin: false });

module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  getJob1Id,
  u1Token,
  u2Token,
};
