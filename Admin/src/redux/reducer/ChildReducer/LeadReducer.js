import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  lead_reducer_data: [],
};

const LeadReducer = createSlice({
  name: "LeadReducer",
  initialState,
  reducers: {
    setLeadReducerData: (state, action) => {
      state.lead_reducer_data = action.payload;
    },
  },
});

export const { setLeadReducerData } = LeadReducer.actions;

export default LeadReducer.reducer;