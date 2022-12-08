/** Throws error if 'obj' has a key that is not in 'keys'.
 *    Useful when a function allows specific keys but not all are required.
 *
 * @param {object} obj object to check keys
 *
 * @param {Array<string>} keys array of allowed keys
 *
 * @throws Error - KeyError: key not allowed
 *
 * */
function checkAllowedKeys(obj, keys) {
  return Object.keys(obj).forEach((key) => {
    if (!keys.includes(key)) throw new Error(`KeyError: key "${key}" not allowed`);
  });
}
module.exports = { checkAllowedKeys };
