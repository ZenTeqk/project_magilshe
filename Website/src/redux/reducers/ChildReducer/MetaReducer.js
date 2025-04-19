import { createSlice } from "@reduxjs/toolkit";

const MetaReducer = createSlice({
    name: "meta",
    initialState: {
        title: "Default Title",
        description: "Default description",
        keywords: "default, meta, tags"
    },
    reducers: {
        setMeta: (state, action) => {
            return {
                ...state,
                ...action.payload
            };
        }
    }
});

export const { setMeta } = MetaReducer.actions;
export default MetaReducer.reducer;
