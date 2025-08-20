// backend/utils/catchAsync.js
// Wrapper for async functions to handle errors automatically
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;