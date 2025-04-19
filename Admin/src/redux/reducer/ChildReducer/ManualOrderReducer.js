import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  manual_order_reducer_data: [],
};

const ManualOrderReducer = createSlice({
  name: "ManualOrderReducer",
  initialState,
  reducers: {
    setManualOrderReducerData: (state, { type, payload }) => {
      
      return {
        ...state,
        manual_order_reducer_data: payload,
      };
    },
    addManualOrderReducerData: (state, { type, payload }) => {
      
      let existing_order_cart = [...state.manual_order_reducer_data];
      let new_row_id = existing_order_cart?.length ? existing_order_cart[existing_order_cart.length - 1].row_id + 1 : 1;

      return {
        ...state,
        manual_order_reducer_data: [...state?.manual_order_reducer_data, {...payload,row_id : new_row_id}],
      };
    },
    editManualOrderReducerData: (state, { type, payload }) => {
      return {
        ...state,
        manual_order_reducer_data: [...state.manual_order_reducer_data]?.map((obj) =>
          obj?.row_id === payload?.row_id ? payload : obj
        ),
      };
    },
  },
});

export const {
  setManualOrderReducerData,
  addManualOrderReducerData,
  editManualOrderReducerData,
} = ManualOrderReducer?.actions;

export default ManualOrderReducer?.reducer;
