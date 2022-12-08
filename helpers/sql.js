const { BadRequestError } = require("../expressError");

/** Generates a SQL "WHERE" string from passed 'where' clause strings
 *
 *  @param {array} paramStrings strings to add to WHERE statement
 *
 *  @returns {string} WHERE string to insert into sql query, or undefined
 *
 **/

function sqlForWhereString(paramStrings) {
  const whereKeys = Object.keys(paramStrings);
  let whereString;
  if (whereKeys.length > 0) {
    whereString = "WHERE ";

    whereKeys.forEach((key, idx) => {
      if (idx !== 0) {
        whereString += " AND ";
      }
      whereString += paramStrings[key];
    });
  }
  return whereString;
}

/** Generates a SQL "Set" string and array of values.
 *
 *  @param {object} dataToUpdate keys/values to update
 *
 *  @param {object} jsToSql javascript name keys and sql name values
 *
 *  returns object containing SQL SET string and array of values.
 *
 **/

function sqlForPartialUpdate(dataToUpdate, jsToSql = {}) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`);

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = {
  sqlForPartialUpdate,
  sqlForWhereString
};
