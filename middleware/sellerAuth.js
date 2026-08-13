const { protect } = require("./auth");
const Seller = require("../models/Seller");

const sellerOnly = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const seller = await Seller.getApprovedByUser(req.user.id);

    if (!seller) {
      return res.status(403).json({ message: "Approved seller account required" });
    }

    req.seller = seller;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { protect, sellerOnly };
