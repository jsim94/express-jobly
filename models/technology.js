"use strict";

const db = require("../db");
const { sqlForPartialUpdate, sqlForWhereString } = require("../helpers/sql");
const { checkAllowedKeys } = require("../helpers/checkAllowedKeys");
const { NotFoundError, BadRequestError, UnauthorizedError } = require("../expressError");

const { BCRYPT_WORK_FACTOR } = require("../config.js");
const { text } = require("body-parser");

/** Related functions for technologies. */

class Technology {
  /** Create a technology (from data), update db, return new technology data.
   *
   * data should be: { name }
   *
   * Returns { name }
   *
   **/

  static async create({ name }) {
    const dupe = await db.query(
      `SELECT name
           FROM technologies
           WHERE name = $1`,
      [name]
    );

    if (dupe.rows[0]) throw new BadRequestError(`Duplicate technology: ${name}`);

    try {
      const result = await db.query(
        `INSERT INTO technologies (name)
        VALUES ($1)
        RETURNING name`,
        [name]
      );

      const tech = result.rows[0];
      return tech;
    } catch (err) {
      if (err.code !== "23514") throw err;
      throw new BadRequestError("Name must be lowercase");
    }
  }

  /** Find all technologies.
   *
   *  Returns [{ name }, ...]
   *
   *  @param {object} opts technology filter options
   *    @param {string} opts.name name filter
   *
   *  @returns {Promise<object>} Promise object containing array of technologies matching params
   *
   **/

  static async findAll(opts = {}) {
    // throw error if 'opts' param has unallowed key
    checkAllowedKeys(opts, ["name"]);

    const { name, minEmployees: min, maxEmployees: max } = opts;
    let paramStrings = {};
    let params = [];

    // generate a WHERE *name* string
    if (name) {
      params.push("%" + name + "%");
      paramStrings.nameString = `name ILIKE $${params.length}`;
    }

    // generate the entire 'WHERE' string
    const whereString = sqlForWhereString(paramStrings);

    const techsRes = await db.query(
      ` SELECT name
        FROM technologies
          ${whereString || ""}
        ORDER BY name`,
      params || undefined
    );
    return techsRes.rows;
  }

  /** Given a technology, return data about technology.
   *
   * Returns { name }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(name) {
    const techRes = await db.query(
      ` SELECT 
          name
        FROM technologies
        WHERE name = $1`,
      [name]
    );

    const tech = techRes.rows[0];

    if (!tech) throw new NotFoundError(`No technology: ${name}`);

    return tech;
  }

  /** Update technology data from 'data'.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: { name }
   *
   * Returns { name }
   *
   * Throws NotFoundError if not found.
   *
   **/

  static async update(name, data) {
    const { setCols, values } = sqlForPartialUpdate(data);
    const nameVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE technologies 
                        SET ${setCols} 
                        WHERE name = ${nameVarIdx} 
                        RETURNING name`;
    const result = await db.query(querySql, [...values, name]);
    const tech = result.rows[0];

    if (!tech) throw new NotFoundError(`No technology: ${name}`);

    return tech;
  }

  /** Delete given technology from database; returns undefined.
   *
   * Throws NotFoundError if tecnology not found.
   **/

  static async remove(name) {
    const result = await db.query(
      `DELETE
        FROM technologies
        WHERE name = $1
        RETURNING name`,
      [name]
    );
    const tech = result.rows[0];

    if (!tech) throw new NotFoundError(`No technology: ${name}`);
    return tech;
  }
}

module.exports = Technology;
