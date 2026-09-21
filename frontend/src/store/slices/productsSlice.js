import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async Thunks
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (queryString = '', { rejectWithValue }) => {
    try {
      const url = queryString ? `/products?${queryString}` : '/products';
      const res = await api.get(url);
      if (res.success) {
        return {
          items: res.products || [],
          total: res.total || 0,
          pages: res.pages || 1,
          queryString
        };
      }
      return rejectWithValue('Failed to fetch products');
    } catch (err) {
      return rejectWithValue(err.message || 'Error fetching products');
    }
  }
);

export const fetchProductBySlug = createAsyncThunk(
  'products/fetchProductBySlug',
  async (slug, { rejectWithValue }) => {
    try {
      const res = await api.get(`/products/${slug}`);
      if (res.success) {
        return res.product;
      }
      return rejectWithValue('Product not found');
    } catch (err) {
      return rejectWithValue(err.message || 'Error fetching product details');
    }
  }
);
export const fetchFeaturedProducts = createAsyncThunk(
  'products/fetchFeaturedProducts',
  async (_, { getState, rejectWithValue }) => {
    const state = getState();
    // Skip the network call if we already have featured products cached.
    // This makes the thunk safe to dispatch multiple times without spamming
    // the API — important because Home.jsx dispatches it on mount.
    if (
      state.products.featuredProducts &&
      state.products.featuredProducts.length > 0
    ) {
      return state.products.featuredProducts;
    }
    try {
      const res = await api.get('/products/featured');
      if (res.success) {
        return res.products;
      }
      return rejectWithValue('Failed to fetch featured products');
    } catch (err) {
      return rejectWithValue(err.message || 'Error fetching featured products');
    }
  }
);
export const fetchRelatedProducts = createAsyncThunk(
  'products/fetchRelatedProducts',
  async (productId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/products/${productId}/related`);
      if (res.success) {
        return { productId, products: res.products };
      }
      return rejectWithValue('Failed to fetch related products');
    } catch (err) {
      return rejectWithValue(err.message || 'Error fetching related products');
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/deleteProduct',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/products/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to delete product');
    }
  }
);

export const updateProduct = createAsyncThunk(
  'products/updateProduct',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/products/${id}`, payload);
      if (res.success) {
        return res.product;
      }
      return rejectWithValue('Failed to update product');
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update product');
    }
  }
);

const initialState = {
  productsBySlug: {},
  featuredProducts: [],
  relatedProductsByProductId: {},
  productList: {
    items: [],
    total: 0,
    pages: 1,
    currentParams: null
  },
  loading: false,
  error: null
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearProductsError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchProducts
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.productList = {
          items: action.payload.items,
          total: action.payload.total,
          pages: action.payload.pages,
          currentParams: action.payload.queryString
        };
        // Populate productsBySlug cache for quick lookup
        action.payload.items.forEach((p) => {
          if (p && p.slug) {
            state.productsBySlug[p.slug] = p;
          }
        });
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchProductBySlug
      .addCase(fetchProductBySlug.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductBySlug.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload && action.payload.slug) {
          state.productsBySlug[action.payload.slug] = action.payload;
        }
      })
      .addCase(fetchProductBySlug.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchFeaturedProducts
      .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
        state.featuredProducts = action.payload || [];
        (action.payload || []).forEach((p) => {
          if (p && p.slug) {
            state.productsBySlug[p.slug] = p;
          }
        });
      })
      // fetchRelatedProducts
      .addCase(fetchRelatedProducts.fulfilled, (state, action) => {
        if (action.payload) {
          state.relatedProductsByProductId[action.payload.productId] =
            action.payload.products || [];
          (action.payload.products || []).forEach((p) => {
            if (p && p.slug) {
              state.productsBySlug[p.slug] = p;
            }
          });
        }
      })
      // deleteProduct
      .addCase(deleteProduct.fulfilled, (state, action) => {
        const deletedId = action.payload;
        state.productList.items = state.productList.items.filter(
          (p) => p._id !== deletedId
        );
        state.featuredProducts = state.featuredProducts.filter(
          (p) => p._id !== deletedId
        );
      })
      // updateProduct
      .addCase(updateProduct.fulfilled, (state, action) => {
        const updated = action.payload;
        if (updated) {
          if (updated.slug) {
            state.productsBySlug[updated.slug] = updated;
          }
          state.productList.items = state.productList.items.map((p) =>
            p._id === updated._id ? updated : p
          );
          state.featuredProducts = state.featuredProducts.map((p) =>
            p._id === updated._id ? updated : p
          );
        }
      });
  }
});

export const { clearProductsError } = productsSlice.actions;

// Selectors
export const selectProductsList = (state) => state.products.productList.items;
export const selectProductsTotal = (state) => state.products.productList.total;
export const selectProductsPages = (state) => state.products.productList.pages;
export const selectProductsCurrentParams = (state) =>
  state.products.productList.currentParams;
export const selectProductsLoading = (state) => state.products.loading;
export const selectProductsError = (state) => state.products.error;
export const selectFeaturedProducts = (state) => state.products.featuredProducts;
export const selectProductBySlug = (state, slug) =>
  state.products.productsBySlug[slug];
export const selectRelatedProducts = (state, productId) =>
  state.products.relatedProductsByProductId[productId];

export default productsSlice.reducer;
