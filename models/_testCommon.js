const bcrypt = require("bcrypt");

const db = require("../db.js");
const { BCRYPT_WORK_FACTOR } = require("../config");

async function commonBeforeAll() {
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM companies");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM users");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM jobs");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM applications");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM technologies");

  await db.query(
    `INSERT INTO technologies (name)
      VALUES
        ('python'),
        ('javascript'),
        ('perl'),
        ('react'),
        ('angular')`
  );

  await db.query(
    `INSERT INTO companies (
        handle, 
        name, 
        num_employees, 
        description, 
        logo_url)
      VALUES ('c1', 'C1', 1, 'Desc1', 'http://c1.img'),
        ('c2', 'C2', 2, 'Desc2', 'http://c2.img'),
        ('c3', 'C3', 3, 'Desc3', 'http://c3.img')`
  );

  await db.query(
    `INSERT INTO users (
        username,
        password,
        first_name,
        last_name,
        email)
      VALUES 
        ('u1', $1, 'U1F', 'U1L', 'u1@email.com'),
        ('u2', $2, 'U2F', 'U2L', 'u2@email.com')
      RETURNING username`,
    [await bcrypt.hash("password1", BCRYPT_WORK_FACTOR), await bcrypt.hash("password2", BCRYPT_WORK_FACTOR)]
  );

  const jobsRes = await db.query(
    `INSERT INTO jobs (
        title, 
        salary, 
        equity, 
        company_handle)
      VALUES 
        ('j1', 20000, 0, 'c1'),
        ('j2', 40000, 0.8, 'c1'),
        ('j3', 60000, 0, 'c2'),
        ('j4', 80000, 0.4, 'c3')
      RETURNING id`
  );
  const jobIds = jobsRes.rows;

  await db.query(
    `INSERT INTO applications (
        username,
        job_id,
        app_state)
      VALUES
        ('u1', ${jobIds[0].id}, 'applied'),
        ('u1', ${jobIds[1].id}, 'interested')`
  );

  await db.query(
    `INSERT INTO jobs_tech (
        job_id,
        tech_name)
      VALUES
        (${jobIds[0].id}, 'python'),
        (${jobIds[0].id}, 'javascript'),
        (${jobIds[0].id}, 'react'),
        (${jobIds[1].id}, 'python'),
        (${jobIds[1].id}, 'javascript'),
        (${jobIds[1].id}, 'python'),
        (${jobIds[2].id}, 'perl'),
        (${jobIds[2].id}, 'javascript'),
        (${jobIds[2].id}, 'angular')`
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
}

async function getJob1Id() {
  const res = await db.query(
    `SELECT id
      FROM jobs
      WHERE title = 'j1'`
  );
  return res.rows[0].id;
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

module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  getJob1Id,
};
