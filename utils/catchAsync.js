/**
 * Wraps an async route handler and forwards any thrown error to next().
 * Eliminates try/catch boilerplate in every controller.
 *
 * @example
 *   exports.getAll = catchAsync(async (req, res) => { ... });
 */
const catchAsync = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = catchAsync;
