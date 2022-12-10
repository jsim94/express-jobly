"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate, sqlForWhereString } = require("../helpers/sql");
const { checkAllowedKeys } = require("../helpers/checkAllowedKeys");

/** Related functions for jobs. */

class Job {
  /** Remove existing rows from jobs_tech and adds new rows based on passed technology array.
   *
   *  @param {Number} jobId job id
   *
   *  @param {Array<String>} technology Array of technologies to link to the job.
   *
   *  Returns array of technogies added to job listing.
   *
   * */

  static async updateTechnology(jobId, technology) {
    // ISSUE - attempting to use a transaction to rollback any caught error causes issues with querys after this method executes. Following node-pg docs to use transactions with a pool did not improve results.

    // const db = await db.connect();
    // try {
    // await client.query("BEGIN");
    await db.query(
      `DELETE FROM jobs_tech
        WHERE job_id = $1
        RETURNING tech_name AS techName`,
      [jobId]
    );

    const valueString = ((techLen) => {
      let s = [];
      for (let i = 0; i < techLen; i++) {
        s.push(`($1, $${i + 2})`);
      }
      return s.join(",");
    })(technology.length);

    const result = await db.query(
      `INSERT INTO jobs_tech
            (job_id, tech_name)
          VALUES ${valueString}
          RETURNING tech_name AS name, job_id as "jobId"`,
      [jobId, ...technology]
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

  /** Create a job (from data), update db, return new company data.
   *
   *  @param {object} data form data
   *    @param {string} data.title
   *    @param {number} data.salary
   *    @param {number} data.equity
   *    @param {string} data.company_handle
   *    @param {array<string>} data.technology
   *
   *    @returns {object}
   *      Returns { title, salary, equity, company_handle, technology }
   *      where technlogy = [{ name }, ...]
   *
   * */

  static async create({ title, salary, equity, companyHandle, technology }) {
    const result = await db.query(
      ` INSERT INTO jobs
          (title, salary, equity, company_handle)
        VALUES ($1, $2, $3, $4)
        RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];

    if (job && technology) {
      job.technology = await Job.updateTechnology(job.id, technology);
    }
    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   *
   * @param {object} opts { title : string , minSalary : int , hasEquity : boolean, technology : Array<string>}
   *
   * @returns {Promise} Promise object containing array of jobs matching params
   *
   * */

  static async findAll(opts = {}) {
    // throw error if 'opts' param has unallowed key
    checkAllowedKeys(opts, ["title", "minSalary", "hasEquity", "technology"]);

    const { title, minSalary, hasEquity, technology } = opts;

    const paramStrings = {};
    let params = [];

    // generate a WHERE *title* string
    if (title) {
      params.push("%" + title + "%");
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

    if (technology) {
      paramStrings.hasTechnology = `id IN 
        (SELECT job_id
          FROM jobs_tech
          WHERE
              id = job_id
            AND
              tech_name IN (${Array.from({ length: technology.length }, (x, i) => {
                return `$${i + params.length + 1}`;
              }).join(",")}))`;
      params.push(...technology);
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

    const techRes = await db.query(
      `SELECT 
          tech_name AS name
        FROM jobs_tech
        WHERE job_id = $1`,
      [job.id]
    );

    job.technology = techRes.rows.map((t) => t.name);

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
    checkAllowedKeys(data, ["title", "salary", "equity", "technology"]);

    const technology = data.technology;
    delete data.technology;

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

    if (technology) {
      job.technology = await Job.updateTechnology(job.id, technology);
    }
    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    if (!Number.isInteger(id)) throw new Error("id must be an integer: " + id);
    const result = await db.query(
      `DELETE 
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
