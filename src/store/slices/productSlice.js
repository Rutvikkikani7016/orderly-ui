import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getProducts,
  createProduct as createProductApi,
  updateProduct as updateProductApi,
  deleteProduct as deleteProductApi,
} from '../../api/products.js';

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (customParams = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState().products;
      const params = {
        page: customParams.page || state.pagination.page,
        limit: customParams.limit || state.pagination.limit,
        search: customParams.search !== undefined ? customParams.search : state.filters.search,
      };
      const data = await getProducts(params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch products');
    }
  }
);

export const addProduct = createAsyncThunk(
  'products/addProduct',
  async (productData, { dispatch, rejectWithValue }) => {
    try {
      const data = await createProductApi(productData);
      dispatch(fetchProducts({ page: 1 }));
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create product');
    }
  }
);

export const editProduct = createAsyncThunk(
  'products/editProduct',
  async ({ id, productData }, { dispatch, rejectWithValue }) => {
    try {
      const data = await updateProductApi(id, productData);
      dispatch(fetchProducts());
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update product');
    }
  }
);

export const removeProduct = createAsyncThunk(
  'products/removeProduct',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const data = await deleteProductApi(id);
      dispatch(fetchProducts());
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete product');
    }
  }
);

const initialState = {
  products: [],
  selectedProduct: null,
  pagination: {
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  },
  filters: {
    search: '',
  },
  loading: false,
  error: null,
};

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setProductSearch(state, action) {
      state.filters.search = action.payload;
    },
    setProductPage(state, action) {
      state.pagination.page = action.payload;
    },
    setSelectedProduct(state, action) {
      state.selectedProduct = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload?.products || action.payload || [];
        if (action.payload?.pagination) {
          state.pagination = action.payload.pagination;
        }
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setProductSearch, setProductPage, setSelectedProduct } = productSlice.actions;
export default productSlice.reducer;
