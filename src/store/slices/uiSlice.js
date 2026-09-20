import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isImportModalOpen: false,
  isIndiaMapModalOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setImportModalOpen(state, action) {
      state.isImportModalOpen = action.payload;
    },
    setIndiaMapModalOpen(state, action) {
      state.isIndiaMapModalOpen = action.payload;
    },
  },
});

export const { setImportModalOpen, setIndiaMapModalOpen } = uiSlice.actions;
export default uiSlice.reducer;
