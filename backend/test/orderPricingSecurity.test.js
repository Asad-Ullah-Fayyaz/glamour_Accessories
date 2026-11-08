const test = require('node:test');
const assert = require('node:assert/strict');

const Cart = require('../src/models/Cart');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const SiteContent = require('../src/models/SiteContent');
const { createOrder } = require('../src/controllers/orderController');

const configuredLensOptions = [
  { name: 'Premium lens', description: 'Configured lens', price: 250 }
];

const validRequest = (overrides = {}) => ({
  items: [
    {
      productId: 'product-1',
      quantity: 2,
      customization: {
        description: 'Prescription',
        lensOption: {
          name: 'Premium lens',
          description: 'Client description is not trusted',
          price: 250
        }
      }
    }
  ],
  shippingAddress: {
    fullName: 'Customer',
    phone: '03001234567',
    street: 'Main Road',
    city: 'Lahore'
  },
  ...overrides
});

const invoke = async (handler, body) => {
  let status = 200;
  let responseBody;
  let nextError;
  const req = { body, user: null, headers: {} };
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(payload) {
      responseBody = payload;
      return this;
    }
  };

  await handler(req, res, (error) => {
    nextError = error;
  });
  if (nextError) throw nextError;
  return { status, body: responseBody };
};

const withOrderMocks = async ({ product, lensOptions = configuredLensOptions }, callback) => {
  const originals = {
    cartFindOneAndUpdate: Cart.findOneAndUpdate,
    orderCreate: Order.create,
    productFindById: Product.findById,
    productFindByIdAndUpdate: Product.findByIdAndUpdate,
    productFindOneAndUpdate: Product.findOneAndUpdate,
    siteContentFindOne: SiteContent.findOne
  };
  const restoredStock = [];
  let createdOrder;

  SiteContent.findOne = async () => ({
    store: {
      codEnabled: true,
      codFee: 300,
      freeShippingThreshold: 5000,
      lensOptions
    }
  });
  Product.findOneAndUpdate = async () => product;
  Product.findById = async () => product;
  Product.findByIdAndUpdate = async (productId, update) => {
    restoredStock.push({ productId, quantity: update.$inc.stock });
  };
  Cart.findOneAndUpdate = async () => ({});
  Order.create = async (order) => {
    createdOrder = { ...order, orderId: 'ORDER-PRICED' };
    return createdOrder;
  };

  try {
    await callback({
      getCreatedOrder: () => createdOrder,
      restoredStock
    });
  } finally {
    Cart.findOneAndUpdate = originals.cartFindOneAndUpdate;
    Order.create = originals.orderCreate;
    Product.findById = originals.productFindById;
    Product.findByIdAndUpdate = originals.productFindByIdAndUpdate;
    Product.findOneAndUpdate = originals.productFindOneAndUpdate;
    SiteContent.findOne = originals.siteContentFindOne;
  }
};

test('order totals and lens snapshots use configured server prices, ignoring submitted totals', async () => {
  await withOrderMocks(
    {
      product: {
        _id: 'product-1',
        name: 'Eyeglasses',
        price: 2400,
        isOnSale: false,
        isCustomizable: true,
        stock: 10,
        images: []
      }
    },
    async ({ getCreatedOrder }) => {
      const response = await invoke(
        createOrder,
        validRequest({
          subtotal: 1,
          shippingCost: 0,
          totalAmount: 1
        })
      );

      assert.equal(response.status, 201);
      const order = getCreatedOrder();
      assert.equal(order.items[0].price, 2400);
      assert.deepEqual(order.items[0].customization.lensOption, {
        name: 'Premium lens',
        description: 'Configured lens',
        price: 250
      });
      assert.equal(order.subtotal, 5300);
      assert.equal(order.shippingCost, 0);
      assert.equal(order.totalAmount, 5300);
    }
  );
});

test('order creation rejects manipulated lens prices and invalid lens selections before reserving stock', async () => {
  await withOrderMocks(
    {
      product: {
        _id: 'product-1',
        name: 'Eyeglasses',
        price: 2400,
        isCustomizable: true,
        stock: 10,
        images: []
      }
    },
    async ({ restoredStock }) => {
      for (const lensOption of [
        { name: 'Premium lens', description: '', price: 9999 },
        { name: 'Unknown lens', description: '', price: 250 },
        { name: 'Premium lens', description: '', price: '250' }
      ]) {
        const response = await invoke(
          createOrder,
          validRequest({
            items: [
              {
                productId: 'product-1',
                quantity: 1,
                customization: { lensOption }
              }
            ]
          })
        );

        assert.equal(response.status, 400);
        assert.equal(response.body.success, false);
      }

      assert.deepEqual(restoredStock, []);
    }
  );
});

test('order creation rejects lens customization for non-customizable products and restores reserved stock', async () => {
  await withOrderMocks(
    {
      product: {
        _id: 'product-1',
        name: 'Standard glasses',
        price: 1200,
        isCustomizable: false,
        stock: 10,
        images: []
      }
    },
    async ({ restoredStock }) => {
      const response = await invoke(createOrder, validRequest());

      assert.equal(response.status, 400);
      assert.deepEqual(restoredStock, [
        { productId: 'product-1', quantity: 2 }
      ]);
    }
  );
});

test('prescription details without a configured lens selection are rejected', async () => {
  await withOrderMocks(
    {
      product: {
        _id: 'product-1',
        name: 'Eyeglasses',
        price: 2400,
        isCustomizable: true,
        stock: 10,
        images: []
      }
    },
    async ({ restoredStock }) => {
      const response = await invoke(
        createOrder,
        validRequest({
          items: [
            {
              productId: 'product-1',
              quantity: 1,
              customization: { description: 'Prescription' }
            }
          ]
        })
      );

      assert.equal(response.status, 400);
      assert.deepEqual(restoredStock, []);
    }
  );
});
