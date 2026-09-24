import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Fetch the public category tree.
// Backend shape: categories: [{ _id, name, slug, level, parent, children: [...] }]
export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/categories');
      if (res.success) {
        return res.categories || [];
      }
      return rejectWithValue('Failed to fetch categories');
    } catch (err) {
      return rejectWithValue(err.message || 'Error fetching categories');
    }
  }
);

const initialState = {
  categories: [],
  loading: false,
  error: null,
  loaded: false
};

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    clearCategoriesError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
        state.loaded = true;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearCategoriesError } = categoriesSlice.actions;

// Full tree (roots only; children live under `.children`)
export const selectCategories = (state) => state.categories.categories;

export const selectCategoriesLoading = (state) => state.categories.loading;

export const selectCategoriesLoaded = (state) => state.categories.loaded;

export const selectCategoriesError = (state) => state.categories.error;

// Flatten the entire tree into a single array of every node.
export const selectFlatCategories = (state) => {
  const flat = [];
  const walk = (nodes) => {
    nodes.forEach((node) => {
      flat.push(node);
      if (Array.isArray(node.children) && node.children.length > 0) {
        walk(node.children);
      }
    });
  };
  walk(state.categories.categories);
  return flat;
};

// Find a category node by slug (any level).
export const selectCategoryBySlug = (state, slug) => {
  const flat = [];
  const walk = (nodes) => {
    nodes.forEach((node) => {
      flat.push(node);
      if (Array.isArray(node.children) && node.children.length > 0) {
        walk(node.children);
      }
    });
  };
  walk(state.categories.categories);
  return flat.find((category) => category.slug === slug) || null;
};

// Return the descendants (direct children) of a given parent _id.
export const selectChildrenOf = (state, parentId) => {
  const flat = [];
  const walk = (nodes) => {
    nodes.forEach((node) => {
      flat.push(node);
      if (Array.isArray(node.children) && node.children.length > 0) {
        walk(node.children);
      }
    });
  };
  walk(state.categories.categories);
  const parent = flat.find((category) => category._id === parentId);
  return parent?.children || [];
};

export default categoriesSlice.reducer;
