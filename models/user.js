"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");
const { sqlForPartialUpdate } = require("../helpers/sql");
const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError
} = require("../expressError");

const { BCRYPT_WORK_FACTOR } = require("../config.js");

/** Related functions for users. */

class User {
  /** Remove existing rows from users_tech and adds new rows based on passed technology array.
   *
   *  @param {String} username
   *
   *  @param {Array<String>} technology Array of technologies to link to the user.
   *
   *  Returns array of technogies added to the user.
   *
   * */

  static async updateTechnology(username, technology) {
    // ISSUE - attempting to use a transaction to rollback any caught error causes issues with querys after this method executes. Following node-pg docs to use transactions with a pool did not improve results.

    // const db = await db.connect();
    // try {
    // await client.query("BEGIN");
    await db.query(
      `DELETE FROM users_tech
        WHERE username = $1
        RETURNING tech_name AS techName`,
      [username]
    );

    if (technology.length === 0) return [];

    const valueString = ((techLen) => {
      let s = [];
      for (let i = 0; i < techLen; i++) {
        s.push(`($1, $${i + 2})`);
      }
      return s.join(",");
    })(technology.length);

    const result = await db.query(
      `INSERT INTO users_tech
            (username, tech_name)
          VALUES ${valueString}
          RETURNING tech_name AS name, username`,
      [username, ...technology]
    );

    // await db.query("COMMIT");
    return result.rows.map((val) => val.name);
    // } catch (err) {
    // await client.query("ROLLBACK");
    // throw err;
    // } finally {
    //   client.release();
    // }
  }

  /** authenticate user with username, password.
   *
   * Returns { username, first_name, last_name, email, is_admin }
   *
   * Throws UnauthorizedError is user not found or wrong password.
   **/

  static async authenticate(username, password) {
    // try to find the user first
    const result = await db.query(
      `SELECT username,
          password,
          first_name AS "firstName",
          last_name AS "lastName",
          email,
          is_admin AS "isAdmin"
        FROM users
        WHERE username = $1`,
      [username]
    );

    const user = result.rows[0];

    if (user) {
      // compare hashed password to a new hash from password
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid === true) {
        delete user.password;
        return user;
      }
    }

    throw new UnauthorizedError("Invalid username/password");
  }

  /** Register user with data.
   *
   * Returns { username, firstName, lastName, email, isAdmin, technology }
   *   Where technology: [{ name }]
   * Throws BadRequestError on duplicates.
   **/

  /** Register user with data.
   *
   *  @param {object} data form data
   *    @param {string} data.username
   *    @param {string} data.password
   *    @param {string} data.firstName
   *    @param {string} data.lastName
   *    @param {string} data.email
   *    @param {boolean} data.isAdmin
   *    @param {array<string>} data.technology
   *
   *    @returns {object}  { username, firstName, lastName, email, isAdmin, technology }
   *      where technlogy = [{ name }, ...]
   *
   * */

  static async register({ username, password, firstName, lastName, email, isAdmin, technology }) {
    const duplicateCheck = await db.query(
      `SELECT username
        FROM users
        WHERE username = $1`,
      [username]
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(`Duplicate username: ${username}`);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const result = await db.query(
      `INSERT INTO users
          (username,
          password,
          first_name,
          last_name,
          email,
          is_admin)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING username, first_name AS "firstName", last_name AS "lastName", email, is_admin AS "isAdmin"`,
      [
        username,
        hashedPassword,
        firstName,
        lastName,
        email,
        isAdmin
      ]
    );

    const user = result.rows[0];

    if (user && technology) {
      user.technology = await User.updateTechnology(user.username, technology);
    }

    return user;
  }

  /** Find all users.
   *
   * Returns [{ username, first_name, last_name, email, is_admin }, ...]
   **/

  static async findAll() {
    const result = await db.query(
      `SELECT username,
          first_name AS "firstName",
          last_name AS "lastName",
          email,
          is_admin AS "isAdmin"
        FROM users
        ORDER BY username`
    );

    return result.rows;
  }

  /** Given a username, return data about user.
   *
   * Returns { username, first_name, last_name, is_admin, jobs }
   *   where jobs is [{ jobId }...]
   *   where technology is [{ name }...]
   *
   * Throws NotFoundError if user not found.
   **/

  static async get(username) {
    const userRes = await db.query(
      `SELECT username,
          first_name AS "firstName",
          last_name AS "lastName",
          email,
          is_admin AS "isAdmin"
        FROM users
        WHERE username = $1`,
      [username]
    );

    const user = userRes.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);

    const appsRes = await db.query(
      `SELECT 
          job_id AS "jobId", 
          app_state AS "appState"
        FROM applications
        WHERE username = $1`,
      [user.username]
    );
    user.jobs = appsRes.rows;

    const techRes = await db.query(
      `SELECT 
          tech_name AS name
        FROM users_tech
        WHERE username = $1`,
      [user.username]
    );

    user.technology = techRes.rows.map((t) => t.name);

    return user;
  }

  /** Update user data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain
   * all the fields; this only changes provided ones.
   *
   * Data can include:
   *   { firstName, lastName, password, email, isAdmin }
   *
   * Returns { username, firstName, lastName, email, isAdmin, technology }
   *   where technology: [{ name }...]
   *
   * Throws NotFoundError if not found.
   *
   * WARNING: this function can set a new password or make a user an admin.
   * Callers of this function must be certain they have validated inputs to this
   * or a serious security risks are opened.
   */

  static async update(username, data) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
    }

    const technology = data.technology;
    delete data.technology;

    const { setCols, values } = sqlForPartialUpdate(data, {
      firstName: "first_name",
      lastName: "last_name",
      isAdmin: "is_admin",
    });
    const usernameVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE users 
                      SET ${setCols} 
                      WHERE username = ${usernameVarIdx} 
                      RETURNING 
                        username,
                        first_name AS "firstName",
                        last_name AS "lastName",
                        email,
                        is_admin AS "isAdmin"`;
    const result = await db.query(querySql, [...values, username]);
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);

    if (technology) {
      user.technology = await User.updateTechnology(user.username, technology);
    } else {
      const techRes = await db.query(
        `SELECT 
          tech_name AS name
        FROM users_tech
        WHERE username = $1`,
        [user.username]
      );

      user.technology = techRes.rows.map((t) => t.name);
    }

    delete user.password;
    return user;
  }

  /** Delete given user from database; returns undefined. */

  static async remove(username) {
    let result = await db.query(
      `DELETE
        FROM users
        WHERE username = $1
        RETURNING username`,
      [username]
    );
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);
  }

  /** Adds a row to Applications table for a user to apply to a job
   *
   *
   *  @param {object} params {username, jobId}
   *    @param {string} params.username username of user
   *    @param {int} params.jobId id of job
   *
   *  @param {string} state can be 'interested', 'applied', 'accepted', 'rejected'
   *
   *  @returns {int} jobId if successful
   *
   *  @throws {BadRequestError} for duplicate application
   *
   *  @throws {NotFoundError} if user or job not found
   *
   */

  static async applyForJob({ username, jobId }, appState) {
    const ALLOWED_STATES = ["interested", "applied", "accepted", "rejected"];
    if (!ALLOWED_STATES.includes(appState)) throw new BadRequestError("State must be one of: " + ALLOWED_STATES);

    const dupe = await db.query(
      `SELECT username
        FROM applications
        WHERE username = $1 AND job_id = $2`,
      [username, jobId]
    );
    if (dupe.rows[0]) throw new BadRequestError("Application already exists");

    try {
      const res = await db.query(
        `INSERT INTO applications (
            username,
            job_id,
            app_state)
          VALUES ($1, $2, $3)
          RETURNING job_id AS "jobId"`,
        [username, jobId, appState]
      );
      if (res.rows[0]) return res.rows[0];
    } catch (err) {
      if (err.code !== "23503") throw err;

      let msg;
      if (err.constraint.includes("job_id")) msg = `No such job with id: ${jobId}`;
      else if (err.constraint.includes("username")) msg = `No such user with username: ${username}`;
      throw new NotFoundError(msg);
    }
    throw new Error("General Exception: This should never execute");
  }
}
module.exports = User;
