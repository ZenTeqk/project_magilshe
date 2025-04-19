import { createSlice } from "@reduxjs/toolkit"

const initialState = {
    'user_name_data' : ""
}

const userNameReducer = createSlice({
    name : 'userNameReducer',
    initialState : initialState,
    reducers : {
        setUserName : (state, action) =>{
            return {
                ...state,
                user_name_data : action.payload
            }
        },
        addUserName : (state, action) =>{
            return {
                ...state,
                user_name_data : [...state.user_name_data, action.payload]
            }
        },
        editUserName : (state, action) =>{
            return {
                ...state,
                user_name_data : [...state.user_name_data].map(obj => obj.id === action.payload.id ? action.payload : obj)
            }
        },
       
    }
});


export const { setUserName, addUserName, editUserName, } = userNameReducer.actions;

export default userNameReducer.reducer;