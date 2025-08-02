// import { Route, Routes } from "react-router-dom";
// import AppLayout from "./layout/AppLayout";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.scss";
import Index from "./routes";
import { useContext, useEffect, useRef } from "react";
import { DataContext } from "./context/DataContext";
import { ToastAlert } from "./component/common/ToastAlert";
import axios from "axios";
import { useLocation } from "react-router";
import { useDispatch } from "react-redux";
import { setMeta } from "./redux/reducers/ChildReducer/MetaReducer";

function App() {
  const location = useLocation();
  const dispatch = useDispatch();

  const { isPreloaderShow } = useContext(DataContext);

  return (
    <main className="app_container">
      <ToastAlert />
      <Index />
      {isPreloaderShow && (
        <div className="preloader-container">
          <img src={require("./assets/loader/loader-1.gif")} />
        </div>
      )}
    </main>
  );
}

export default App;
