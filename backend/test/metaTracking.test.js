const test = require('node:test');
const assert = require('node:assert/strict');

const axios = require('axios');
const Order = require('../src/models/Order');
const MetaTrackingConsent = require('../src/models/MetaTrackingConsent');
const {
  buildPurchaseCustomData,
  sendCapiPurchaseEvent
} = require('../src/services/metaCapiService');

const trackingHelpersPromise = import('../../frontend/src/services/metaTracking.js');

const validOrder = () => ({
  orderId: 'ORD-2026-ABC123',
  totalAmount: 4850,
  customerEmail: 'customer@example.com',
  shippingAddress: {
    phone: '03001234567',
    fullName: 'Customer Name',
    city: 'Lahore'
  },
  items: [
    { product: 'product-1', price: 1000, quantity: 2 },
    {
      product: 'product-2',
      price: 1500,
      quantity: 1,
      customization: {
        description: 'Private prescription text',
        lensOption: { name: 'Premium', price: 350 }
      }
    }
  ]
});

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

function withOrderDispatchState(callback) {
  const originalFindOneAndUpdate = Order.findOneAndUpdate;
  const originalUpdateOne = Order.updateOne;
  const state = {
    metaPurchaseStatus: undefined,
    metaPurchaseAttempts: 0,
    metaPurchaseLockedAt: undefined,
    metaPurchaseClaimToken: undefined,
    metaPurchaseNextAttemptAt: undefined,
    metaPurchaseAcceptedAt: undefined
  };

  Order.findOneAndUpdate = async (_filter, update) => {
    const now = new Date();
    const claimable =
      !state.metaPurchaseStatus ||
      (state.metaPurchaseStatus === 'failed' &&
        state.metaPurchaseNextAttemptAt instanceof Date &&
        state.metaPurchaseNextAttemptAt <= now) ||
      (state.metaPurchaseStatus === 'processing' &&
        state.metaPurchaseLockedAt instanceof Date &&
        state.metaPurchaseLockedAt.getTime() <= now.getTime() - 45_000);
    if (!claimable || state.metaPurchaseAttempts >= 5) return null;

    Object.assign(state, update.$set);
    state.metaPurchaseAttempts += update.$inc.metaPurchaseAttempts;
    return { ...state };
  };

  Order.updateOne = async (_filter, update) => {
    Object.assign(state, update.$set);
    return { matchedCount: 1 };
  };

  return Promise.resolve()
    .then(() => callback(state))
    .finally(() => {
      Order.findOneAndUpdate = originalFindOneAndUpdate;
      Order.updateOne = originalUpdateOne;
    });
}

async function withMetaEnv(values, callback) {
  const names = ['META_ACCESS_TOKEN', 'META_DATASET_ID', 'META_PIXEL_ID'];
  const original = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const originalFindOne = MetaTrackingConsent.findOne;

  names.forEach((name) => {
    if (Object.prototype.hasOwnProperty.call(values, name)) {
      process.env[name] = values[name];
    } else {
      delete process.env[name];
    }
  });
  MetaTrackingConsent.findOne = () => ({
    select: async () => ({ status: 'granted' })
  });

  try {
    await callback();
  } finally {
    MetaTrackingConsent.findOne = originalFindOne;
    names.forEach((name) => {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    });
  }
}

test('browser purchase builder includes multiple items and lens charges with the order ID', async () => {
  const { buildBrowserPurchase } = await trackingHelpersPromise;
  const purchase = buildBrowserPurchase(validOrder());

  assert.deepEqual(purchase, {
    eventID: 'ORD-2026-ABC123',
    params: {
      value: 4850,
      currency: 'PKR',
      content_ids: ['product-1', 'product-2'],
      contents: [
        { id: 'product-1', quantity: 2, item_price: 1000 },
        { id: 'product-2', quantity: 1, item_price: 1850 }
      ],
      content_type: 'product',
      num_items: 3,
      order_id: 'ORD-2026-ABC123'
    }
  });
});

test('browser purchase builder rejects missing products and invalid or missing totals', async () => {
  const { buildBrowserPurchase } = await trackingHelpersPromise;

  assert.equal(
    buildBrowserPurchase({ ...validOrder(), totalAmount: undefined }),
    null
  );
  assert.equal(
    buildBrowserPurchase({ ...validOrder(), totalAmount: Number.NaN }),
    null
  );
  assert.equal(
    buildBrowserPurchase({
      ...validOrder(),
      items: [{ price: 100, quantity: 1 }]
    }),
    null
  );
  assert.equal(
    buildBrowserPurchase({
      ...validOrder(),
      items: [{ product: 'product-1', price: 100, quantity: null }]
    }),
    null
  );
});

test('CAPI Purchase custom data includes matching items and lens charges', () => {
  assert.deepEqual(buildPurchaseCustomData(validOrder()), {
    value: 4850,
    currency: 'PKR',
    content_ids: ['product-1', 'product-2'],
    contents: [
      { id: 'product-1', quantity: 2, item_price: 1000 },
      { id: 'product-2', quantity: 1, item_price: 1850 }
    ],
    content_type: 'product',
    num_items: 3,
    order_id: 'ORD-2026-ABC123'
  });
});

test('CAPI and browser purchase use the same event ID and payload order ID', async () => {
  const { buildBrowserPurchase } = await trackingHelpersPromise;
  const browserPurchase = buildBrowserPurchase(validOrder());
  const capiPurchase = buildPurchaseCustomData(validOrder());

  assert.equal(browserPurchase.eventID, capiPurchase.order_id);
});

test('CAPI custom data rejects missing or invalid order totals and item details', () => {
  assert.equal(
    buildPurchaseCustomData({ ...validOrder(), totalAmount: undefined }),
    null
  );
  assert.equal(
    buildPurchaseCustomData({ ...validOrder(), totalAmount: Number.NaN }),
    null
  );
  assert.equal(
    buildPurchaseCustomData({
      ...validOrder(),
      items: [{ price: 10, quantity: 1 }]
    }),
    null
  );
  assert.equal(
    buildPurchaseCustomData({
      ...validOrder(),
      items: [{ product: 'product-1', price: 10 }]
    }),
    null
  );
});

test('browser purchase claim prevents duplicate events across page refreshes', async () => {
  const { claimPurchaseEvent } = await trackingHelpersPromise;
  const storage = createMemoryStorage();

  assert.equal(claimPurchaseEvent('ORD-2026-ABC123', storage), true);
  assert.equal(claimPurchaseEvent('ORD-2026-ABC123', storage), false);
  assert.equal(claimPurchaseEvent('', storage), false);
});

test('Meta advertising consent is opt-in and storage failures fail closed', async () => {
  const {
    clearMetaTrackingConsent,
    hasMetaTrackingConsent,
    saveMetaTrackingConsent,
    setVerifiedMetaTrackingConsent
  } = await trackingHelpersPromise;
  const storage = createMemoryStorage();

  assert.equal(hasMetaTrackingConsent(storage), false);
  assert.equal(saveMetaTrackingConsent('denied', storage), true);
  assert.equal(hasMetaTrackingConsent(storage), false);
  assert.equal(saveMetaTrackingConsent('granted', storage), true);
  assert.equal(hasMetaTrackingConsent(storage), false);
  setVerifiedMetaTrackingConsent('granted');
  assert.equal(hasMetaTrackingConsent(storage), true);
  assert.equal(clearMetaTrackingConsent(storage), true);
  assert.equal(hasMetaTrackingConsent(storage), false);
  assert.equal(
    saveMetaTrackingConsent('granted', {
      setItem() {
        throw new Error('storage unavailable');
      }
    }),
    false
  );
});

test('a client-provided consent boolean cannot authorize a CAPI event', async () => {
  const originalPost = axios.post;
  let requests = 0;
  axios.post = async () => {
    requests += 1;
    return { status: 200, data: { events_received: 1 } };
  };

  try {
    await withMetaEnv(
      { META_ACCESS_TOKEN: 'test-token', META_DATASET_ID: '1234567890' },
      () => sendCapiPurchaseEvent({
        order: validOrder(),
        req: { headers: {} },
        consent: true
      })
    );
    assert.equal(requests, 0);
  } finally {
    axios.post = originalPost;
  }
});

test('PageView tracking excludes admin routes', async () => {
  const { shouldTrackPageView } = await trackingHelpersPromise;
  assert.equal(shouldTrackPageView('/'), true);
  assert.equal(shouldTrackPageView('/products/watch'), true);
  assert.equal(shouldTrackPageView('/admin'), false);
  assert.equal(shouldTrackPageView('/admin/orders'), false);
});

test('ViewContent uses a valid sale price and falls back to regular price', async () => {
  const { getProductTrackingPrice } = await trackingHelpersPromise;

  assert.equal(
    getProductTrackingPrice({
      price: 1000,
      isOnSale: true,
      salePrice: 750
    }),
    750
  );
  assert.equal(
    getProductTrackingPrice({
      price: 1000,
      isOnSale: true,
      salePrice: null
    }),
    1000
  );
  assert.equal(
    getProductTrackingPrice({
      price: 1000,
      isOnSale: true,
      salePrice: 1000
    }),
    1000
  );
  assert.equal(getProductTrackingPrice({ price: 'invalid' }), null);
});

test('CAPI does not send an event without explicit advertising consent', async () => {
  const originalPost = axios.post;
  let requests = 0;
  axios.post = async () => {
    requests += 1;
    return { status: 200, data: { events_received: 1 } };
  };

  try {
    await withMetaEnv(
      { META_ACCESS_TOKEN: 'test-token', META_DATASET_ID: '1234567890' },
      async () =>
        sendCapiPurchaseEvent({
          order: validOrder(),
          req: { headers: {} },
          consentToken: 'invalid'
        })
    );
    assert.equal(requests, 0);
  } finally {
    axios.post = originalPost;
  }
});

test('CAPI requires an explicit Dataset ID and sends no event when missing', async () => {
  const originalPost = axios.post;
  let requests = 0;
  axios.post = async () => {
    requests += 1;
    return { status: 200, data: { events_received: 1 } };
  };

  try {
    await withMetaEnv({ META_ACCESS_TOKEN: 'test-token' },     async () =>
      sendCapiPurchaseEvent({
        order: validOrder(),
        req: { headers: {} },
        consentToken: 'a'.repeat(64)
      }));
    assert.equal(requests, 0);
  } finally {
    axios.post = originalPost;
  }
});

test('a server-recorded rejection blocks CAPI even with a valid consent token', async () => {
  const originalPost = axios.post;
  const originalFindOne = MetaTrackingConsent.findOne;
  let requests = 0;
  axios.post = async () => {
    requests += 1;
    return { status: 200, data: { events_received: 1 } };
  };
  MetaTrackingConsent.findOne = () => ({
    select: async () => ({ status: 'denied' })
  });

  try {
    await withMetaEnv(
      { META_ACCESS_TOKEN: 'test-token', META_DATASET_ID: '1234567890' },
      () => sendCapiPurchaseEvent({
        order: validOrder(),
        req: { headers: {} },
        consentToken: 'a'.repeat(64)
      })
    );
    assert.equal(requests, 0);
  } finally {
    MetaTrackingConsent.findOne = originalFindOne;
    axios.post = originalPost;
  }
});

test('CAPI sends minimized, verified Purchase data without prescription details', async () => {
  const originalPost = axios.post;
  let requestUrl;
  let requestPayload;
  axios.post = async (url, payload) => {
    requestUrl = url;
    requestPayload = payload;
    return { status: 200, data: { events_received: 1 } };
  };

  try {
    await withMetaEnv(
      {
        META_ACCESS_TOKEN: 'test-token',
        META_DATASET_ID: '1234567890'
      },
      () =>
        withOrderDispatchState(() =>
          sendCapiPurchaseEvent({
            order: validOrder(),
            req: {
              ip: '8.8.8.8',
              headers: { 'user-agent': 'test-agent' }
            },
            fbp: 'fb.1.test',
            fbc: 'fb.1.click',
            consentToken: 'a'.repeat(64)
          })
        )
    );

    const event = requestPayload.data[0];
    assert.match(requestUrl, /\/1234567890\/events\?/);
    assert.equal(event.event_name, 'Purchase');
    assert.equal(event.event_id, 'ORD-2026-ABC123');
    assert.equal(event.action_source, 'website');
    assert.equal(Number.isInteger(event.event_time), true);
    assert.deepEqual(event.custom_data, buildPurchaseCustomData(validOrder()));
    assert.equal(event.user_data.em.length, 1);
    assert.equal(event.user_data.ph.length, 1);
    assert.equal(event.user_data.fbp, 'fb.1.test');
    assert.equal(event.user_data.fbc, 'fb.1.click');
    assert.equal(JSON.stringify(event).includes('Private prescription text'), false);
    assert.equal(JSON.stringify(event).includes('private-prescription-url'), false);
    assert.equal(JSON.stringify(event).includes('Customer Name'), false);
  } finally {
    axios.post = originalPost;
  }
});

test('CAPI dispatch skips repeated attempts after Meta confirms acceptance', async () => {
  const originalPost = axios.post;
  let requests = 0;
  axios.post = async () => {
    requests += 1;
    return { status: 200, data: { events_received: 1 } };
  };

  try {
    await withMetaEnv(
      {
        META_ACCESS_TOKEN: 'test-token',
        META_DATASET_ID: '1234567890'
      },
      () =>
        withOrderDispatchState(async (state) => {
          await sendCapiPurchaseEvent({
            order: validOrder(),
            req: { headers: {} },
            consentToken: 'a'.repeat(64)
          });
          await sendCapiPurchaseEvent({
            order: validOrder(),
            req: { headers: {} },
            consentToken: 'a'.repeat(64)
          });

          assert.equal(requests, 1);
          assert.equal(state.metaPurchaseStatus, 'succeeded');
          assert.equal(state.metaPurchaseAttempts, 1);
          assert.ok(state.metaPurchaseAcceptedAt instanceof Date);
        })
    );
  } finally {
    axios.post = originalPost;
  }
});

test('concurrent CAPI dispatch attempts atomically allow only one sender', async () => {
  const originalPost = axios.post;
  let requests = 0;
  axios.post = async () => {
    requests += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { status: 200, data: { events_received: 1 } };
  };

  try {
    await withMetaEnv(
      {
        META_ACCESS_TOKEN: 'test-token',
        META_DATASET_ID: '1234567890'
      },
      () =>
        withOrderDispatchState(async (state) => {
          await Promise.all([
            sendCapiPurchaseEvent({
              order: validOrder(),
              req: { headers: {} },
              consentToken: 'a'.repeat(64)
            }),
            sendCapiPurchaseEvent({
              order: validOrder(),
              req: { headers: {} },
              consentToken: 'a'.repeat(64)
            })
          ]);

          assert.equal(requests, 1);
          assert.equal(state.metaPurchaseStatus, 'succeeded');
          assert.equal(state.metaPurchaseAttempts, 1);
        })
    );
  } finally {
    axios.post = originalPost;
  }
});

test('CAPI retries a transient timeout with the stable order event ID', async () => {
  const originalPost = axios.post;
  let requests = 0;
  const eventIds = [];
  axios.post = async (_url, payload) => {
    requests += 1;
    eventIds.push(payload.data[0].event_id);
    if (requests === 1) {
      const error = new Error('test timeout');
      error.code = 'ECONNABORTED';
      throw error;
    }
    return { status: 200, data: { events_received: 1 } };
  };

  try {
    await withMetaEnv(
      {
        META_ACCESS_TOKEN: 'test-token',
        META_DATASET_ID: '1234567890'
      },
      () =>
        withOrderDispatchState(async (state) => {
          await sendCapiPurchaseEvent({
            order: validOrder(),
            req: { headers: {} },
            consentToken: 'a'.repeat(64)
          });

          assert.equal(requests, 2);
          assert.deepEqual(eventIds, [
            'ORD-2026-ABC123',
            'ORD-2026-ABC123'
          ]);
          assert.equal(state.metaPurchaseStatus, 'succeeded');
          assert.equal(state.metaPurchaseAttempts, 2);
        })
    );
  } finally {
    axios.post = originalPost;
  }
});

test('CAPI leaves exhausted unconfirmed Meta responses failed, not successful', async () => {
  const originalPost = axios.post;
  axios.post = async () => ({
    status: 200,
    data: { events_received: 0 }
  });

  try {
    await withMetaEnv(
      {
        META_ACCESS_TOKEN: 'test-token',
        META_DATASET_ID: '1234567890'
      },
      () =>
        withOrderDispatchState(async (state) => {
          await sendCapiPurchaseEvent({
            order: validOrder(),
            req: { headers: {} },
            consentToken: 'a'.repeat(64)
          });

          assert.equal(state.metaPurchaseStatus, 'failed');
          assert.equal(state.metaPurchaseAcceptedAt, undefined);
          assert.equal(state.metaPurchaseAttempts, 5);
          assert.equal(state.metaPurchaseNextAttemptAt, null);
        })
    );
  } finally {
    axios.post = originalPost;
  }
});
