"use strict";

/** Routes for technology. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureAdmin } = require("../middleware/auth");
const Technology = require("../models/technology");

const techNewSchema = require("../schemas/techNew.json");
const techUpdateSchema = require("../schemas/techUpdate.json");
const techFilteringSchema = require("../schemas/techFiltering.json");

const router = new express.Router();

/** POST / { technology } =>  { technology }
 *
 * technology should be { name }
 *
 * Returns { name }
 *
 * Authorization required: admin
 */

router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, techNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const tech = await Technology.create(req.body);
    return res.status(201).json({ technology: tech });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { technology: [ name }, ...] }
 *
 * Can filter on provided search filters:
 * - nameLike (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, techFilteringSchema);

    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const technologies = await Technology.findAll(req.body);
    return res.json({ technologies });
  } catch (err) {
    return next(err);
  }
});

/** GET /[name]  =>  { technology }
 *
 *  Technology is { name }
 *
 * Authorization required: none
 */

router.get("/:name", async function (req, res, next) {
  try {
    const technology = await Technology.get(req.params.name);
    return res.json({ technology });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[name] { fld1, fld2, ... } => { technology }
 *
 * Patches technology data.
 *
 * fields can be: { name }
 *
 * Returns { name }
 *
 * Authorization required: admin
 */

router.patch("/:handle", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, techUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map((e) => e.stack);
      throw new BadRequestError(errs);
    }

    const technology = await Technology.update(req.params.handle, req.body);
    return res.json({ technology });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[name]  =>  { deleted: name }
 *
 * Authorization: admin
 */

router.delete("/:name", ensureAdmin, async function (req, res, next) {
  try {
    await Technology.remove(req.params.name);
    return res.json({ deleted: req.params.name });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
