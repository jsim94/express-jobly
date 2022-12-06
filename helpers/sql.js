const { BadRequestError } = require("../expressError");

/** Generates a SQL "Set" string and array of values.
 *
 *  dataToUpdate: Object of keys/values to update
 *
 *  jsToSql: object of javascript name keys and sql name values
 *
 *  returns: object containing SQL SET string and array of values.
 *
 **/

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`);

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
