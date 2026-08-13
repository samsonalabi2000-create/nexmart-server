const Seller = require("../models/Seller");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

exports.getApplications = catchAsync(async (req, res) => {
  res.json(await Seller.getApplications(req.query));
});

exports.approve = catchAsync(async (req, res) => {
  const result = await Seller.getApplications({ status: "all", page: 1, limit: 1000 });
  const application = result.applications.find((item) => item.id === req.params.id);

  if (!application) throw new AppError("Seller application not found.", 404);
  if (application.status === "approved") {
    res.json({ message: "Application already approved." });
    return;
  }

  const profile = await Seller.createApprovedProfile(application, req.user.id);
  res.json({ message: "Seller approved.", profile });
});

exports.reject = catchAsync(async (req, res) => {
  const application = await Seller.rejectApplication(
    req.params.id,
    req.user.id,
    req.body.reason
  );

  if (!application) throw new AppError("Seller application not found.", 404);

  res.json({ message: "Seller application rejected.", application });
});
