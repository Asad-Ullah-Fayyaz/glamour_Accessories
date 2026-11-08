const test = require('node:test');
const assert = require('node:assert/strict');

const Order = require('../src/models/Order');
const {
  getOrderByOrderId,
  normalizePakistaniPhone,
  trackOrderPublic
} = require('../src/controllers/orderController');

const verifiedOrder = () => ({
  orderId: 'ORDER-1',
  customer: null,
  customerEmail: 'customer@example.com',
  shippingAddress: {
    phone: '03001234567',
    city: 'Lahore',
    fullName: 'Customer Name',
    street: 'Private street'
  },
  status: 'Pending',
  totalAmount: 2850,
  paymentMethod: 'COD',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  courierInfo: { carrier: 'Courier', trackingId: 'TRACK-1' },
  items: [
    {
      product: 'product-1',
      name: 'Product name',
      price: 1200,
      quantity: 2,
      customization: {
        description: 'Private prescription text',
        prescriptionImage: 'private-prescription-url',
        lensOption: { name: 'Premium lens', price: 225 }
      }
    }
  ]
});

const invoke = async (handler, { body = {}, params = {}, user = null } = {}) => {
  let status = 200;
  let responseBody;
  let nextError;

  const req = { body, params, user };
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

const withOrderLookup = async (order, callback) => {
  const originalFindOne = Order.findOne;
  Order.findOne = async () => order;
  try {
    return await callback();
  } finally {
    Order.findOne = originalFindOne;
  }
};

test('phone normalization accepts exact local and international Pakistani formats', () => {
  assert.equal(normalizePakistaniPhone('0300-123-4567'), '03001234567');
  assert.equal(normalizePakistaniPhone('+92 300 1234567'), '03001234567');
  assert.equal(normalizePakistaniPhone('0092 300 1234567'), '03001234567');
  assert.equal(normalizePakistaniPhone('1234567'), '');
  assert.equal(normalizePakistaniPhone('not a phone'), '');
});

test('public order tracking rejects missing or invalid order IDs and missing contact', async () => {
  await withOrderLookup(verifiedOrder(), async () => {
    for (const body of [
      { orderId: '' , emailOrPhone: '03001234567' },
      { orderId: null, emailOrPhone: '03001234567' },
      { orderId: 'ORDER-1' },
      { orderId: 'ORDER-1', emailOrPhone: '   ' }
    ]) {
      const response = await invoke(trackOrderPublic, { body });
      assert.equal(response.status, 400);
      assert.equal(response.body.success, false);
    }
  });
});

test('public order tracking verifies exact normalized phone and returns minimal Purchase data', async () => {
  await withOrderLookup(verifiedOrder(), async () => {
    const response = await invoke(trackOrderPublic, {
      body: {
        orderId: 'ORDER-1',
        emailOrPhone: '+92 300 1234567'
      }
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.tracking.orderId, 'ORDER-1');
    assert.equal(response.body.tracking.totalAmount, 2850);
    assert.deepEqual(response.body.tracking.items, [
      {
        product: 'product-1',
        price: 1200,
        quantity: 2,
        customization: { lensOption: { price: 225 } }
      }
    ]);
    assert.equal(JSON.stringify(response.body).includes('Private prescription text'), false);
    assert.equal(JSON.stringify(response.body).includes('private-prescription-url'), false);
    assert.equal(JSON.stringify(response.body).includes('customer@example.com'), false);
    assert.equal(JSON.stringify(response.body).includes('Private street'), false);
  });
});

test('public order tracking verifies exact normalized email', async () => {
  await withOrderLookup(verifiedOrder(), async () => {
    const response = await invoke(trackOrderPublic, {
      body: {
        orderId: 'ORDER-1',
        emailOrPhone: ' Customer@Example.com '
      }
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.tracking.orderId, 'ORDER-1');
  });
});

test('public order tracking rejects partial phone and incorrect email matches', async () => {
  await withOrderLookup(verifiedOrder(), async () => {
    for (const emailOrPhone of ['991234567', 'wrong@example.com']) {
      const response = await invoke(trackOrderPublic, {
        body: { orderId: 'ORDER-1', emailOrPhone }
      });

      assert.equal(response.status, 400);
      assert.equal(response.body.success, false);
      assert.equal(response.body.tracking, undefined);
    }
  });
});

test('public order tracking returns 404 for an unknown order', async () => {
  await withOrderLookup(null, async () => {
    const response = await invoke(trackOrderPublic, {
      body: { orderId: 'ORDER-404', emailOrPhone: '03001234567' }
    });
    assert.equal(response.status, 404);
    assert.equal(response.body.tracking, undefined);
  });
});

test('authenticated order lookup denies unrelated users access to guest and customer orders', async () => {
  for (const order of [
    verifiedOrder(),
    { ...verifiedOrder(), customer: { toString: () => 'customer-1' } }
  ]) {
    await withOrderLookup(order, async () => {
      const response = await invoke(getOrderByOrderId, {
        params: { orderId: 'ORDER-1' },
        user: { _id: 'customer-2', role: 'customer' }
      });
      assert.equal(response.status, 403);
      assert.deepEqual(response.body, { success: false, message: 'Forbidden' });
    });
  }
});

test('authenticated order lookup allows the owner and administrators', async () => {
  const customerOrder = {
    ...verifiedOrder(),
    customer: { toString: () => 'customer-1' }
  };

  await withOrderLookup(customerOrder, async () => {
    const ownerResponse = await invoke(getOrderByOrderId, {
      params: { orderId: 'ORDER-1' },
      user: { _id: 'customer-1', role: 'customer' }
    });
    assert.equal(ownerResponse.status, 200);
    assert.equal(ownerResponse.body.order.orderId, 'ORDER-1');
  });

  await withOrderLookup(verifiedOrder(), async () => {
    const adminResponse = await invoke(getOrderByOrderId, {
      params: { orderId: 'ORDER-1' },
      user: { _id: 'admin-1', role: 'admin' }
    });
    assert.equal(adminResponse.status, 200);
  });
});

test('authenticated order lookup returns 404 for missing order', async () => {
  await withOrderLookup(null, async () => {
    const response = await invoke(getOrderByOrderId, {
      params: { orderId: 'ORDER-404' },
      user: { _id: 'customer-1', role: 'customer' }
    });
    assert.equal(response.status, 404);
  });
});
