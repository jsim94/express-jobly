"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll, getJob1Id, u1Token, u2Token } = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "title",
    salary: 80000,
    equity: 0.6,
    companyHandle: "c1",
  };

  test("ok for users", async function () {
    const resp = await request(app).post("/jobs").send(newJob).set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        ...newJob,
        id: expect.any(Number),
      },
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "title",
        salary: 80000,
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        ...newJob,
        salary: "50000",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("user not admin", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        ...newJob,
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(401);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs: [
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
      ],
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app).get("/jobs").set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });

  describe("with filtering", function () {
    test("name", async function () {
      const resp = await request(app).get("/jobs").send({ title: "j2" });
      expect(resp.body).toEqual({
        jobs: [
          {
            id: expect.any(Number),
            companyHandle: "c1",
            equity: 0.8,
            salary: 40000,
            title: "j2",
          },
        ],
      });
    });
    test("salary", async function () {
      const resp = await request(app).get("/jobs").send({ minSalary: 50000 });
      expect(resp.body).toEqual({
        jobs: [
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
        ],
      });
    });

    test("salary and equity", async function () {
      const resp = await request(app).get("/jobs").send({ minSalary: 50000, hasEquity: true });
      expect(resp.body).toEqual({
        jobs: [
          {
            id: expect.any(Number),
            companyHandle: "c3",
            equity: 0.4,
            salary: 80000,
            title: "j4",
          },
        ],
      });
    });

    test("none found", async function () {
      const resp = await request(app).get("/jobs").send({ title: "d" });
      expect(resp.body).toEqual({
        jobs: [],
      });
    });
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:handle", function () {
  test("works for anon", async function () {
    const job1Id = await getJob1Id();
    const resp = await request(app).get(`/jobs/${job1Id}`);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        companyHandle: "c1",
        equity: 0,
        salary: 20000,
        title: "j1",
      },
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/1`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works for users", async function () {
    const job1Id = await getJob1Id();
    const resp = await request(app)
      .patch(`/jobs/${job1Id}`)
      .send({
        title: "J1-new",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        companyHandle: "c1",
        equity: 0,
        salary: 20000,
        title: "J1-new",
      },
    });
  });

  test("unauth for anon", async function () {
    const job1Id = await getJob1Id();
    const resp = await request(app).patch(`/jobs/${job1Id}`).send({
      name: "J1-new",
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
      .patch(`/jobs/1`)
      .send({
        title: "new nope",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on handle change attempt", async function () {
    const resp = await request(app)
      .patch(`/jobs/c1`)
      .send({
        title: "j1-new",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/jobs/c1`)
      .send({
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for users", async function () {
    const job1Id = await getJob1Id();
    const resp = await request(app).delete(`/jobs/${job1Id}`).set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({ deleted: expect.any(Number) });
  });

  test("unauth for anon", async function () {
    const job1Id = await getJob1Id();
    const resp = await request(app).delete(`/jobs/${job1Id}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app).delete(`/jobs/1`).set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});
