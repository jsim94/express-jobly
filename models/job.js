"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate, sqlForWhereString } = require("../helpers/sql");
const { checkAllowedKeys } = require("../helpers/checkAllowedKeys");

/** Related functions for companies. */

// CREATE TABLE jobs (
//   id SERIAL PRIMARY KEY,
//   title TEXT NOT NULL,
//   salary INTEGER CHECK (salary >= 0),
//   equity NUMERIC CHECK (equity <= 1.0),
//   company_handle VARCHAR(25) NOT NULL
//     REFERENCES companies ON DELETE CASCADE
// );

class Job {
  /** Create a job (from data), update db, return new company data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { title, salary, equity, company_handle }
   *
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const result = await db.query(
      ` INSERT INTO jobs
          (title, salary, equity, company_handle)
        VALUES ($1, $2, $3, $4)
        RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   *
   * @param {object} opts { title : string , minSalary : int , hasEquity : boolean }
   *
   * @returns {Promise} Promise object containing array of jobs matching params
   *
   * */

  static async findAll(opts = {}) {
    // throw error if 'opts' param has unallowed key
    checkAllowedKeys(opts, ["title", "minSalary", "hasEquity"]);

    const { title, minSalary, hasEquity } = opts;

    const paramStrings = {};
    let params = [];

    // generate a WHERE *title* string
    if (title) {
      params.push(title);
      paramStrings.title = `title ILIKE $${params.length}`;
    }

    // generate a WHERE *minSalary* string
    if (minSalary) {
      params.push(minSalary);
      paramStrings.minSalaryString = `salary >= $${params.length}`;
    }

    // generate a WHERE *hasEquityString* string
    if (hasEquity) {
      paramStrings.hasEquityString = `equity > 0`;
    }

    // generate the entire 'WHERE' string
    const whereString = sqlForWhereString(paramStrings);

    const jobsRes = await db.query(
      ` SELECT 
          id,
          title,
          salary,
          equity,
          company_handle as "companyHandle"
        FROM jobs
        ${whereString || ""}
        ORDER BY title`,
      params || undefined
    );
    return jobsRes.rows;
  }

  /** Given a job id, return data about job.
   *
   * Returns { title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobRes = await db.query(
      ` SELECT 
          id,
          title,
          salary,
          equity,
          company_handle as "companyHandle"
        FROM jobs
        WHERE id = $1`,
      [id]
    );

    const job = jobRes.rows[0];
    if (!job) throw new NotFoundError(`No job with id: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {title, salary, equity, companyHandle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    //throw if id is not an integer or if data includes unallowed keys.
    if (!Number.isInteger(id)) throw new Error("id must be an integer: " + id);
    checkAllowedKeys(data, ["title", "salary", "equity"]);

    const { setCols, values } = sqlForPartialUpdate(data);
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                        SET ${setCols} 
                        WHERE id = ${idVarIdx} 
                        RETURNING
                          id,
                          title, 
                          salary, 
                          equity, 
                          company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job with id: ${id}`);
    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    if (!Number.isInteger(id)) throw new Error("id must be an integer: " + id);
    const result = await db.query(
      ` DELETE
          FROM jobs
          WHERE id = $1
          RETURNING title`,
      [id]
    );
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job with id: ${id}`);
  }
}

module.exports = Job;
