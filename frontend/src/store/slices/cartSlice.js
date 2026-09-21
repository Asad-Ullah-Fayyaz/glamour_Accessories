import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Generate a unique ID for guest cart lines
const generateLineId = () =>
  `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const getEffectivePrice = (product) => {
  if (
    product?.isOnSale === true &&
    typeof product.salePrice === 'number' &&
    product.salePrice >= 0
  ) {
    return product.salePrice;
  }
  return Number(product?.price) || 0;
};

// Compute line total: (effective product price + lens price) * quantity
export const computeLineTotal = (product, quantity, customization) => {
  const lensPrice =
    customization && customization.lensOption
      ? Number(customization.lensOption.price) || 0
      : 0;
  return (getEffectivePrice(product) + lensPrice) * quantity;
};

// Check if two customization objects match identically
export const customizationsMatch = (a, b) => {
  const aDesc = (a && a.description) || '';
  const bDesc = (b && b.description) || '';
  const aImg = (a && a.prescriptionImage) || '';
  const bImg = (b && b.prescriptionImage) || '';

  const aLens = a && a.lensOption;
  const bLens = b && b.lensOption;
  const lensMatch = (() => {
    if (!aLens && !bLens) return true;
    if (!aLens || !bLens) return false;
    return (
      (aLens.name || '') === (bLens.name || '') &&
      (aLens.description || '') === (bLens.description || '') &&
      Number(aLens.price || 0) === Number(bLens.price || 0)
    );
  })();

  return aDesc === bDesc && aImg === bImg && lensMatch;
};

const calculateCartTotals = (items) => {
  const itemCount = items.reduce((acc, i) => acc + (i.quantity || 0), 0);
  const subtotal = items.reduce(
    (acc, i) =>
      acc +
      computeLineTotal(
        i.product,
        i.quantity || 0,
        i.customization
      ),
    0
  );
  return { itemCount, subtotal };
};

// Async Thunks
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/cart');
      if (res.success) {
        return res.cart;
      }
      return rejectWithValue('Failed to fetch cart');
    } catch (err) {
      return rejectWithValue(err.message || 'Error fetching cart');
    }
  }
);

export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async (
    { product, quantity = 1, customization = undefined },
    { getState, rejectWithValue, dispatch }
  ) => {
    const state = getState();
    const isAuthenticated = !!state.auth?.user;
    const finalCustomization = product.isCustomizable ? customization : undefined;

    if (isAuthenticated) {
      try {
        const body = { productId: product._id, quantity };
        if (finalCustomization) body.customization = finalCustomization;
        const res = await api.post('/cart/add', body);
        if (res.success) {
          dispatch(cartSlice.actions.setIsCartOpen(true));
          return res.cart;
        }
        return rejectWithValue('Failed to add item to server cart');
      } catch (err) {
        return rejectWithValue(err.message || 'Error adding item to cart');
      }
    } else {
      // Guest local cart update
      const currentItems = [...state.cart.cart.items];
      const existingIdx = currentItems.findIndex(
        (i) =>
          i.product._id === product._id &&
          customizationsMatch(i.customization, finalCustomization)
      );

      let updatedItems;
      if (existingIdx > -1) {
        const newQty = currentItems[existingIdx].quantity + quantity;
        updatedItems = currentItems.map((item, idx) => {
          if (idx === existingIdx) {
            return {
              ...item,
              quantity: newQty,
              itemTotal: computeLineTotal(
                item.product,
                newQty,
                item.customization
              )
            };
          }
          return item;
        });
      } else {
        const newItem = {
          lineId: generateLineId(),
          product,
          quantity,
          itemTotal: computeLineTotal(product, quantity, finalCustomization)
        };
        if (finalCustomization) newItem.customization = finalCustomization;
        updatedItems = [...currentItems, newItem];
      }

      const { itemCount, subtotal } = calculateCartTotals(updatedItems);
      dispatch(cartSlice.actions.setIsCartOpen(true));
      return { items: updatedItems, itemCount, subtotal };
    }
  }
);

export const updateQuantity = createAsyncThunk(
  'cart/updateQuantity',
  async ({ lineId, quantity }, { getState, rejectWithValue }) => {
    if (!lineId) return rejectWithValue('Missing lineId');
    const state = getState();
    const isAuthenticated = !!state.auth?.user;

    if (isAuthenticated) {
      try {
        const res = await api.put('/cart/update', { lineId, quantity });
        if (res.success) {
          return res.cart;
        }
        return rejectWithValue('Failed to update quantity');
      } catch (err) {
        return rejectWithValue(err.message || 'Error updating quantity');
      }
    } else {
      const currentItems = state.cart.cart.items
        .map((i) => {
          if (i.lineId === lineId) {
            return {
              ...i,
              quantity,
              itemTotal: computeLineTotal(i.product, quantity, i.customization)
            };
          }
          return i;
        })
        .filter((i) => i.quantity > 0);

      const { itemCount, subtotal } = calculateCartTotals(currentItems);
      return { items: currentItems, itemCount, subtotal };
    }
  }
);

export const removeFromCart = createAsyncThunk(
  'cart/removeFromCart',
  async ({ lineId, legacyProductId = null }, { getState, rejectWithValue }) => {
    const state = getState();
    const isAuthenticated = !!state.auth?.user;

    if (isAuthenticated) {
      try {
        const url = legacyProductId
          ? '/cart/item/legacy'
          : `/cart/item/${lineId}`;
        const config = legacyProductId
          ? { data: { productId: legacyProductId } }
          : {};
        const res = await api.delete(url, config);
        if (res.success) {
          return res.cart;
        }
        return rejectWithValue('Failed to remove item');
      } catch (err) {
        return rejectWithValue(err.message || 'Error removing item');
      }
    } else {
      const currentItems = lineId
        ? state.cart.cart.items.filter((i) => i.lineId !== lineId)
        : state.cart.cart.items.filter((i) => i.product._id !== legacyProductId);

      const { itemCount, subtotal } = calculateCartTotals(currentItems);
      return { items: currentItems, itemCount, subtotal };
    }
  }
);

export const clearCart = createAsyncThunk(
  'cart/clearCart',
  async (_, { getState, rejectWithValue }) => {
    const state = getState();
    const isAuthenticated = !!state.auth?.user;

    if (isAuthenticated) {
      try {
        await api.delete('/cart/clear');
      } catch (err) {
        // Silently handle error
      }
    }
    return { items: [], itemCount: 0, subtotal: 0 };
  }
);

export const initializeCart = createAsyncThunk(
  'cart/initializeCart',
  async (_, { getState, dispatch, rejectWithValue }) => {
    const state = getState();
    const isAuthenticated = !!state.auth?.user;

    if (isAuthenticated) {
      const currentGuestItems = state.cart.cart.items;
      if (currentGuestItems && currentGuestItems.length > 0) {
        try {
          await api.post('/cart/merge', {
            items: currentGuestItems.map((item) => {
              const entry = {
                productId: item.product._id,
                quantity: item.quantity
              };
              if (item.customization) entry.customization = item.customization;
              return entry;
            })
          });
        } catch (err) {
          // Merge error fallback
        }
      }
      const res = await dispatch(fetchCart());
      return res.payload;
    } else {
      return state.cart.cart;
    }
  }
);

const initialState = {
  cart: { items: [], itemCount: 0, subtotal: 0 },
  isCartOpen: false,
  loading: false,
  error: null
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setIsCartOpen: (state, action) => {
      state.isCartOpen = action.payload;
    },
    toggleCart: (state) => {
      state.isCartOpen = !state.isCartOpen;
    },
    resetCartState: (state) => {
      state.cart = { items: [], itemCount: 0, subtotal: 0 };
      state.isCartOpen = false;
      state.loading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchCart
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.cart = action.payload;
        }
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // addToCart
      .addCase(addToCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.cart = action.payload;
        }
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // updateQuantity
      .addCase(updateQuantity.fulfilled, (state, action) => {
        if (action.payload) {
          state.cart = action.payload;
        }
      })
      // removeFromCart
      .addCase(removeFromCart.fulfilled, (state, action) => {
        if (action.payload) {
          state.cart = action.payload;
        }
      })
      // clearCart
      .addCase(clearCart.fulfilled, (state, action) => {
        state.cart = action.payload;
      });
  }
});

export const { setIsCartOpen, toggleCart, resetCartState } = cartSlice.actions;

// Selectors
export const selectCart = (state) => state.cart.cart;
export const selectCartItems = (state) => state.cart.cart.items;
export const selectCartItemCount = (state) => state.cart.cart.itemCount;
export const selectCartSubtotal = (state) => state.cart.cart.subtotal;
export const selectIsCartOpen = (state) => state.cart.isCartOpen;
export const selectCartLoading = (state) => state.cart.loading;

export default cartSlice.reducer;
