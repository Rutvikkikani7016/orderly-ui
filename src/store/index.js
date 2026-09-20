import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import orderReducer from './slices/orderSlice.js';
import platformReducer from './slices/platformSlice.js';
import productReducer from './slices/productSlice.js';
import uiReducer from './slices/uiSlice.js';
import superAdminReducer from './slices/superAdminSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    orders: orderReducer,
    platforms: platformReducer,
    products: productReducer,
    ui: uiReducer,
    superAdmin: superAdminReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;
