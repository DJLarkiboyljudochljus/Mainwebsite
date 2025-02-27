const router = require("express").Router();
const Equipment = require("../models/Equipment");

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    // Fetch the product from the database based on the given ID
    const product = await Equipment.findById(id);
    if (!product) {
      throw new Error("Product not found");
    }
    res.render("product", { product, title: product.name });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
