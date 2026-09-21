import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './slices/cartSlice';
import categoriesReducer from './slices/categoriesSlice';
import authReducer from './slices/authSlice';
import productsReducer from './slices/productsSlice';

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    categories: categoriesReducer,
    auth: authReducer,
    products: productsReducer
  }
});

export default store;
