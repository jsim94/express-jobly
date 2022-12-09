"use strict";

const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require("../expressError");
const db = require("../db.js");
const User = require("./user.js");
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

/************************************** authenticate */

describe("authenticate", function () {
  test("works", async function () {
    const user = await User.authenticate("u1", "password1");
    expect(user).toEqual({
      username: "u1",
      firstName: "U1F",
      lastName: "U1L",
      email: "u1@email.com",
      isAdmin: false,
    });
  });

  test("unauth if no such user", async function () {
    expect.assertions(1);
    try {
      await User.authenticate("nope", "password");
    } catch (err) {
      expect(err).toBeInstanceOf(UnauthorizedError);
    }
  });

  test("unauth if wrong password", async function () {
    expect.assertions(1);
    try {
      await User.authenticate("c1", "wrong");
    } catch (err) {
      expect(err).toBeInstanceOf(UnauthorizedError);
    }
  });
});

/************************************** register */

describe("register", function () {
  const newUser = {
    username: "new",
    firstName: "Test",
    lastName: "Tester",
    email: "test@test.com",
    isAdmin: false,
  };

  test("works", async function () {
    let user = await User.register({
      ...newUser,
      password: "password",
    });
    expect(user).toEqual(newUser);
    const found = await db.query("SELECT * FROM users WHERE username = 'new'");
    expect(found.rows.length).toEqual(1);
    expect(found.rows[0].is_admin).toEqual(false);
    expect(found.rows[0].password.startsWith("$2b$")).toEqual(true);
  });

  test("works: adds admin", async function () {
    let user = await User.register({
      ...newUser,
      password: "password",
      isAdmin: true,
    });
    expect(user).toEqual({ ...newUser, isAdmin: true });
    const found = await db.query("SELECT * FROM users WHERE username = 'new'");
    expect(found.rows.length).toEqual(1);
    expect(found.rows[0].is_admin).toEqual(true);
    expect(found.rows[0].password.startsWith("$2b$")).toEqual(true);
  });

  test("bad request with dup data", async function () {
    expect.assertions(1);
    try {
      await User.register({
        ...newUser,
        password: "password",
      });
      await User.register({
        ...newUser,
        password: "password",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestError);
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works", async function () {
    const users = await User.findAll();
    expect(users).toEqual([
      {
        username: "u1",
        firstName: "U1F",
        lastName: "U1L",
        email: "u1@email.com",
        isAdmin: false,
      },
      {
        username: "u2",
        firstName: "U2F",
        lastName: "U2L",
        email: "u2@email.com",
        isAdmin: false,
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let user = await User.get("u1");
    expect(user).toEqual({
      username: "u1",
      firstName: "U1F",
      lastName: "U1L",
      email: "u1@email.com",
      isAdmin: false,
      jobs: [
        {
          jobId: expect.any(Number),
          appState: "applied",
        },
        {
          jobId: expect.any(Number),
          appState: "interested",
        },
      ],
    });
  });

  test("not found if no such user", async function () {
    expect.assertions(1);
    try {
      await User.get("nope");
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    firstName: "NewF",
    lastName: "NewF",
    email: "new@email.com",
    isAdmin: true,
  };

  test("works", async function () {
    let job = await User.update("u1", updateData);
    expect(job).toEqual({
      username: "u1",
      ...updateData,
    });
  });

  test("works: set password", async function () {
    let job = await User.update("u1", {
      password: "new",
    });
    expect(job).toEqual({
      username: "u1",
      firstName: "U1F",
      lastName: "U1L",
      email: "u1@email.com",
      isAdmin: false,
    });
    const found = await db.query("SELECT * FROM users WHERE username = 'u1'");
    expect(found.rows.length).toEqual(1);
    expect(found.rows[0].password.startsWith("$2b$")).toEqual(true);
  });

  test("not found if no such user", async function () {
    try {
      expect.assertions(1);
      await User.update("nope", {
        firstName: "test",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });

  test("bad request if no data", async function () {
    expect.assertions(1);
    try {
      await User.update("c1", {});
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestError);
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await User.remove("u1");
    const res = await db.query("SELECT * FROM users WHERE username='u1'");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such user", async function () {
    expect.assertions(1);
    try {
      await User.remove("nope");
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });
});

/************************************** apply */

describe("apply for job", function () {
  test("works", async function () {
    const jobId = await getJob1Id();
    const res = await User.applyForJob({ username: "u2", jobId: jobId }, "applied");
    expect(res).toEqual({ jobId });
  });

  test("not found if no such user", async function () {
    expect.assertions(1);
    const jobId = await getJob1Id();
    try {
      const res = await User.applyForJob({ username: "u0", jobId: jobId }, "applied");
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });

  test("not found if no such job", async function () {
    expect.assertions(1);
    try {
      const res = await User.applyForJob({ username: "u2", jobId: 1 }, "applied");
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
    }
  });

  test("bad request if duplicate application", async function () {
    expect.assertions(1);
    const jobId = await getJob1Id();
    try {
      await User.applyForJob({ username: "u1", jobId: jobId }, "applied");
      await User.applyForJob({ username: "u1", jobId: jobId }, "applied");
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestError);
    }
  });
});
