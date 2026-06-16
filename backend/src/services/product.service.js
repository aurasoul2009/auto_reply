const Product = require("../models/Product");
const { BRAND } = require("../config/brand");

async function ensureDefaultProducts() {
  for (const product of BRAND.products) {
    await Product.findOneAndUpdate(
      { name: product.name },
      {
        $setOnInsert: {
          name: product.name,
          description: product.description,
          isActive: true
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

async function getActiveProducts() {
  await ensureDefaultProducts();
  return Product.find({ isActive: true }).sort({ createdAt: 1, name: 1 }).lean();
}

function formatProductList(products) {
  const lines = products.map((product) => `- ${product.name}`);
  return [
    `Here are ${BRAND.name} essentials:`,
    "",
    ...lines,
    "",
    "Reply 3 for Skin Care Guidance, or 4 to Talk to Support."
  ].join("\n");
}

module.exports = { ensureDefaultProducts, getActiveProducts, formatProductList };
