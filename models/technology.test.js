"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Technology = require("./technology.js");
const { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll, getJob1Id } = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newTech = {
    name: "swift",
  };

  test("works", async function () {
    let tech = await Technology.create(newTech);
    expect(tech).toEqual(newTech);

    const result = await db.query(
      `SELECT name
        FROM technologies
        WHERE name = 'swift'`
    );
    expect(result.rows).toEqual([newTech]);
  });

  test("bad request if not lowercase", async function () {
    expect.assertions(1);
    try {
      await Technology.create({ name: "Python" });
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestError);
    }
  });

  test("bad request if duplicate", async function () {
    expect.assertions(1);
    try {
      await Technology.create(newTech);
      let tech = await Technology.create(newTech);
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestError);
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let techs = await Technology.findAll();
    expect(techs).toEqual([
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
    ]);
  });

  test("works: name filter", async function () {
    let techs = await Technology.findAll({ name: "java" });
    expect(techs).toEqual([
      {
        name: "javascript",
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let tech = await Technology.get("python");
    expect(tech).toEqual({
      name: "python",
    });
  });

  test("not found if no such technology", async function () {
    expect.assertions(1);
    try {
      await Technology.get("nope");
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });
});

describe("update", function () {
  test("works", async function () {
    let tech = await Technology.update("python", { name: "new_python" });
    expect(tech).toEqual({ name: "new_python" });

    const result = await db.query(
      `SELECT name
        FROM technologies
        WHERE name = 'swift'`
    );
    expect(result.rows).toEqual([]);
  });

  test("not found", async function () {
    expect.assertions(1);
    try {
      await Technology.remove("notFound");
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });
});

describe("remove", function () {
  test("works", async function () {
    let tech = await Technology.remove("python");
    expect(tech).toEqual({ name: "python" });

    const result = await db.query(
      `SELECT name
        FROM technologies
        WHERE name = 'swift'`
    );
    expect(result.rows).toEqual([]);
  });

  test("not found", async function () {
    expect.assertions(1);
    try {
      await Technology.remove("notFound");
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });
});
