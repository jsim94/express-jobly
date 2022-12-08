"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  getJob1Id,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "title",
    salary: 80000,
    equity: 0.6,
    companyHandle: "c1",
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual({ ...newJob, id: expect.any(Number) });

    const result = await db.query(
      ` SELECT title, salary, equity, company_handle as "companyHandle"
        FROM jobs
        WHERE title = 'title'`
    );
    expect(result.rows).toEqual([
      {
        title: "title",
        salary: 80000,
        equity: 0.6,
        companyHandle: "c1",
      },
    ]);
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        companyHandle: "c1",
        equity: 0,
        salary: 20000,
        title: "j1",
      },
      {
        id: expect.any(Number),
        companyHandle: "c1",
        equity: 0.8,
        salary: 40000,
        title: "j2",
      },
      {
        id: expect.any(Number),
        companyHandle: "c2",
        equity: 0,
        salary: 60000,
        title: "j3",
      },
      {
        id: expect.any(Number),
        companyHandle: "c3",
        equity: 0.4,
        salary: 80000,
        title: "j4",
      },
    ]);
  });

  test("works: title filter", async function () {
    let companies = await Job.findAll({ title: "j2" });
    expect(companies).toEqual([
      {
        id: expect.any(Number),
        companyHandle: "c1",
        equity: 0.8,
        salary: 40000,
        title: "j2",
      },
    ]);
  });
  test("works: minSalary filter", async function () {
    let companies = await Job.findAll({ minSalary: 50000 });
    expect(companies).toEqual([
      {
        id: expect.any(Number),
        companyHandle: "c2",
        equity: 0,
        salary: 60000,
        title: "j3",
      },
      {
        id: expect.any(Number),
        companyHandle: "c3",
        equity: 0.4,
        salary: 80000,
        title: "j4",
      },
    ]);
  });

  test("works: equity filter", async function () {
    let companies = await Job.findAll({ hasEquity: true });
    expect(companies).toEqual([
      {
        id: expect.any(Number),
        companyHandle: "c1",
        equity: 0.8,
        salary: 40000,
        title: "j2",
      },
      {
        id: expect.any(Number),
        companyHandle: "c3",
        equity: 0.4,
        salary: 80000,
        title: "j4",
      },
    ]);
  });

  test("works: minSalary and equity filter", async function () {
    let companies = await Job.findAll({ minSalary: 50000, hasEquity: true });
    expect(companies).toEqual([
      {
        id: expect.any(Number),
        companyHandle: "c3",
        equity: 0.4,
        salary: 80000,
        title: "j4",
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  //

  test("works", async function () {
    const job1Id = await getJob1Id();
    let job = await Job.get(job1Id);
    expect(job).toEqual({
      id: expect.any(Number),
      companyHandle: "c1",
      equity: 0,
      salary: 20000,
      title: "j1",
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(1);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const goodUpdateData = {
    title: "newTitle",
    salary: 60000,
    equity: 0.2,
  };
  const badUpdateData = {
    title: "newTitle2",
    salary: 60001,
    equity: 0.3,
    companyHandle: "c1",
  };

  test("works", async function () {
    const job1Id = await getJob1Id();
    let job = await Job.update(job1Id, goodUpdateData);
    expect(job).toEqual({
      id: expect.any(Number),
      companyHandle: "c1",
      ...goodUpdateData,
    });

    const result = await db.query(
      ` SELECT id, title, salary, equity, company_handle as "companyHandle"
        FROM jobs
        WHERE title = 'newTitle'`
    );
    expect(result.rows).toEqual([
      {
        id: expect.any(Number),
        title: "newTitle",
        salary: 60000,
        equity: 0.2,
        companyHandle: "c1",
      },
    ]);
  });

  test("works: null fields", async function () {
    const job1Id = await getJob1Id();
    const updateDataSetNulls = {
      title: "NewTitle2",
      salary: null,
    };

    let job = await Job.update(job1Id, updateDataSetNulls);
    expect(job).toEqual({
      id: expect.any(Number),
      companyHandle: "c1",
      equity: 0,
      ...updateDataSetNulls,
    });

    const result = await db.query(
      `SELECT title, salary, equity, company_handle as "companyHandle"
           FROM jobs
           WHERE id = ${job1Id}`
    );
    expect(result.rows).toEqual([
      {
        title: "NewTitle2",
        salary: null,
        equity: 0,
        companyHandle: "c1",
      },
    ]);
  });

  test("bad request with no data", async function () {
    const job1Id = await getJob1Id();
    try {
      await Job.update(job1Id, {});
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestError);
    }
  });

  test("not found if no such company", async function () {
    try {
      await Job.update(1, goodUpdateData);
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    const job1Id = await getJob1Id();
    await Job.remove(job1Id);
    const res = await db.query("SELECT id FROM jobs WHERE id=" + job1Id);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async function () {
    expect.assertions(1);
    try {
      await Job.remove(1);
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });
});
