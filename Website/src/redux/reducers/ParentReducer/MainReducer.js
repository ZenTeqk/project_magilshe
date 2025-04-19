import { combineReducers } from "redux";
import ProductReducer from "../ChildReducer/ProductReducer";
import userNameReducer from "../ChildReducer/userNameReducer"

export const MainReducer = combineReducers({
    ProductReducer : ProductReducer,
    userNameReducer : userNameReducer
})