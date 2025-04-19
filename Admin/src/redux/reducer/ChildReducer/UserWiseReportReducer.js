import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user_wise_report_reducer_data: [],
};

const UserWiseReportReducer = createSlice({
  name: "UserWiseReportReducer",
  initialState,
  reducers: {
    setUserWiseReportReducerData: (state, { type, payload }) => {
      return {
        ...state,
        user_wise_report_reducer_data: payload,
      };
    },
    addUserWiseReportReducerData: (state, { type, payload }) => {
      
      return {
        ...state,
        user_wise_report_reducer_data: [
          ...state?.user_wise_report_reducer_data,
          payload,
        ],
      };
    },
    editUserWiseReportReducerData: (state, { type, payload }) => {
      
      return {
        ...state,
        user_wise_report_reducer_data: [...state.user_wise_report_reducer_data]?.map(
          (obj) => (obj?.id === payload?.id ? payload : obj)
        ),
      };
    },
  },
});

export const {
  setUserWiseReportReducerData,
  addUserWiseReportReducerData,
  editUserWiseReportReducerData,
} = UserWiseReportReducer?.actions;

export default UserWiseReportReducer?.reducer;
