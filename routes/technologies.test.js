"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll, u1Token, u2Token } = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /technology */

describe("POST /technology", function () {
  const newTech = {
    name: "git",
  };

  test("ok for users", async function () {
    const resp = await request(app)
      .post("/technology")
      .send(newTech)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      technology: newTech,
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/technology")
      .send({
        numEmployees: 10,
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("user not admin", async function () {
    const resp = await request(app)
      .post("/technology")
      .send({
        ...newTech,
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(401);
  });
});

/************************************** GET /technology */

describe("GET /technology", function () {
  test("ok for anon", async function () {
    const resp = await request(app)
      .get("/technology");
    expect(resp.body).toEqual({
      technologies: [
        {
          name: "angular",
        },
        {
          name: "javascript",
        },
        {
          name: "perl",
        },
        {
          name: "python",
        },
        {
          name: "react",
        },
      ],
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE technologies CASCADE");
    const resp = await request(app)
      .get("/technology")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });

  describe("with filtering", function () {
    test("name", async function () {
      const resp = await request(app)
        .get("/technology")
        .send({ name: "java" });
      expect(resp.body).toEqual({
        technologies: [
          {
            name: "javascript",
          },
        ],
      });
    });

    test("min over max", async function () {
      const resp = await request(app)
        .get("/technology")
        .send({ minEmployees: 3, maxEmployees: 2 });
      expect(resp.statusCode).toEqual(400);
    });

    test("none found", async function () {
      const resp = await request(app)
        .get("/technology")
        .send({ name: "d" });
      expect(resp.body).toEqual({
        technologies: [],
      });
    });
  });
});

/************************************** GET /technology/:name */

describe("GET /technology/:name", function () {
  test("works for anon", async function () {
    const resp = await request(app)
      .get(`/technology/javascript`);
    expect(resp.body).toEqual({
      technology: {
        name: "javascript",
      },
    });
  });

  test("not found for no such technology", async function () {
    const resp = await request(app)
      .get(`/technology/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /technology/:name */

describe("PATCH /technology/:name", function () {
  test("works for admins", async function () {
    const resp = await request(app)
      .patch(`/technology/python`)
      .send({
        name: "ruby",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      technology: {
        name: "ruby",
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .patch(`/technology/python`)
      .send({
      name: "ruby",
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such company", async function () {
    const resp = await request(app)
      .patch(`/technology/nope`)
      .send({
        name: "new nope",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/technology/javascript`)
      .send({
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /technology/:name */

describe("DELETE /technology/:handle", function () {
  test("works for admins", async function () {
    const resp = await request(app)
      .delete(`/technology/python`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({ deleted: "python" });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .delete(`/technology/python`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
      .delete(`/technology/nope`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});
